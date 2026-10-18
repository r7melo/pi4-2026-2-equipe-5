using System.Text.Json;
using Npgsql;

namespace Backend.Api;

public sealed record ComentarioBanco(int Id, string Tipo, string Descricao, DateTime DataRegistro, AutorBanco Usuario);

public sealed partial class BancoDados
{
    const string SelecionarComentario = """
        SELECT c.id, c.tipo::text, c.descricao, c.data_registro, u.id, u.nome
        FROM comentario c JOIN usuario u ON u.id = c.id_usuario
        """;

    static ComentarioBanco LerComentario(NpgsqlDataReader leitor) => new(
        leitor.GetInt32(0), leitor.GetString(1), leitor.GetString(2), InstanteUtc(leitor, 3),
        new AutorBanco(leitor.GetInt32(4), leitor.GetString(5)));

    public List<ComentarioBanco> ListarComentarios(int obraId, string? tipo)
    {
        using var conexao = Abrir();
        var sql = SelecionarComentario + " WHERE c.id_obra = @obra";
        if (tipo is not null) sql += " AND c.tipo = CAST(@tipo AS tipo_comentario_enum)";
        using var comando = Comando(conexao, sql + " ORDER BY c.data_registro, c.id",
            ("obra", obraId), ("tipo", tipo));
        using var leitor = comando.ExecuteReader();
        var itens = new List<ComentarioBanco>();
        while (leitor.Read()) itens.Add(LerComentario(leitor));
        return itens;
    }

    ComentarioBanco? BuscarComentario(NpgsqlConnection conexao, NpgsqlTransaction? transacao, int id)
    {
        using var comando = Comando(conexao, SelecionarComentario + " WHERE c.id = @id", ("id", id));
        comando.Transaction = transacao;
        using var leitor = comando.ExecuteReader();
        return leitor.Read() ? LerComentario(leitor) : null;
    }

    public ComentarioBanco CriarComentario(int obraId, string tipo, string descricao, int usuarioId)
    {
        using var conexao = Abrir();
        // O comentário e o registro na timeline (RF-11) são gravados juntos.
        using var transacao = conexao.BeginTransaction();
        using var inserir = Comando(conexao, transacao, """
            INSERT INTO comentario (descricao, tipo, data_registro, id_obra, id_usuario)
            VALUES (@descricao, CAST(@tipo AS tipo_comentario_enum), timezone('UTC', now()), @obra, @usuario)
            RETURNING id
            """, ("descricao", descricao), ("tipo", tipo), ("obra", obraId), ("usuario", usuarioId));
        var id = (int)inserir.ExecuteScalar()!;
        using var inserirHistorico = Comando(conexao, transacao, """
            INSERT INTO historico_obra (tipo_acao, observacao, id_obra, id_usuario, data_alteracao)
            VALUES ('Comentario', @observacao, @obra, @usuario, timezone('UTC', now()))
            """, ("observacao", descricao), ("obra", obraId), ("usuario", usuarioId));
        inserirHistorico.ExecuteNonQuery();
        var comentario = BuscarComentario(conexao, transacao, id)!;
        transacao.Commit();
        return comentario;
    }

    public ComentarioBanco? EditarComentario(int id, string descricao, int usuarioId)
    {
        using var conexao = Abrir();
        using var transacao = conexao.BeginTransaction();
        using var buscar = Comando(conexao, transacao,
            "SELECT descricao FROM comentario WHERE id = @id FOR UPDATE", ("id", id));
        if (buscar.ExecuteScalar() is not string anterior) return null;

        using var atualizar = Comando(conexao, transacao,
            "UPDATE comentario SET descricao = @descricao WHERE id = @id", ("descricao", descricao), ("id", id));
        atualizar.ExecuteNonQuery();
        Auditar(conexao, transacao, usuarioId, "EditarComentario", "comentario", id,
            new { descricaoAnterior = anterior, descricaoNova = descricao });
        var comentario = BuscarComentario(conexao, transacao, id)!;
        transacao.Commit();
        return comentario;
    }

    public bool ExcluirComentario(int id, int usuarioId)
    {
        using var conexao = Abrir();
        using var transacao = conexao.BeginTransaction();
        var comentario = BuscarComentario(conexao, transacao, id);
        if (comentario is null) return false;

        using var excluir = Comando(conexao, transacao, "DELETE FROM comentario WHERE id = @id", ("id", id));
        excluir.ExecuteNonQuery();
        Auditar(conexao, transacao, usuarioId, "ExcluirComentario", "comentario", id,
            new { tipo = comentario.Tipo, descricao = comentario.Descricao, autorId = comentario.Usuario.Id });
        transacao.Commit();
        return true;
    }

    // RNF-04: a auditoria é gravada na mesma transação da operação.
    static void Auditar(NpgsqlConnection conexao, NpgsqlTransaction transacao, int usuarioId,
        string acao, string entidade, int entidadeId, object detalhes)
    {
        using var comando = Comando(conexao, transacao, """
            INSERT INTO audit_log (id_usuario, acao, entidade, entidade_id, detalhes)
            VALUES (@usuario, @acao, @entidade, @entidadeId, CAST(@detalhes AS jsonb))
            """, ("usuario", usuarioId), ("acao", acao), ("entidade", entidade), ("entidadeId", entidadeId),
            ("detalhes", JsonSerializer.Serialize(detalhes)));
        comando.ExecuteNonQuery();
    }
}
