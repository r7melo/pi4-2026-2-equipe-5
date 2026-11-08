using Npgsql;

namespace Backend.Api;

public sealed record ItemCustoBanco(int Id, string Tipo, int Quantidade, decimal? CustoUnitario);
public sealed record CustosObraBanco(int ObraId, decimal? CustoMaoObra, decimal? CustoInsumos,
    decimal? ValorObra, bool PrecificacaoCompleta, List<ItemCustoBanco> Materiais);
public sealed record BalancoMaterialBanco(string Tipo, int? QuantidadeUtilizada, int QuantidadeComprada);
public sealed record RelatorioCustoBanco(int ObraId, decimal CustoMaoObra, decimal CustoInsumos,
    decimal CustoTotal, List<BalancoMaterialBanco> BalancoMateriais);
public sealed record DreObraBanco(int ObraId, decimal ValorObra, decimal CustoMaoObra,
    decimal CustoInsumos, decimal CustoTotal, decimal Resultado);

public sealed partial class BancoDados
{
    const decimal LimiteMonetarioBanco = 9999999999.99m;

    public CustosObraBanco? BuscarCustosObra(int obraId)
    {
        using var conexao = Abrir();
        return BuscarCustosObra(conexao, null, obraId);
    }

    static CustosObraBanco? BuscarCustosObra(NpgsqlConnection conexao, NpgsqlTransaction? transacao, int obraId)
    {
        decimal? mao, insumos, valor;
        using (var comando = Comando(conexao, """
            SELECT r.custo_mao_obra, r.custo_insumos, r.valor_obra
            FROM obra o LEFT JOIN relatorio_custo r ON r.id_obra = o.id
            WHERE o.id = @obra AND o.excluida_em IS NULL
            """, ("obra", obraId)))
        {
            comando.Transaction = transacao;
            using var leitor = comando.ExecuteReader();
            if (!leitor.Read()) return null;
            mao = leitor.IsDBNull(0) ? null : leitor.GetDecimal(0);
            insumos = leitor.IsDBNull(1) ? null : leitor.GetDecimal(1);
            valor = leitor.IsDBNull(2) ? null : leitor.GetDecimal(2);
        }
        var materiais = new List<ItemCustoBanco>();
        using (var comando = Comando(conexao,
            "SELECT id, tipo, quantidade, custo_unitario FROM material WHERE id_obra = @obra ORDER BY id", ("obra", obraId)))
        {
            comando.Transaction = transacao;
            using var leitor = comando.ExecuteReader();
            while (leitor.Read()) materiais.Add(new(leitor.GetInt32(0), leitor.GetString(1), leitor.GetInt32(2),
                leitor.IsDBNull(3) ? null : leitor.GetDecimal(3)));
        }
        return new(obraId, mao, insumos, valor, mao is not null && insumos is not null && valor is not null, materiais);
    }

