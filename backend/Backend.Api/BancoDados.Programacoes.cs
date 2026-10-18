using Npgsql;

namespace Backend.Api;

public sealed record ProgramacaoBanco(int Id, int ObraId, int EquipeId, DateOnly DataInicio, DateOnly DataFim,
    int Prioridade, decimal? DuracaoEstimadaDias);
public sealed record DeslocamentoBanco(int Id, DateOnly NovaDataInicio, DateOnly NovaDataFim);
public sealed record ReordenacaoBanco(int Id, DateOnly NovaDataInicio, DateOnly NovaDataFim,
    List<DeslocamentoBanco> ProgramacoesAfetadas);

// Regra de negócio violada dentro de uma operação no banco; o controller devolve no formato do contrato.
public sealed class RegraVioladaException(int status, string code, string message) : Exception(message)
{
    public int Status { get; } = status;
    public string Code { get; } = code;
}

public sealed partial class BancoDados
{
    // Status em que a obra já tem os materiais separados e pode receber equipe (RF-07, UC-13).
    static readonly string[] StatusAptos = ["Separado", "EmAndamento", "Assistencia"];

    const string SelecionarProgramacao = """
        SELECT p.id, p.id_obra, p.id_equipe, p.data_inicio, p.data_fim, COALESCE(p.prioridade, 1),
               p.duracao_estimada_dias
        FROM programacao_obra p
        """;

    static ProgramacaoBanco LerProgramacao(NpgsqlDataReader leitor) => new(
        leitor.GetInt32(0), leitor.GetInt32(1), leitor.GetInt32(2),
        leitor.GetFieldValue<DateOnly>(3), leitor.GetFieldValue<DateOnly>(4), leitor.GetInt32(5),
        leitor.IsDBNull(6) ? null : leitor.GetDecimal(6));

    public List<ProgramacaoBanco> ListarProgramacoes(DateOnly? inicio, DateOnly? fim, int? equipeId)
    {
        using var conexao = Abrir();
        // Obras excluídas logicamente não aparecem no Gantt.
        var sql = SelecionarProgramacao + " JOIN obra o ON o.id = p.id_obra WHERE o.excluida_em IS NULL";
        if (inicio is not null) sql += " AND p.data_fim >= @inicio";
        if (fim is not null) sql += " AND p.data_inicio <= @fim";
        if (equipeId is not null) sql += " AND p.id_equipe = @equipe";
        using var comando = Comando(conexao, sql + " ORDER BY p.id_equipe, p.data_inicio, p.prioridade, p.id",
            ("inicio", inicio), ("fim", fim), ("equipe", equipeId));
        using var leitor = comando.ExecuteReader();
        var itens = new List<ProgramacaoBanco>();
        while (leitor.Read()) itens.Add(LerProgramacao(leitor));
        return itens;
    }

    public ProgramacaoBanco CriarProgramacao(int obraId, int equipeId, DateOnly inicio, int prioridade, int usuarioId)
    {
        using var conexao = Abrir();
        using var transacao = conexao.BeginTransaction();
        using var buscarObra = Comando(conexao, transacao,
            "SELECT status::text, quantidade_paineis FROM obra WHERE id = @id AND excluida_em IS NULL FOR UPDATE",
            ("id", obraId));
        string status;
        int paineis;
        using (var leitor = buscarObra.ExecuteReader())
        {
            if (!leitor.Read())
                throw new RegraVioladaException(404, "OBRA_NOT_FOUND", $"Obra {obraId} não encontrada.");
            status = leitor.GetString(0);
            paineis = leitor.GetInt32(1);
        }
        using var buscarEquipe = Comando(conexao, transacao,
            "SELECT nome FROM equipe WHERE id = @id FOR UPDATE", ("id", equipeId));
        if (buscarEquipe.ExecuteScalar() is not string nomeEquipe)
            throw new RegraVioladaException(404, "EQUIPE_NOT_FOUND", $"Equipe {equipeId} não encontrada.");
        if (!StatusAptos.Contains(status))
            throw new RegraVioladaException(400, "VALIDATION_ERROR",
                $"A obra {obraId} ainda não está apta para instalação (status atual: {status}). " +
                "Os materiais precisam estar separados (status Separado).");

        var dias = Gantt.DuracaoEmDias(paineis);
        var fim = Gantt.DataFim(inicio, dias);
        GarantirAgendaLivre(conexao, transacao, equipeId, nomeEquipe, inicio, fim, []);

        using var inserir = Comando(conexao, transacao, """
            INSERT INTO programacao_obra (data_inicio, data_fim, prioridade, duracao_estimada_dias, id_obra, id_equipe)
            VALUES (@inicio, @fim, @prioridade, @duracao, @obra, @equipe) RETURNING id
            """, ("inicio", inicio), ("fim", fim), ("prioridade", prioridade), ("duracao", (decimal)dias),
            ("obra", obraId), ("equipe", equipeId));
        var id = (int)inserir.ExecuteScalar()!;

        // RF-10: alocar a equipe leva o cartão para a coluna de instalação.
        if (status == "Separado")
        {
            using var atualizar = Comando(conexao, transacao,
                "UPDATE obra SET status = 'EmAndamento' WHERE id = @id", ("id", obraId));
            atualizar.ExecuteNonQuery();
            using var inserirHistorico = Comando(conexao, transacao, """
                INSERT INTO historico_obra (tipo_acao, status_anterior, status_novo, observacao, id_obra, id_usuario, data_alteracao)
                VALUES ('MudancaStatus', 'Separado', 'EmAndamento', @observacao, @obra, @usuario, timezone('UTC', now()))
                """, ("observacao", $"{nomeEquipe} alocada de {inicio:yyyy-MM-dd} a {fim:yyyy-MM-dd}."),
                ("obra", obraId), ("usuario", usuarioId));
            inserirHistorico.ExecuteNonQuery();
        }
        transacao.Commit();
        return new ProgramacaoBanco(id, obraId, equipeId, inicio, fim, prioridade, dias);
    }

