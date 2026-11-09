using System.Reflection;
using Microsoft.AspNetCore.Authorization;
using Microsoft.OpenApi.Models;
using Swashbuckle.AspNetCore.SwaggerGen;

namespace Backend.Api;

// Corpo de erro do contrato, só para o Swagger mostrar o formato ({ "error": { "code", "message" } }).
public sealed record ErroDetalhe(string Code, string Message);
public sealed record ErroSaida(ErroDetalhe Error);

// Documentação da API em /api/docs (Swagger UI) e /api/docs/v1/swagger.json.
// Fica ligada por padrão; para desligar, configure Swagger__Habilitado=false.
public static class Swagger
{
    const string Prefixo = "api/docs";

    public static bool Habilitado(IConfiguration config) => config.GetValue("Swagger:Habilitado", true);

    public static void Adicionar(IServiceCollection services)
    {
        services.AddEndpointsApiExplorer();
        services.AddSwaggerGen(o =>
        {
            o.SwaggerDoc("v1", new OpenApiInfo
            {
                Title = "API ZL Engenharia Solar",
                Version = "v1",
                Description = "Gestão de obras de energia solar. Contrato completo em docs/API/Contrato_API.md. "
                    + "Para testar rotas protegidas, faça login em POST /api/auth/login, clique em Authorize e cole o token.",
            });

            var xml = Path.Combine(AppContext.BaseDirectory, $"{Assembly.GetExecutingAssembly().GetName().Name}.xml");
            if (File.Exists(xml)) o.IncludeXmlComments(xml);

            o.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
            {
                Type = SecuritySchemeType.Http,
                Scheme = "bearer",
                BearerFormat = "JWT",
                Description = "Token retornado por POST /api/auth/login (sem o prefixo Bearer).",
            });
            o.OperationFilter<PerfisDaRota>();
        });
    }

    public static void Usar(WebApplication app)
    {
        app.UseSwagger(o => o.RouteTemplate = Prefixo + "/{documentName}/swagger.json");
        app.UseSwaggerUI(o =>
        {
            o.RoutePrefix = Prefixo;
            o.SwaggerEndpoint("v1/swagger.json", "API ZL Engenharia Solar v1");
            o.DocumentTitle = "API ZL Engenharia Solar";
        });
    }

    // Toda rota exige token, menos as [AllowAnonymous] (RequireAuthorization no Program.cs).
    // O filtro marca o cadeado, lista os perfis aceitos e documenta 401/403 no formato do contrato.
    sealed class PerfisDaRota : IOperationFilter
    {
        public void Apply(OpenApiOperation operacao, OperationFilterContext contexto)
        {
            var atributos = contexto.ApiDescription.ActionDescriptor.EndpointMetadata;
            if (atributos.OfType<IAllowAnonymous>().Any()) return;

            operacao.Security.Add(new OpenApiSecurityRequirement
            {
                [new OpenApiSecurityScheme { Reference = new OpenApiReference { Type = ReferenceType.SecurityScheme, Id = "Bearer" } }] = [],
            });

            // O atributo mais próximo da action vale (vem por último nos metadados).
            var perfis = atributos.OfType<AuthorizeAttribute>().LastOrDefault(a => a.Roles is not null)?.Roles;
            var texto = perfis is null ? "Perfis: qualquer usuário autenticado." : $"Perfis: {perfis.Replace(",", ", ")}.";
            operacao.Description = string.IsNullOrEmpty(operacao.Description) ? texto : $"{operacao.Description}\n\n{texto}";

            var erro = contexto.SchemaGenerator.GenerateSchema(typeof(ErroSaida), contexto.SchemaRepository);
            Responder(operacao, "401", "UNAUTHORIZED: token ausente, inválido ou expirado.", erro);
            if (perfis is not null) Responder(operacao, "403", "ACCESS_DENIED: perfil sem permissão.", erro);
        }

        static void Responder(OpenApiOperation operacao, string status, string descricao, OpenApiSchema schema) =>
            operacao.Responses.TryAdd(status, new OpenApiResponse
            {
                Description = descricao,
                Content = { ["application/json"] = new OpenApiMediaType { Schema = schema } },
            });
    }
}