    // Campos nulos representam omissao: preservam o atual, sem converter ausencia em zero.
    public CustosObraBanco? AtualizarCustosObra(int obraId, decimal? custoMaoObra,
        decimal? custoInsumos, decimal? valorObra, int usuarioId)
    {
        foreach (var valor in new[] { custoMaoObra, custoInsumos, valorObra })
            if (valor is < 0 or > LimiteMonetarioBanco || (valor is not null && decimal.Round(valor.Value, 2) != valor))
                throw new RegraVioladaException(400, "VALIDATION_ERROR", "Valores devem ser nao negativos, ter ate duas casas e caber em NUMERIC(12,2).");
        using var conexao = Abrir();
        using var transacao = conexao.BeginTransaction();
        using (var obra = Comando(conexao, transacao,
            "SELECT id FROM obra WHERE id = @obra AND excluida_em IS NULL FOR UPDATE", ("obra", obraId)))
            if (obra.ExecuteScalar() is null) return null;
        var anterior = BuscarCustosObra(conexao, transacao, obraId)!;
        var mao = custoMaoObra ?? anterior.CustoMaoObra;
        var insumos = custoInsumos ?? anterior.CustoInsumos;
        var valorNovo = valorObra ?? anterior.ValorObra;
        if (mao + insumos > LimiteMonetarioBanco)
            throw new RegraVioladaException(400, "VALIDATION_ERROR", "O custo total excede a capacidade NUMERIC(12,2) do banco.");
        using (var comando = Comando(conexao, transacao, """
            INSERT INTO relatorio_custo (id_obra, custo_mao_obra, custo_insumos, valor_obra)
            VALUES (@obra, @mao, @insumos, @valor)
            ON CONFLICT (id_obra) DO UPDATE SET custo_mao_obra = EXCLUDED.custo_mao_obra,
                custo_insumos = EXCLUDED.custo_insumos, valor_obra = EXCLUDED.valor_obra
            """, ("obra", obraId), ("mao", mao), ("insumos", insumos), ("valor", valorNovo)))
            comando.ExecuteNonQuery();
        using (var historico = Comando(conexao, transacao, """
            INSERT INTO historico_obra (tipo_acao, observacao, id_obra, id_usuario, data_alteracao)
            VALUES ('AlteracaoFinanceira', 'Custos e precificacao da obra atualizados.', @obra, @usuario, timezone('UTC', now()))
            """, ("obra", obraId), ("usuario", usuarioId)))
            historico.ExecuteNonQuery();
        Auditar(conexao, transacao, usuarioId, "AlteracaoFinanceira", "obra", obraId,
            new { custoMaoObra = mao, custoInsumos = insumos, valorObra = valorNovo });
        var resultado = BuscarCustosObra(conexao, transacao, obraId)!;
        transacao.Commit();
        return resultado;
    }

    public DreObraBanco? BuscarDreObra(int obraId)
    {
        using var conexao = Abrir();
        return ApurarDre(conexao, obraId);
    }

    static DreObraBanco? ApurarDre(NpgsqlConnection conexao, int obraId)
    {
        using var comando = Comando(conexao, """
            SELECT o.status::text, r.custo_mao_obra, r.custo_insumos, r.valor_obra, r.custo_total
            FROM obra o LEFT JOIN relatorio_custo r ON r.id_obra = o.id
            WHERE o.id = @obra AND o.excluida_em IS NULL
            """, ("obra", obraId));
        using var leitor = comando.ExecuteReader();
        if (!leitor.Read()) return null;
        if (leitor.GetString(0) != "Concluido")
            throw new RegraVioladaException(400, "VALIDATION_ERROR", "A apuracao exige obra concluida.");
        if (Enumerable.Range(1, 4).Any(leitor.IsDBNull))
            throw new RegraVioladaException(400, "VALIDATION_ERROR", "A precificacao da obra esta incompleta.");
        var total = leitor.GetDecimal(4);
        var valor = leitor.GetDecimal(3);
        return new(obraId, valor, leitor.GetDecimal(1), leitor.GetDecimal(2), total, valor - total);
    }

    public RelatorioCustoBanco? BuscarRelatorioCusto(int obraId)
    {
        using var conexao = Abrir();
        var dre = ApurarDre(conexao, obraId);
        if (dre is null) return null;
        var materiais = new List<BalancoMaterialBanco>();
        using var comando = Comando(conexao,
            "SELECT tipo, quantidade_utilizada, quantidade FROM material WHERE id_obra = @obra ORDER BY id", ("obra", obraId));
        using var leitor = comando.ExecuteReader();
        while (leitor.Read()) materiais.Add(new(leitor.GetString(0), leitor.IsDBNull(1) ? null : leitor.GetInt32(1), leitor.GetInt32(2)));
        return new(obraId, dre.CustoMaoObra, dre.CustoInsumos, dre.CustoTotal, materiais);
    }
}
