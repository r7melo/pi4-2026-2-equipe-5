using Backend.Api;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Mvc;

var builder = WebApplication.CreateBuilder(args);

var connectionString = builder.Configuration.GetConnectionString("DefaultConnection")
    ?? throw new InvalidOperationException("ConnectionStrings:DefaultConnection não configurada.");
await SchemaMigrator.ApplyAndValidateAsync(connectionString);
builder.Services.AddSingleton(new BancoDados(connectionString));

var autenticacao = new Autenticacao(builder.Configuration, builder.Environment);
builder.Services.AddSingleton(autenticacao);
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme).AddJwtBearer(autenticacao.Configurar);
builder.Services.AddAuthorization();
builder.Services.AddSignalR();
builder.Services.AddSingleton<ObrasNotificador>();

builder.Services.AddControllers().ConfigureApiBehaviorOptions(o =>
{
    // Erros sem corpo (415 etc.) caem no UseStatusCodePages abaixo em vez de virar ProblemDetails
    o.SuppressMapClientErrors = true;
    // JSON malformado ou campo com tipo errado (ex.: data inválida) -> 400 no formato do contrato
    o.InvalidModelStateResponseFactory = ctx =>
    {
        var chaves = ctx.ModelState.Where(e => e.Value!.Errors.Count > 0).Select(e => e.Key).ToList();
        var query = chaves.Where(ctx.HttpContext.Request.Query.ContainsKey).ToList();
        if (query.Count > 0)
            return new BadRequestObjectResult(Erro.Corpo("INVALID_PARAMETER", $"Parâmetro(s) inválido(s): {string.Join(", ", query)}."));

        // Chaves "$.campo" vêm do corpo JSON
        var campos = chaves.Where(k => k.StartsWith("$.")).Select(k => k[2..]).ToList();
        var mensagem = campos.Count > 0
            ? $"Campo(s) com valor ou formato inválido: {string.Join(", ", campos)}."
            : "Corpo da requisição ausente ou JSON malformado.";
        return new BadRequestObjectResult(Erro.Corpo("INVALID_BODY", mensagem));
    };
});

// SignalR envia credenciais por padrão; CORS não permite combinar credenciais com '*'.
// Origens adicionais podem ser configuradas em Cors:AllowedOrigins (ou
// Cors__AllowedOrigins__0, Cors__AllowedOrigins__1 no ambiente).
var origensCors = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>()
    ?? ["http://localhost:3000", "http://127.0.0.1:3000"];
builder.Services.AddCors(o => o.AddDefaultPolicy(p => p
    .WithOrigins(origensCors)
    .AllowAnyHeader()
    .AllowAnyMethod()
    .AllowCredentials()));

var app = builder.Build();

app.UseExceptionHandler(e => e.Run(ctx => Responder(ctx, 500, "INTERNAL_ERROR", "Erro interno no servidor. Tente novamente mais tarde.")));

// Respostas sem corpo geradas pelo framework (rota inexistente, método errado...) também seguem o contrato
app.UseStatusCodePages(ctx =>
{
    var http = ctx.HttpContext;
    var rota = $"{http.Request.Method} {http.Request.Path}";
    return http.Response.StatusCode switch
    {
        404 => Responder(http, 404, "ROUTE_NOT_FOUND", $"A rota {rota} não existe."),
        405 => Responder(http, 405, "METHOD_NOT_ALLOWED", $"Método não permitido para {rota}."),
        415 => Responder(http, 415, "UNSUPPORTED_MEDIA_TYPE", "Envie o corpo como application/json."),
        _ => Task.CompletedTask,
    };
});

app.UseCors();
app.UseAuthentication();
app.UseAuthorization();
// Toda rota exige token, a não ser que tenha [AllowAnonymous] (RF-02). Rota inexistente continua 404.
app.MapControllers().RequireAuthorization();
app.MapHub<ObrasHub>("/hubs/obras").RequireAuthorization();
app.Run();

static Task Responder(HttpContext ctx, int status, string code, string message)
{
    ctx.Response.StatusCode = status;
    return ctx.Response.WriteAsJsonAsync(Erro.Corpo(code, message));
}
