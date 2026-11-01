using System.Text;
using Npgsql;

namespace Backend.Api;

public sealed record PerfilCadastroBanco(int Id, string NomePerfil);
public sealed record UsuarioCriadoBanco(int Id, string Nome, string Email, string Perfil, int? EquipeId, bool Ativo);

public sealed partial class BancoDados
{
    // O perfil Leitor permanece no banco, mas ainda nao integra a matriz de cadastro (Q4).
    static readonly string[] PerfisCadastro =
        [Perfis.Administrador, Perfis.Engenharia, Perfis.Financeiro, Perfis.Instalador];

    public List<PerfilCadastroBanco> ListarPerfis()
    {
        using var conexao = Abrir();
        using var comando = Comando(conexao, """
            SELECT id, nome_perfil::text FROM perfil_acesso
            WHERE nome_perfil::text = ANY(@perfis) ORDER BY id
            """, ("perfis", PerfisCadastro));
        using var leitor = comando.ExecuteReader();
        var perfis = new List<PerfilCadastroBanco>();
        while (leitor.Read())
            perfis.Add(new PerfilCadastroBanco(leitor.GetInt32(0), leitor.GetString(1)));
        return perfis;
    }

    // RF-01: fronteira unica de hash para cadastro. A senha nao e aparada nem retornada.
    public UsuarioCriadoBanco CriarUsuario(string? nome, string? email, string? senha, string? perfil, int? equipeId = null)
    {
        var nomeLimpo = nome?.Trim();
        var emailLimpo = email?.Trim().ToLowerInvariant();
        if (string.IsNullOrWhiteSpace(nomeLimpo) || nomeLimpo.Contains('\0') || nomeLimpo.Length is < 3 or > 200)
            throw ValidacaoUsuario("nome deve ter entre 3 e 200 caracteres.");
        if (string.IsNullOrWhiteSpace(emailLimpo) || emailLimpo.Contains('\0') || emailLimpo.Length > 200 || !Validacoes.EmailValido(emailLimpo))
            throw ValidacaoUsuario("Informe um e-mail valido com no maximo 200 caracteres.");
        if (string.IsNullOrWhiteSpace(senha) || senha.Contains('\0') || Encoding.UTF8.GetByteCount(senha) is < 6 or > 72)
            throw ValidacaoUsuario("senha deve ter entre 6 e 72 bytes UTF-8, sem caractere nulo.");
        if (perfil is null || !PerfisCadastro.Contains(perfil, StringComparer.Ordinal))
            throw ValidacaoUsuario("perfil deve ser Administrador, Engenharia, Financeiro ou InstaladorCampo.");
        var instalador = perfil == Perfis.Instalador;
        if (instalador && equipeId is <= 0)
            throw ValidacaoUsuario("equipeId deve ser positivo quando informado para InstaladorCampo.");
        if (!instalador && equipeId is not null)
            throw ValidacaoUsuario("equipeId deve ser nulo para os demais perfis.");

        try
        {
            using var conexao = Abrir();
            using var transacao = conexao.BeginTransaction();
            using var buscarPerfil = Comando(conexao, transacao,
                "SELECT id FROM perfil_acesso WHERE nome_perfil::text = @perfil FOR KEY SHARE", ("perfil", perfil));
            var perfilId = buscarPerfil.ExecuteScalar() as int?
                ?? throw ValidacaoUsuario("O perfil informado nao esta cadastrado no banco.");
            if (instalador && equipeId is not null)
            {
                using var buscarEquipe = Comando(conexao, transacao,
                    "SELECT id FROM equipe WHERE id = @equipe FOR KEY SHARE", ("equipe", equipeId));
                if (buscarEquipe.ExecuteScalar() is null)
                    throw new RegraVioladaException(404, "EQUIPE_NOT_FOUND", $"Equipe {equipeId} nao encontrada.");
            }

            var hash = BCrypt.Net.BCrypt.HashPassword(senha, workFactor: 12);
            using var inserir = Comando(conexao, transacao, """
                INSERT INTO usuario (nome, email, senha, id_perfil, id_equipe)
                VALUES (@nome, @email, @hash, @perfil, @equipe) RETURNING id, ativo
                """, ("nome", nomeLimpo), ("email", emailLimpo), ("hash", hash),
                ("perfil", perfilId), ("equipe", equipeId));
            int usuarioId;
            bool ativo;
            using (var leitor = inserir.ExecuteReader())
            {
                leitor.Read();
                usuarioId = leitor.GetInt32(0);
                ativo = leitor.GetBoolean(1);
            }
            if (instalador && equipeId is not null)
            {
                using var vincular = Comando(conexao, transacao,
                    "INSERT INTO equipe_instalador (id_equipe, id_usuario) VALUES (@equipe, @usuario)",
                    ("equipe", equipeId), ("usuario", usuarioId));
                vincular.ExecuteNonQuery();
            }
            transacao.Commit();
            return new UsuarioCriadoBanco(usuarioId, nomeLimpo, emailLimpo, perfil, equipeId, ativo);
        }
        catch (PostgresException erro) when (erro.SqlState == PostgresErrorCodes.UniqueViolation
            && erro.ConstraintName is "usuario_email_key" or "idx_usuario_email_busca")
        {
            // A restricao do banco tambem cobre duas insercoes concorrentes, sem depender de pre-consulta.
            throw new RegraVioladaException(409, "EMAIL_ALREADY_EXISTS", "E-mail ja cadastrado para outro usuario.");
        }
    }

    static RegraVioladaException ValidacaoUsuario(string mensagem) => new(400, "VALIDATION_ERROR", mensagem);
}
