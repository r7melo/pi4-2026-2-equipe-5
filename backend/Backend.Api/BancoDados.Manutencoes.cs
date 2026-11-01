using Npgsql;

namespace Backend.Api;

public sealed record ManutencaoBanco(int Id, int ObraId, string ClienteNome, string Endereco,
    string Descricao, string Status, DateTime? DataConclusao);
public sealed record ManutencaoConcluidaBanco(int Id, string Status, DateTime DataConclusao);

public sealed partial class BancoDados
{
    const string SelecionarManutencao = """
        SELECT m.id, m.id_obra, c.nome, o.endereco, m.descricao, m.status::text, m.data_conclusao
        FROM manutencao m JOIN obra o ON o.id = m.id_obra JOIN cliente c ON c.id = o.id_cliente
        """;

    static ManutencaoBanco LerManutencao(NpgsqlDataReader leitor) => new(leitor.GetInt32(0),
        leitor.GetInt32(1), leitor.GetString(2), leitor.GetString(3), leitor.GetString(4), leitor.GetString(5),
        leitor.IsDBNull(6) ? null : InstanteUtc(leitor, 6));

    public List<ManutencaoBanco> ListarManutencoesEquipe(int equipeId, string? status = null)
    {
        if (status is not null and not "Pendente" and not "Concluida")
            throw new RegraVioladaException(400, "INVALID_PARAMETER", "status deve ser Pendente ou Concluida.");
        using var conexao = Abrir();
        using var comando = Comando(conexao, SelecionarManutencao + """
             WHERE m.id_equipe = @equipe AND o.excluida_em IS NULL
               AND (@status IS NULL OR m.status::text = @status) ORDER BY m.id
            """, ("equipe", equipeId), ("status", status));
        // O parametro nulo tambem aparece fora de uma comparacao tipada.
        comando.Parameters["status"].NpgsqlDbType = NpgsqlTypes.NpgsqlDbType.Text;
        using var leitor = comando.ExecuteReader();
        var itens = new List<ManutencaoBanco>();
        while (leitor.Read()) itens.Add(LerManutencao(leitor));
        return itens;
    }

    public ManutencaoBanco? BuscarManutencaoEquipe(int manutencaoId, int equipeId)
    {
        using var conexao = Abrir();
        using var comando = Comando(conexao, SelecionarManutencao +
            " WHERE m.id = @id AND m.id_equipe = @equipe AND o.excluida_em IS NULL",
            ("id", manutencaoId), ("equipe", equipeId));
        using var leitor = comando.ExecuteReader();
        return leitor.Read() ? LerManutencao(leitor) : null;
    }

    static (int ObraId, string Status) BloquearManutencao(NpgsqlConnection conexao,
        NpgsqlTransaction transacao, int manutencaoId, int equipeId, int usuarioId)
    {
        int obraId, equipeReal;
        string status;
        using (var comando = Comando(conexao, transacao, """
            SELECT m.id_obra, m.id_equipe, m.status::text FROM manutencao m JOIN obra o ON o.id = m.id_obra
            WHERE m.id = @id AND o.excluida_em IS NULL FOR UPDATE OF m FOR SHARE OF o
            """, ("id", manutencaoId)))
        using (var leitor = comando.ExecuteReader())
        {
            if (!leitor.Read()) throw new RegraVioladaException(404, "MANUTENCAO_NOT_FOUND", "Manutencao nao encontrada.");
            obraId = leitor.GetInt32(0);
            equipeReal = leitor.GetInt32(1);
            status = leitor.GetString(2);
        }
        if (equipeReal != equipeId)
            throw new RegraVioladaException(403, "ACCESS_DENIED", "Manutencao nao pertence a equipe do usuario.");
        using (var comando = Comando(conexao, transacao, """
            SELECT u.ativo AND p.nome_perfil::text = @perfil AND u.id_equipe = @equipe
            FROM usuario u JOIN perfil_acesso p ON p.id = u.id_perfil WHERE u.id = @usuario FOR SHARE OF u
            """, ("perfil", Perfis.Instalador), ("equipe", equipeId), ("usuario", usuarioId)))
            if (comando.ExecuteScalar() is not true)
                throw new RegraVioladaException(403, "ACCESS_DENIED", "Usuario nao e instalador ativo desta equipe.");
        using (var comando = Comando(conexao, transacao, """
            SELECT id_usuario FROM equipe_instalador WHERE id_equipe = @equipe AND id_usuario = @usuario FOR KEY SHARE
            """, ("equipe", equipeId), ("usuario", usuarioId)))
            if (comando.ExecuteScalar() is null)
                throw new RegraVioladaException(403, "ACCESS_DENIED", "Usuario nao integra a equipe da manutencao.");
        return (obraId, status);
    }

