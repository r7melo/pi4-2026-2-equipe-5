using Microsoft.AspNetCore.Mvc;

namespace Backend.Api.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController(BancoDados banco) : ControllerBase
{
    public record LoginEntrada(string? Email, string? Senha);

    // Rota 1 — RF-01
    [HttpPost("login")]
    public IActionResult Login(LoginEntrada e)
    {
        if (string.IsNullOrWhiteSpace(e.Email) || string.IsNullOrWhiteSpace(e.Senha))
            return Erro.Criar(400, "INVALID_BODY", "Informe email e senha.");

        var usuario = banco.BuscarUsuarioPorEmail(e.Email.Trim());
        if (usuario is null || !BCrypt.Net.BCrypt.Verify(e.Senha, usuario.SenhaHash))
            return Erro.Criar(401, "INVALID_CREDENTIALS", "E-mail ou senha inválidos.");

        return Ok(new
        {
            token = RegrasBase.GerarToken(usuario.Id),
            expiresAt = RegrasBase.Agora().AddHours(8),
            usuario = new
            {
                usuario.Id, usuario.Nome, usuario.Email,
                perfil = usuario.NomePerfil,
                equipeId = usuario.EquipeId,
            },
        });
    }

    // Rota 2 — RF-01, RF-02
    [HttpGet("me")]
    public IActionResult Me()
    {
        var id = RegrasBase.IdDoToken(Request.Headers.Authorization);
        var usuario = id is int usuarioId ? banco.BuscarUsuarioPorId(usuarioId) : null;
        if (usuario is null)
            return Erro.Criar(401, "UNAUTHORIZED", "Token ausente ou inválido. Faça login em POST /api/auth/login.");

        return Ok(new
        {
            usuario.Id, usuario.Nome, usuario.Email,
            perfil = new
            {
                id = usuario.PerfilId,
                nomePerfil = usuario.NomePerfil,
                permissoes = usuario.Permissoes.Split(',', StringSplitOptions.RemoveEmptyEntries),
            },
            equipeId = usuario.EquipeId,
        });
    }
}
