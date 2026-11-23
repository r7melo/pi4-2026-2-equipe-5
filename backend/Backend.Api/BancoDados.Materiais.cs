using Npgsql;

namespace Backend.Api;

public sealed record MaterialBanco(int Id, int ProdutoId, string ProdutoNome, string Tipo, string Unidade,
    int Quantidade, int? QuantidadeUtilizada, decimal? CustoUnitario, string StatusLogistico, int ObraId)
{
    // RF-26: sem custoUnitario (nem como null) para Engenharia e Instalador.
    public Dictionary<string, object?> Saida(bool veValores)
    {
        var saida = new Dictionary<string, object?>
        {
            ["id"] = Id, ["produtoId"] = ProdutoId, ["produtoNome"] = ProdutoNome, ["tipo"] = Tipo,
            ["unidade"] = Unidade, ["quantidade"] = Quantidade, ["quantidadeUtilizada"] = QuantidadeUtilizada,
        };
        if (veValores) saida["custoUnitario"] = CustoUnitario;
        saida["statusLogistico"] = StatusLogistico;
        return saida;
    }
}

public sealed record ProdutoBanco(int Id, string Nome, string Tipo, string Unidade, decimal PrecoUnitario, bool Ativo)
{
    // RF-26 / RN-07: Engenharia vê o catálogo sem precoUnitario.
    public Dictionary<string, object?> Saida(bool veValores)
    {
        var saida = new Dictionary<string, object?> { ["id"] = Id, ["nome"] = Nome, ["tipo"] = Tipo, ["unidade"] = Unidade };
        if (veValores) saida["precoUnitario"] = PrecoUnitario;
        saida["ativo"] = Ativo;
        return saida;
    }
}

// Materiais da obra e catálogo de produtos (RF-06, RF-25). O banco copia o preço do produto para
// material.custo_unitario na inclusão (Q13), então mudar o catálogo não altera material já lançado.
public sealed partial class BancoDados
{
    const string SelecionarMaterial = """
        SELECT m.id, p.id, p.nome, p.tipo, p.unidade, m.quantidade, m.quantidade_utilizada, m.custo_unitario,
               m.status_logistico::text, m.id_obra
        FROM material m JOIN produto p ON p.id = m.id_produto
        """;

    static MaterialBanco LerMaterial(NpgsqlDataReader leitor) => new(
        leitor.GetInt32(0), leitor.GetInt32(1), leitor.GetString(2), leitor.GetString(3), leitor.GetString(4),
        leitor.GetInt32(5), leitor.IsDBNull(6) ? null : leitor.GetInt32(6),
        leitor.IsDBNull(7) ? null : leitor.GetDecimal(7), leitor.GetString(8), leitor.GetInt32(9));

    public List<MaterialBanco> ListarMateriais(int obraId)
    {
        using var conexao = Abrir();
        using var comando = Comando(conexao, SelecionarMaterial + " WHERE m.id_obra = @obra ORDER BY m.id", ("obra", obraId));
        using var leitor = comando.ExecuteReader();
        var itens = new List<MaterialBanco>();
        while (leitor.Read()) itens.Add(LerMaterial(leitor));
        return itens;
    }

    MaterialBanco BuscarMaterial(NpgsqlConnection conexao, NpgsqlTransaction transacao, int id, bool bloquear = false)
    {
        using var comando = Comando(conexao, transacao,
            SelecionarMaterial + " WHERE m.id = @id" + (bloquear ? " FOR UPDATE OF m" : ""), ("id", id));
        using var leitor = comando.ExecuteReader();
        return leitor.Read() ? LerMaterial(leitor)
            : throw new RegraVioladaException(404, "MATERIAL_NOT_FOUND", $"Material {id} não encontrado.");
    }

    public MaterialBanco CriarMaterial(int obraId, int produtoId, int quantidade)
    {
        using var conexao = Abrir();
        using var transacao = conexao.BeginTransaction();
        using (var produto = Comando(conexao, transacao,
            "SELECT ativo FROM produto WHERE id = @id FOR SHARE", ("id", produtoId)))
            if (produto.ExecuteScalar() is not true)
                throw ProdutoInativo(produtoId);
        int id;
        try
        {
            // tipo, custo_unitario e status (EmSolicitacao) são preenchidos pelo banco.
            using var inserir = Comando(conexao, transacao, """
                INSERT INTO material (id_produto, quantidade, id_obra) VALUES (@produto, @quantidade, @obra) RETURNING id
                """, ("produto", produtoId), ("quantidade", quantidade), ("obra", obraId));
            id = (int)inserir.ExecuteScalar()!;
        }
        catch (PostgresException erro) when (erro.ConstraintName == "ck_material_produto_ativo")
        {
            throw ProdutoInativo(produtoId);
        }
        var material = BuscarMaterial(conexao, transacao, id);
        transacao.Commit();
        return material;
    }

    static RegraVioladaException ProdutoInativo(int produtoId) => new(400, "PRODUTO_INATIVO",
        $"Produto {produtoId} não existe ou está desativado. Escolha um produto ativo do catálogo.");

