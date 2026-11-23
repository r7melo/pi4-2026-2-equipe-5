using System.Security.Cryptography;
using System.Text;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Backend.Api.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController(BancoDados banco, Autenticacao autenticacao, Email email, IConfiguration config)
    : ControllerBase
{
    public record LoginEntrada(string? Email, string? Senha);
    public record EsqueciSenhaEntrada(string? Email);
    public record RedefinirSenhaEntrada(string? Token, string? NovaSenha, string? ConfirmacaoSenha);
    public record AlterarSenhaEntrada(string? SenhaAtual, string? NovaSenha, string? ConfirmacaoSenha);

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
        });
    }

    /// <summary>Envia por e-mail o link de redefinição de senha, válido por 1 hora e de uso único (rota 3, RF-21).</summary>
    /// <remarks>A resposta é sempre a mesma, exista ou não o e-mail.</remarks>
    [AllowAnonymous]
    [HttpPost("esqueci-senha")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ErroSaida), StatusCodes.Status400BadRequest)]
    public IActionResult EsqueciSenha(EsqueciSenhaEntrada e)
    {
        if (string.IsNullOrWhiteSpace(e.Email) || !Validacoes.EmailValido(e.Email.Trim()))
            return Erro.Criar(400, "VALIDATION_ERROR", "Informe um e-mail válido.");
        var usuario = banco.BuscarUsuarioPorEmail(e.Email.Trim());
        if (usuario is not null && banco.VersaoCredencial(usuario.Id) is not null)
        {
            var token = Base64Url(RandomNumberGenerator.GetBytes(32));
            banco.CriarTokenRedefinicao(usuario.Id, Hash(token));
            var frontend = (config["FRONTEND_URL"] ?? "http://localhost:3000").TrimEnd('/');
            email.EnviarEmSegundoPlano(usuario.Email, "Redefinição de senha - ZL Engenharia Solar",
                $"Olá, {usuario.Nome}.\n\nPara criar uma nova senha, acesse o link abaixo. Ele vale por 1 hora e só pode ser usado uma vez.\n\n" +
                $"{frontend}/redefinir-senha?token={token}\n\nSe você não pediu a troca, ignore este e-mail.");
        }
        return Ok(new { mensagem = "Se o e-mail estiver cadastrado, você receberá um link para redefinir a senha." });
    }

    /// <summary>Redefine a senha com o token do link; invalida todos os JWT do usuário (rota 4, RF-21 e RF-22).</summary>
    [AllowAnonymous]
    [HttpPost("redefinir-senha")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ErroSaida), StatusCodes.Status400BadRequest)]
    public IActionResult RedefinirSenha(RedefinirSenhaEntrada e)
    {
        var erro = ValidarNovaSenha(e.NovaSenha, e.ConfirmacaoSenha);
        if (erro is not null) return erro;
        if (string.IsNullOrWhiteSpace(e.Token) || !banco.RedefinirSenha(Hash(e.Token.Trim()), HashSenha(e.NovaSenha!)))
            return Erro.Criar(400, "VALIDATION_ERROR", "Link inválido, expirado ou já usado. Peça um novo link em \"Esqueci minha senha\".");
        return Ok(new { mensagem = "Senha redefinida. Faça login com a nova senha.", sucesso = true });
    }

    /// <summary>O usuário logado troca a própria senha informando a atual (rota 5, RF-21).</summary>
    /// <remarks>Depois da troca, os tokens emitidos antes (inclusive o desta requisição) deixam de valer.</remarks>
    [HttpPut("alterar-senha")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ErroSaida), StatusCodes.Status400BadRequest)]
    public IActionResult AlterarSenha(AlterarSenhaEntrada e)
    {
        var usuario = banco.BuscarUsuarioPorId(this.UsuarioAtualId());
        if (usuario is null)
            return Erro.Criar(401, "UNAUTHORIZED", "Token ausente ou inválido. Faça login em POST /api/auth/login.");
        if (string.IsNullOrEmpty(e.SenhaAtual) || !BCrypt.Net.BCrypt.Verify(e.SenhaAtual, usuario.SenhaHash))
            return Erro.Criar(400, "SENHA_ATUAL_INCORRETA", "A senha atual não confere.");
        var erro = ValidarNovaSenha(e.NovaSenha, e.ConfirmacaoSenha);
        if (erro is not null) return erro;
        banco.AlterarSenha(usuario.Id, HashSenha(e.NovaSenha!));
        return Ok(new { mensagem = "Senha alterada com sucesso.", sucesso = true });
    }

    // Política do RF-21: mínimo 8 caracteres, com maiúscula, minúscula e número (bcrypt usa até 72 bytes).
    static ObjectResult? ValidarNovaSenha(string? senha, string? confirmacao)
    {
        if (senha is null || senha.Length < 8 || Encoding.UTF8.GetByteCount(senha) > 72
            || !senha.Any(char.IsUpper) || !senha.Any(char.IsLower) || !senha.Any(char.IsDigit))
            return Erro.Criar(400, "VALIDATION_ERROR",
                "A nova senha precisa ter pelo menos 8 caracteres (até 72 bytes), com letra maiúscula, letra minúscula e número.");
        if (senha != confirmacao)
            return Erro.Criar(400, "VALIDATION_ERROR", "A confirmação não é igual à nova senha.");
        return null;
    }

    static string HashSenha(string senha) => BCrypt.Net.BCrypt.HashPassword(senha, workFactor: 12);
    static byte[] Hash(string token) => SHA256.HashData(Encoding.UTF8.GetBytes(token));
    static string Base64Url(byte[] bytes) => Convert.ToBase64String(bytes).TrimEnd('=').Replace('+', '-').Replace('/', '_');

    static ObjectResult CredenciaisInvalidas() =>
        Erro.Criar(401, "INVALID_CREDENTIALS", "E-mail ou senha incorretos.");
}
