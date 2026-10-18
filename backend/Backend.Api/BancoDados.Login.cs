namespace Backend.Api;

public sealed record SituacaoLoginBanco(bool Ativo, DateTime? BloqueadoAte);

public sealed partial class BancoDados
{
    public const int FalhasParaBloquear = 5;
    public static readonly TimeSpan TempoDeBloqueio = TimeSpan.FromMinutes(15);

    public SituacaoLoginBanco BuscarSituacaoLogin(int usuarioId)
    {
        using var conexao = Abrir();
        using var comando = Comando(conexao,
            "SELECT ativo, bloqueado_ate FROM usuario WHERE id = @id", ("id", usuarioId));
        using var leitor = comando.ExecuteReader();
        leitor.Read();
        return new SituacaoLoginBanco(leitor.GetBoolean(0),
            leitor.IsDBNull(1) ? null : DateTime.SpecifyKind(leitor.GetDateTime(1), DateTimeKind.Utc));
    }

    // RF-01: a quinta falha consecutiva bloqueia a conta e recomeça a contagem para depois do bloqueio.
    public void RegistrarFalhaLogin(int usuarioId)
    {
        using var conexao = Abrir();
        using var comando = Comando(conexao, """
            UPDATE usuario SET
                bloqueado_ate = CASE WHEN tentativas_login + 1 >= @limite
                                     THEN timezone('UTC', now()) + @bloqueio ELSE bloqueado_ate END,
                tentativas_login = CASE WHEN tentativas_login + 1 >= @limite THEN 0 ELSE tentativas_login + 1 END
            WHERE id = @id
            """, ("limite", FalhasParaBloquear), ("bloqueio", TempoDeBloqueio), ("id", usuarioId));
        comando.ExecuteNonQuery();
    }

    public void ZerarTentativasLogin(int usuarioId)
    {
        using var conexao = Abrir();
        using var comando = Comando(conexao,
            "UPDATE usuario SET tentativas_login = 0, bloqueado_ate = NULL WHERE id = @id", ("id", usuarioId));
        comando.ExecuteNonQuery();
    }
}
