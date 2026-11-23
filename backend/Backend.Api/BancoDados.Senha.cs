namespace Backend.Api;

// RF-21 / RF-22: tokens de redefinição (só o SHA-256 fica no banco) e versão da credencial do usuário,
// que o banco incrementa ao trocar senha, perfil ou estado; JWT com versão diferente deixa de valer.
public sealed partial class BancoDados
{
    public void CriarTokenRedefinicao(int usuarioId, byte[] hash)
    {
        using var conexao = Abrir();
        using var comando = Comando(conexao, """
            INSERT INTO token_redefinicao_senha (token_hash, id_usuario, versao_credencial)
            SELECT @hash, id, versao_credencial FROM usuario WHERE id = @usuario
            """, ("hash", hash), ("usuario", usuarioId));
        comando.ExecuteNonQuery();
    }

    // Consumo do token e troca da senha na mesma transação; false para link inválido, expirado ou já usado.
    public bool RedefinirSenha(byte[] hash, string senhaHash)
    {
        using var conexao = Abrir();
        using var transacao = conexao.BeginTransaction();
        using var consumir = Comando(conexao, transacao, "SELECT consumir_token_redefinicao(@hash)", ("hash", hash));
        if (consumir.ExecuteScalar() is not int usuarioId) return false;
        using var atualizar = Comando(conexao, transacao, """
            UPDATE usuario SET senha = @senha, tentativas_login = 0, bloqueado_ate = NULL WHERE id = @id
            """, ("senha", senhaHash), ("id", usuarioId));
        atualizar.ExecuteNonQuery();
        transacao.Commit();
        return true;
    }

    public void AlterarSenha(int usuarioId, string senhaHash)
    {
        using var conexao = Abrir();
        using var comando = Comando(conexao, "UPDATE usuario SET senha = @senha WHERE id = @id",
            ("senha", senhaHash), ("id", usuarioId));
        comando.ExecuteNonQuery();
    }

    // null quando o usuário não existe ou está inativo.
    public long? VersaoCredencial(int usuarioId)
    {
        using var conexao = Abrir();
        using var comando = Comando(conexao, "SELECT versao_credencial FROM usuario WHERE id = @id AND ativo", ("id", usuarioId));
        return comando.ExecuteScalar() as long?;
    }
}
