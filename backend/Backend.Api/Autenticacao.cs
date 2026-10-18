using System.Security.Claims;
using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.JsonWebTokens;
using Microsoft.IdentityModel.Tokens;

namespace Backend.Api;

// Emissão e validação do JWT (RF-01, RF-02). Chave em JWT_SECRET e validade em JWT_EXPIRES_MINUTES.
public sealed class Autenticacao
{
    public const string ClaimId = "sub";
    public const string ClaimPerfil = "perfil";
    public const string ClaimEquipe = "equipeId";
    const string ChaveDesenvolvimento = "chave-de-desenvolvimento-pi4-nao-usar-em-producao-2026";

    public SymmetricSecurityKey Chave { get; }
    public TimeSpan Validade { get; }

    public Autenticacao(IConfiguration config, IHostEnvironment ambiente)
    {
        var segredo = config["JWT_SECRET"];
        if (string.IsNullOrWhiteSpace(segredo))
            segredo = ambiente.IsDevelopment()
                ? ChaveDesenvolvimento
                : throw new InvalidOperationException("JWT_SECRET não configurado.");
        if (Encoding.UTF8.GetByteCount(segredo) < 32)
            throw new InvalidOperationException("JWT_SECRET precisa ter pelo menos 32 caracteres.");
        Chave = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(segredo));
        Validade = TimeSpan.FromMinutes(int.TryParse(config["JWT_EXPIRES_MINUTES"], out var minutos) && minutos > 0
            ? minutos : 480);
    }

    public (string Token, DateTime ExpiraEm) GerarToken(UsuarioBanco usuario)
    {
        var expiraEm = RegrasBase.Agora().Add(Validade);
        var claims = new Dictionary<string, object>
        {
            [ClaimId] = usuario.Id.ToString(),
            [ClaimPerfil] = usuario.NomePerfil,
        };
        if (usuario.EquipeId is int equipe) claims[ClaimEquipe] = equipe.ToString();
        var token = new JsonWebTokenHandler().CreateToken(new SecurityTokenDescriptor
        {
            Claims = claims,
            Expires = expiraEm,
            SigningCredentials = new SigningCredentials(Chave, SecurityAlgorithms.HmacSha256),
        });
        return (token, expiraEm);
    }

    public void Configurar(JwtBearerOptions opcoes)
    {
        opcoes.MapInboundClaims = false;
        opcoes.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = false,
            ValidateAudience = false,
            IssuerSigningKey = Chave,
            ClockSkew = TimeSpan.Zero,
            NameClaimType = ClaimId,
            RoleClaimType = ClaimPerfil,
        };
        // 401 e 403 no formato do contrato, com registro no audit_log (RF-02, RNF-03).
        opcoes.Events = new JwtBearerEvents
        {
            OnChallenge = async contexto =>
            {
                contexto.HandleResponse();
                var expirado = contexto.AuthenticateFailure is SecurityTokenExpiredException;
                var mensagem = expirado
                    ? "Token expirado. Faça login novamente em POST /api/auth/login."
                    : "Token ausente ou inválido. Faça login em POST /api/auth/login.";
                var motivo = expirado ? "TokenExpirado" : contexto.AuthenticateFailure is null ? "SemToken" : "TokenInvalido";
                await Negar(contexto.HttpContext, 401, "UNAUTHORIZED", mensagem, motivo);
            },
            OnForbidden = contexto => Negar(contexto.HttpContext, 403, "ACCESS_DENIED",
                "Seu perfil não tem permissão para esta ação.", "PerfilSemPermissao"),
        };
    }

    public static Task Negar(HttpContext http, int status, string code, string message, string motivo)
    {
        var banco = http.RequestServices.GetRequiredService<BancoDados>();
        banco.RegistrarAcessoNegado(http.User.UsuarioId(), status, http.Request.Method, http.Request.Path, motivo,
            http.User.Perfil());
        http.Response.StatusCode = status;
        return http.Response.WriteAsJsonAsync(Erro.Corpo(code, message));
    }
}

public static class UsuarioLogado
{
    public static int? UsuarioId(this ClaimsPrincipal usuario) =>
        int.TryParse(usuario.FindFirstValue(Autenticacao.ClaimId), out var id) ? id : null;

    public static string? Perfil(this ClaimsPrincipal usuario) => usuario.FindFirstValue(Autenticacao.ClaimPerfil);

    public static int? EquipeId(this ClaimsPrincipal usuario) =>
        int.TryParse(usuario.FindFirstValue(Autenticacao.ClaimEquipe), out var id) ? id : null;

    public static bool Instalador(this ClaimsPrincipal usuario) => usuario.Perfil() == Perfis.Instalador;
}