    // RF-06: o status só avança para o próximo da ordem (Q12 em aberto); toda mudança grava audit_log.
    public MaterialBanco AtualizarMaterial(int id, string? status, int? quantidadeUtilizada, int usuarioId)
    {
        using var conexao = Abrir();
        using var transacao = conexao.BeginTransaction();
        var atual = BuscarMaterial(conexao, transacao, id, bloquear: true);
        if (status is not null)
        {
            var proximo = Array.IndexOf(RegrasBase.StatusLogistico, atual.StatusLogistico) + 1;
            if (proximo >= RegrasBase.StatusLogistico.Length || RegrasBase.StatusLogistico[proximo] != status)
                throw new RegraVioladaException(400, "INVALID_STATUS_LOGISTICO", proximo < RegrasBase.StatusLogistico.Length
                    ? $"O material está em {atual.StatusLogistico}; o próximo status permitido é {RegrasBase.StatusLogistico[proximo]}."
                    : $"O material já está em {atual.StatusLogistico}, o último status logístico.");
        }
        if (quantidadeUtilizada > atual.Quantidade)
            throw new RegraVioladaException(400, "VALIDATION_ERROR",
                $"quantidadeUtilizada não pode ser maior que a quantidade do material ({atual.Quantidade}).");

        using var atualizar = Comando(conexao, transacao, """
            UPDATE material SET status_logistico = COALESCE(CAST(@status AS status_logistico_enum), status_logistico),
                                quantidade_utilizada = COALESCE(@utilizada, quantidade_utilizada)
            WHERE id = @id
            """, ("status", status), ("utilizada", quantidadeUtilizada), ("id", id));
        atualizar.ExecuteNonQuery();
        Auditar(conexao, transacao, usuarioId, "AlteracaoMaterial", "material", id, new
        {
            obraId = atual.ObraId,
            statusAnterior = atual.StatusLogistico, statusNovo = status ?? atual.StatusLogistico,
            quantidadeUtilizadaAnterior = atual.QuantidadeUtilizada,
            quantidadeUtilizadaNova = quantidadeUtilizada ?? atual.QuantidadeUtilizada,
        });
        var material = BuscarMaterial(conexao, transacao, id);
        transacao.Commit();
        return material;
    }

    const string SelecionarProduto = "SELECT id, nome, tipo, unidade, preco_unitario, ativo FROM produto";

    static ProdutoBanco LerProduto(NpgsqlDataReader leitor) => new(leitor.GetInt32(0), leitor.GetString(1),
        leitor.GetString(2), leitor.GetString(3), leitor.GetDecimal(4), leitor.GetBoolean(5));

    public List<ProdutoBanco> ListarProdutos(string? nome, string? tipo, bool incluirInativos)
    {
        using var conexao = Abrir();
        var sql = SelecionarProduto + " WHERE (@inativos OR ativo)";
        if (!string.IsNullOrWhiteSpace(nome)) sql += " AND nome ILIKE @nome ESCAPE '\\'";
        if (!string.IsNullOrWhiteSpace(tipo)) sql += " AND lower(tipo) = lower(@tipo)";
        using var comando = Comando(conexao, sql + " ORDER BY nome, id", ("inativos", incluirInativos),
            ("nome", nome is null ? null : $"%{EscaparLike(nome.Trim())}%"), ("tipo", tipo?.Trim()));
        using var leitor = comando.ExecuteReader();
        var itens = new List<ProdutoBanco>();
        while (leitor.Read()) itens.Add(LerProduto(leitor));
        return itens;
    }

    public ProdutoBanco CriarProduto(string nome, string tipo, string unidade, decimal preco, int usuarioId)
    {
        using var conexao = Abrir();
        using var transacao = conexao.BeginTransaction();
        using var inserir = Comando(conexao, transacao, """
            INSERT INTO produto (nome, tipo, unidade, preco_unitario) VALUES (@nome, @tipo, @unidade, @preco)
            RETURNING id, nome, tipo, unidade, preco_unitario, ativo
            """, ("nome", nome), ("tipo", tipo), ("unidade", unidade), ("preco", preco));
        ProdutoBanco produto;
        using (var leitor = inserir.ExecuteReader())
        {
            leitor.Read();
            produto = LerProduto(leitor);
        }
        Auditar(conexao, transacao, usuarioId, "CadastroProduto", "produto", produto.Id, produto);
        transacao.Commit();
        return produto;
    }

    // Campos nulos mantêm o valor atual.
    public ProdutoBanco? EditarProduto(int id, string? nome, string? tipo, string? unidade, decimal? preco, bool? ativo,
        int usuarioId)
    {
        using var conexao = Abrir();
        using var transacao = conexao.BeginTransaction();
        ProdutoBanco? anterior;
        using (var buscar = Comando(conexao, transacao, SelecionarProduto + " WHERE id = @id FOR UPDATE", ("id", id)))
        using (var leitor = buscar.ExecuteReader())
            anterior = leitor.Read() ? LerProduto(leitor) : null;
        if (anterior is null) return null;

        using var atualizar = Comando(conexao, transacao, """
            UPDATE produto SET nome = COALESCE(@nome, nome), tipo = COALESCE(@tipo, tipo),
                               unidade = COALESCE(@unidade, unidade), preco_unitario = COALESCE(@preco, preco_unitario),
                               ativo = COALESCE(@ativo, ativo)
            WHERE id = @id RETURNING id, nome, tipo, unidade, preco_unitario, ativo
            """, ("nome", nome), ("tipo", tipo), ("unidade", unidade), ("preco", preco), ("ativo", ativo), ("id", id));
        ProdutoBanco produto;
        using (var leitor = atualizar.ExecuteReader())
        {
            leitor.Read();
            produto = LerProduto(leitor);
        }
        Auditar(conexao, transacao, usuarioId, "AlteracaoProduto", "produto", id, new { anterior, novo = produto });
        transacao.Commit();
        return produto;
    }
}
