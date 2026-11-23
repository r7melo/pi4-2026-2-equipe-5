using System.Text.Json;

namespace Backend.Api;

public sealed partial class BancoDados
{
    // RF-02 / RNF-03: toda negação de acesso (401 e 403) fica no audit_log.
    public void RegistrarAcessoNegado(int? usuarioId, int status, string metodo, string rota, string motivo, string? perfil)
    {
        using var conexao = Abrir();
        using var comando = Comando(conexao, """
            INSERT INTO audit_log (id_usuario, acao, entidade, detalhes)
            VALUES (@usuario, 'AcessoNegado', 'rota', CAST(@detalhes AS jsonb))
            """, ("usuario", usuarioId),
            ("detalhes", JsonSerializer.Serialize(new { status, metodo, rota, motivo, perfil })));
        comando.ExecuteNonQuery();
    }

    // Vínculo atual ou encerrado: a matriz de acesso fala em equipes que o instalador "integra ou integrou".
    public bool InstaladorNaObra(int obraId, int usuarioId)
    {
        using var conexao = Abrir();
        using var comando = Comando(conexao, """
            SELECT EXISTS (SELECT 1 FROM equipe_integrante i JOIN programacao_obra p ON p.id = i.id_programacao
                           WHERE p.id_obra = @obra AND i.id_usuario = @usuario)
            """, ("obra", obraId), ("usuario", usuarioId));
        return (bool)comando.ExecuteScalar()!;
    }
}