    static string TextoManutencao(string? valor, string campo)
    {
        if (string.IsNullOrWhiteSpace(valor) || valor.Contains('\0'))
            throw new RegraVioladaException(400, "VALIDATION_ERROR", $"{campo} nao pode ser vazio nem conter caractere nulo.");
        return valor.Trim();
    }

    public ManutencaoConcluidaBanco ConcluirManutencao(int manutencaoId, string? servicoExecutado,
        int equipeId, int usuarioId)
    {
        var servico = TextoManutencao(servicoExecutado, "servicoExecutado");
        using var conexao = Abrir();
        using var transacao = conexao.BeginTransaction();
        var atual = BloquearManutencao(conexao, transacao, manutencaoId, equipeId, usuarioId);
        if (atual.Status == "Concluida")
            throw new RegraVioladaException(400, "VALIDATION_ERROR", "A manutencao ja esta concluida.");
        DateTime data;
        using (var comando = Comando(conexao, transacao, """
            UPDATE manutencao SET status = 'Concluida', data_conclusao = timezone('UTC', now())
            WHERE id = @id RETURNING data_conclusao
            """, ("id", manutencaoId)))
            data = DateTime.SpecifyKind((DateTime)comando.ExecuteScalar()!, DateTimeKind.Utc);
        using (var historico = Comando(conexao, transacao, """
            INSERT INTO historico_obra (tipo_acao, observacao, id_obra, id_usuario, data_alteracao)
            VALUES ('ManutencaoConcluida', @servico, @obra, @usuario, timezone('UTC', now()))
            """, ("servico", servico), ("obra", atual.ObraId), ("usuario", usuarioId)))
            historico.ExecuteNonQuery();
        Auditar(conexao, transacao, usuarioId, "ConcluirManutencao", "manutencao", manutencaoId, new { servicoExecutado = servico });
        transacao.Commit();
        return new(manutencaoId, "Concluida", data);
    }

    public ComentarioBanco CriarComentarioManutencao(int manutencaoId, string? descricao,
        int equipeId, int usuarioId)
    {
        var texto = TextoManutencao(descricao, "descricao");
        using var conexao = Abrir();
        using var transacao = conexao.BeginTransaction();
        var atual = BloquearManutencao(conexao, transacao, manutencaoId, equipeId, usuarioId);
        int id;
        using (var comando = Comando(conexao, transacao, """
            INSERT INTO comentario (descricao, tipo, id_manutencao, id_obra, id_usuario, data_registro)
            VALUES (@descricao, 'Manutencao', @manutencao, @obra, @usuario, timezone('UTC', now())) RETURNING id
            """, ("descricao", texto), ("manutencao", manutencaoId), ("obra", atual.ObraId), ("usuario", usuarioId)))
            id = (int)comando.ExecuteScalar()!;
        using (var historico = Comando(conexao, transacao, """
            INSERT INTO historico_obra (tipo_acao, observacao, id_obra, id_usuario, data_alteracao)
            VALUES ('Comentario', @descricao, @obra, @usuario, timezone('UTC', now()))
            """, ("descricao", texto), ("obra", atual.ObraId), ("usuario", usuarioId)))
            historico.ExecuteNonQuery();
        Auditar(conexao, transacao, usuarioId, "ComentarManutencao", "manutencao", manutencaoId, new { comentarioId = id });
        var comentario = BuscarComentario(conexao, transacao, id)!;
        transacao.Commit();
        return comentario;
    }
}
