using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Backend.Api.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController(BancoDados banco, Autenticacao autenticacao) : ControllerBase
{
    public record LoginEntrada(string? Email, string? Senha);

    // Rota 1 — RF-01
    [AllowAnonymous]
    [HttpPost("login")]
    public IActionResult Login(LoginEntrada e)
    {
        if (string.IsNullOrWhiteSpace(e.Email) || string.IsNullOrWhiteSpace(e.Senha))
            return Erro.Criar(400, "INVALID_BODY", "Informe email e senha.");

        var usuario = banco.BuscarUsuarioPorEmail(e.Email.Trim());
        if (usuario is null) return CredenciaisInvalidas();

        var situacao = banco.BuscarSituacaoLogin(usuario.Id);
        if (situacao.BloqueadoAte > DateTime.UtcNow)
        {
            var minutos = (int)Math.Ceiling((situacao.BloqueadoAte.Value - DateTime.UtcNow).TotalMinutes);
            return Erro.Criar(423, "ACCOUNT_LOCKED",
                $"Conta bloqueada após {BancoDados.FalhasParaBloquear} tentativas de login sem sucesso. " +
                $"Tente novamente em {minutos} minuto(s).");
        }
        // Conta inativa recebe a mesma mensagem genérica, sem revelar que o e-mail existe.
        if (!situacao.Ativo || !BCrypt.Net.BCrypt.Verify(e.Senha, usuario.SenhaHash))
        {
            if (situacao.Ativo) banco.RegistrarFalhaLogin(usuario.Id);
            return CredenciaisInvalidas();
        }
        banco.ZerarTentativasLogin(usuario.Id);

        var (token, expiraEm) = autenticacao.GerarToken(usuario);
        return Ok(new
        {
            token,
            expiresAt = expiraEm,
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
        var usuario = banco.BuscarUsuarioPorId(this.UsuarioAtualId());
        // Token válido de um usuário que não existe mais.
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

    static ObjectResult CredenciaisInvalidas() =>
        Erro.Criar(401, "INVALID_CREDENTIALS", "E-mail ou senha incorretos.");
}
