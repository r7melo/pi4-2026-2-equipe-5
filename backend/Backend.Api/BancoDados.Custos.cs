using Npgsql;

namespace Backend.Api;

public sealed record ItemCustoBanco(int Id, string Tipo, int Quantidade, decimal? CustoUnitario);
public sealed record CustosObraBanco(int ObraId, decimal CustoMaoObra, decimal CustoInsumos,
    decimal? ValorObra, bool PrecificacaoCompleta, List<ItemCustoBanco> Materiais);

public sealed partial class BancoDados
{
    public CustosObraBanco? BuscarCustosObra(int obraId)
    {
        using var conexao = Abrir();
        using var existe = Comando(conexao,
            "SELECT EXISTS (SELECT 1 FROM obra WHERE id = @id AND excluida_em IS NULL)", ("id", obraId));
        if (!(bool)existe.ExecuteScalar()!) return null;

        decimal custoMaoObra = 0, custoInsumos = 0;
        decimal? valorObra = null;
        var completa = false;
        using (var custos = Comando(conexao, """
            SELECT custo_mao_obra, custo_insumos, valor_obra
            FROM relatorio_custo WHERE id_obra = @obra
            """, ("obra", obraId)))
        using (var leitor = custos.ExecuteReader())
        {
            if (leitor.Read())
            {
                custoMaoObra = leitor.GetDecimal(0);
                custoInsumos = leitor.GetDecimal(1);
                valorObra = leitor.IsDBNull(2) ? null : leitor.GetDecimal(2);
                completa = valorObra is not null;
            }
        }

        var materiais = new List<ItemCustoBanco>();
        using (var comando = Comando(conexao, """
            SELECT id, tipo, quantidade, custo_unitario
            FROM material WHERE id_obra = @obra ORDER BY id
            """, ("obra", obraId)))
        using (var leitor = comando.ExecuteReader())
            while (leitor.Read())
                materiais.Add(new ItemCustoBanco(leitor.GetInt32(0), leitor.GetString(1), leitor.GetInt32(2),
                    leitor.IsDBNull(3) ? null : leitor.GetDecimal(3)));

        return new CustosObraBanco(obraId, custoMaoObra, custoInsumos, valorObra, completa, materiais);
    }

    public CustosObraBanco? AtualizarCustosObra(int obraId, decimal? custoMaoObra,
        decimal? custoInsumos, decimal? valorObra, int usuarioId)
    {
        using var conexao = Abrir();
        using var transacao = conexao.BeginTransaction();
        using (var existe = Comando(conexao, transacao,
            "SELECT id FROM obra WHERE id = @id AND excluida_em IS NULL FOR UPDATE", ("id", obraId)))
            if (existe.ExecuteScalar() is null) return null;

        using (var comando = Comando(conexao, transacao, """
            INSERT INTO relatorio_custo (id_obra, custo_mao_obra, custo_insumos, valor_obra)
            VALUES (@obra, COALESCE(@mao, 0), COALESCE(@insumos, 0), @valor)
            ON CONFLICT (id_obra) DO UPDATE SET
                custo_mao_obra = COALESCE(@mao, relatorio_custo.custo_mao_obra),
                custo_insumos = COALESCE(@insumos, relatorio_custo.custo_insumos),
                valor_obra = COALESCE(@valor, relatorio_custo.valor_obra)
            """, ("obra", obraId), ("mao", custoMaoObra), ("insumos", custoInsumos), ("valor", valorObra)))
            comando.ExecuteNonQuery();

        using (var historico = Comando(conexao, transacao, """
            INSERT INTO historico_obra (tipo_acao, observacao, id_obra, id_usuario, data_alteracao)
            VALUES ('AlteracaoFinanceira', 'Custos e precificação da obra atualizados.', @obra, @usuario, timezone('UTC', now()))
            """, ("obra", obraId), ("usuario", usuarioId)))
            historico.ExecuteNonQuery();

        Auditar(conexao, transacao, usuarioId, "AlteracaoFinanceira", "obra", obraId,
            new { custoMaoObra, custoInsumos, valorObra });
        transacao.Commit();
        return BuscarCustosObra(obraId);
    }
}
