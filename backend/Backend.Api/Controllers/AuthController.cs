using Microsoft.AspNetCore.Mvc;

namespace Backend.Api.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController : ControllerBase
{
    public record LoginEntrada(string? Email, string? Senha);

    // Rota 1 — RF-01
    [HttpPost("login")]
    public IActionResult Login(LoginEntrada e)
    {
        if (string.IsNullOrWhiteSpace(e.Email) || string.IsNullOrWhiteSpace(e.Senha))
            return Erro.Criar(400, "INVALID_BODY", "Informe email e senha.");

        var u = DadosFixos.Usuarios.FirstOrDefault(x => x.Email.Equals(e.Email.Trim(), StringComparison.OrdinalIgnoreCase));
        if (u is null || u.Senha != e.Senha)
            return Erro.Criar(401, "INVALID_CREDENTIALS", "E-mail ou senha inválidos.");

        var perfil = DadosFixos.Perfis.First(p => p.Id == u.PerfilId);
        return Ok(new
        {
            token = DadosFixos.GerarToken(u),
            // ponytail: token fake não expira de verdade; validade real vem com o JWT
            expiresAt = DadosFixos.Agora().AddHours(8),
            usuario = new { u.Id, u.Nome, u.Email, perfil = perfil.NomePerfil, u.EquipeId },
        });
    }

    // Rota 2 — RF-01, RF-02
    [HttpGet("me")]
    public IActionResult Me()
    {
        var u = DadosFixos.UsuarioDoToken(Request.Headers.Authorization);
        if (u is null)
            return Erro.Criar(401, "UNAUTHORIZED", "Token ausente ou inválido. Faça login em POST /api/auth/login.");

        var p = DadosFixos.Perfis.First(x => x.Id == u.PerfilId);
        return Ok(new
        {
            u.Id,
            u.Nome,
            u.Email,
            perfil = new { p.Id, p.NomePerfil, permissoes = p.Permissoes.Split(',') },
            u.EquipeId,
        });
    }
}