    // RF-09: desloca a alocação e propaga o mesmo deslocamento, em dias úteis, para as seguintes da equipe.
    public ReordenacaoBanco? Reordenar(int id, DateOnly novaDataInicio)
    {
        using var conexao = Abrir();
        using var transacao = conexao.BeginTransaction();
        ProgramacaoBanco? alvo;
        using (var buscar = Comando(conexao, transacao, SelecionarProgramacao + " WHERE p.id = @id FOR UPDATE", ("id", id)))
        using (var leitor = buscar.ExecuteReader())
            alvo = leitor.Read() ? LerProgramacao(leitor) : null;
        if (alvo is null) return null;

        var seguintes = new List<ProgramacaoBanco>();
        using (var buscar = Comando(conexao, transacao, SelecionarProgramacao + """
             WHERE p.id_equipe = @equipe AND p.id <> @id AND p.data_inicio >= @inicio
             ORDER BY p.data_inicio, p.prioridade, p.id FOR UPDATE
            """, ("equipe", alvo.EquipeId), ("id", id), ("inicio", alvo.DataInicio)))
        using (var leitor = buscar.ExecuteReader())
            while (leitor.Read()) seguintes.Add(LerProgramacao(leitor));

        var deslocamento = Gantt.DeslocamentoEmDiasUteis(alvo.DataInicio, novaDataInicio);
        // Cada alocação mantém a quantidade de dias úteis que já ocupava.
        var novas = new[] { alvo }.Concat(seguintes).Select(p =>
        {
            var inicio = Gantt.Deslocar(p.DataInicio, deslocamento);
            return new DeslocamentoBanco(p.Id, inicio, Gantt.DataFim(inicio, Gantt.DiasUteis(p.DataInicio, p.DataFim)));
        }).ToList();

        using var buscarNome = Comando(conexao, transacao, "SELECT nome FROM equipe WHERE id = @id", ("id", alvo.EquipeId));
        var nomeEquipe = (string)buscarNome.ExecuteScalar()!;
        var ids = novas.Select(n => n.Id).ToArray();
        foreach (var nova in novas)
            GarantirAgendaLivre(conexao, transacao, alvo.EquipeId, nomeEquipe, nova.NovaDataInicio, nova.NovaDataFim, ids);

        // A restrição de sobreposição não é adiável: atualiza primeiro quem anda na direção do movimento.
        foreach (var nova in deslocamento > 0 ? Enumerable.Reverse(novas) : novas)
        {
            using var atualizar = Comando(conexao, transacao,
                "UPDATE programacao_obra SET data_inicio = @inicio, data_fim = @fim WHERE id = @id",
                ("inicio", nova.NovaDataInicio), ("fim", nova.NovaDataFim), ("id", nova.Id));
            atualizar.ExecuteNonQuery();
        }
        transacao.Commit();
        var afetadas = novas.Skip(1).Zip(seguintes)
            .Where(par => par.First.NovaDataInicio != par.Second.DataInicio || par.First.NovaDataFim != par.Second.DataFim)
            .Select(par => par.First).ToList();
        return new ReordenacaoBanco(id, novas[0].NovaDataInicio, novas[0].NovaDataFim, afetadas);
    }

    // RN-02: a equipe não pode ter duas alocações no mesmo período (as listadas em "ignorar" estão sendo movidas).
    static void GarantirAgendaLivre(NpgsqlConnection conexao, NpgsqlTransaction transacao, int equipeId,
        string nomeEquipe, DateOnly inicio, DateOnly fim, int[] ignorar)
    {
        using var comando = Comando(conexao, transacao, """
            SELECT id_obra, data_inicio, data_fim FROM programacao_obra
            WHERE id_equipe = @equipe AND data_inicio <= @fim AND data_fim >= @inicio AND NOT (id = ANY(@ignorar))
            ORDER BY data_inicio LIMIT 1
            """, ("equipe", equipeId), ("inicio", inicio), ("fim", fim), ("ignorar", ignorar));
        using var leitor = comando.ExecuteReader();
        if (leitor.Read())
            throw new RegraVioladaException(409, "SCHEDULE_CONFLICT",
                $"A {nomeEquipe} já está alocada de {leitor.GetFieldValue<DateOnly>(1):yyyy-MM-dd} a " +
                $"{leitor.GetFieldValue<DateOnly>(2):yyyy-MM-dd} (obra {leitor.GetInt32(0)}). " +
                $"O período pedido vai de {inicio:yyyy-MM-dd} a {fim:yyyy-MM-dd}.");
    }
}
