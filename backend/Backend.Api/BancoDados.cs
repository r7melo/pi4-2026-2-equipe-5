using Npgsql;

namespace Backend.Api;

public sealed record UsuarioBanco(int Id, string Nome, string Email, string SenhaHash,
    int PerfilId, int? EquipeId, string NomePerfil, string Permissoes);
public sealed record ClienteBanco(int Id, string Nome, string? Cidade);
public sealed record PagamentoBanco(int Id, DateOnly? DataConfirmacao, int PrazoContratualDias);
public sealed record ObraBanco(int Id, string Status, string? Categoria, int QuantidadePaineis,
    DateOnly? DataInicioEstimada, DateOnly? DataFimEstimada, DateOnly? DataInicioReal,
    DateOnly? DataFimReal, int ClienteId, ClienteBanco Cliente, PagamentoBanco Pagamento);
public sealed record ObraListaBanco(int Id, string Status, string ClienteNome, string? Categoria,
    int QuantidadePaineis, DateOnly? DataFimEstimada);
public sealed record ListaObrasBanco(int Page, int PageSize, long Total, List<ObraListaBanco> Itens);
public sealed record ObraCriadaBanco(int Id, string Status, int ClienteId,
    DateOnly? DataInicioEstimada, DateOnly? DataFimEstimada, DateOnly? DataInicioReal,
    DateOnly? DataFimReal, DateTime CriadoEm);
public sealed record MovimentoBanco(int Id, string StatusAnterior, string StatusNovo,
    DateTime DataAlteracao, bool EmailNotificacaoEnviado, bool Alterado, string[] Permitidos);
public sealed record MaterialBanco(int Id, string Tipo, int Quantidade, string? StatusLogistico, int ObraId);
public sealed record AutorBanco(int Id, string Nome);
public sealed record HistoricoBanco(long Id, int ObraId, string? StatusAnterior, string? StatusNovo,
    DateTime DataAlteracao, string? Observacao, AutorBanco Usuario);

public sealed partial class BancoDados(string connectionString)
{
    // Uma conexão é aberta para cada operação e fechada pelo using do chamador.
    NpgsqlConnection Abrir()
    {
        var conexao = new NpgsqlConnection(connectionString);
        conexao.Open();
        return conexao;
    }

    static NpgsqlCommand Comando(NpgsqlConnection conexao, string sql, params (string Nome, object? Valor)[] parametros)
    {
        var comando = new NpgsqlCommand(sql, conexao);
        foreach (var (nome, valor) in parametros)
            comando.Parameters.AddWithValue(nome, valor ?? DBNull.Value);
        return comando;
    }

    static NpgsqlCommand Comando(NpgsqlConnection conexao, NpgsqlTransaction transacao, string sql,
        params (string Nome, object? Valor)[] parametros)
    {
        var comando = Comando(conexao, sql, parametros);
        comando.Transaction = transacao;
        return comando;
    }

    static DateOnly? Data(NpgsqlDataReader leitor, int coluna) =>
        leitor.IsDBNull(coluna) ? null : leitor.GetFieldValue<DateOnly>(coluna);

    static DateTime InstanteUtc(NpgsqlDataReader leitor, int coluna) =>
        DateTime.SpecifyKind(leitor.GetDateTime(coluna), DateTimeKind.Utc);

    public UsuarioBanco? BuscarUsuarioPorEmail(string email)
    {
        using var conexao = Abrir();
        using var comando = Comando(conexao, """
            SELECT u.id, u.nome, u.email, u.senha, u.id_perfil, u.id_equipe,
                   p.nome_perfil::text, p.permissoes
            FROM usuario u JOIN perfil_acesso p ON p.id = u.id_perfil
            WHERE lower(u.email) = lower(@email)
            """, ("email", email));
        using var leitor = comando.ExecuteReader();
        return leitor.Read() ? LerUsuario(leitor) : null;
    }

    public UsuarioBanco? BuscarUsuarioPorId(int id)
    {
        using var conexao = Abrir();
        using var comando = Comando(conexao, """
            SELECT u.id, u.nome, u.email, u.senha, u.id_perfil, u.id_equipe,
                   p.nome_perfil::text, p.permissoes
            FROM usuario u JOIN perfil_acesso p ON p.id = u.id_perfil
            WHERE u.id = @id
            """, ("id", id));
        using var leitor = comando.ExecuteReader();
        return leitor.Read() ? LerUsuario(leitor) : null;
    }

    static UsuarioBanco LerUsuario(NpgsqlDataReader leitor) => new(
        leitor.GetInt32(0), leitor.GetString(1), leitor.GetString(2), leitor.GetString(3),
        leitor.GetInt32(4), leitor.IsDBNull(5) ? null : leitor.GetInt32(5),
        leitor.GetString(6), leitor.IsDBNull(7) ? "" : leitor.GetString(7));

    public ObraBanco? BuscarObra(int id)
    {
        using var conexao = Abrir();
        using var comando = Comando(conexao, """
            SELECT o.id, o.status::text, o.categoria, o.quantidade_paineis,
                   o.data_inicio_estimada, o.data_fim_estimada, o.data_inicio_real, o.data_fim_real,
                   o.id_cliente, c.nome, c.cidade, p.id, p.data_confirmacao, p.prazo_contratual_dias
            FROM obra o JOIN cliente c ON c.id = o.id_cliente
            JOIN pagamento p ON p.id_obra = o.id
            WHERE o.id = @id AND o.excluida_em IS NULL
            """, ("id", id));
        using var leitor = comando.ExecuteReader();
        return leitor.Read() ? LerObra(leitor) : null;
    }

    static ObraBanco LerObra(NpgsqlDataReader leitor) => new(
        leitor.GetInt32(0), leitor.GetString(1), leitor.IsDBNull(2) ? null : leitor.GetString(2),
        leitor.GetInt32(3), Data(leitor, 4), Data(leitor, 5), Data(leitor, 6), Data(leitor, 7),
        leitor.GetInt32(8),
        new ClienteBanco(leitor.GetInt32(8), leitor.GetString(9), leitor.IsDBNull(10) ? null : leitor.GetString(10)),
        new PagamentoBanco(leitor.GetInt32(11), Data(leitor, 12), leitor.GetInt32(13)));

    public ListaObrasBanco ListarObras(string? status, string? clienteNome, int page, int pageSize)
    {
        using var conexao = Abrir();
        // Obras excluídas logicamente não aparecem nas consultas da API.
        var filtro = " FROM obra o JOIN cliente c ON c.id = o.id_cliente WHERE o.excluida_em IS NULL";
        if (status is not null) filtro += " AND o.status = CAST(@status AS status_obra_enum)";
        if (!string.IsNullOrWhiteSpace(clienteNome)) filtro += " AND c.nome ILIKE @nome ESCAPE '\\'";

        using var contagem = Comando(conexao, "SELECT count(*)" + filtro,
            ("status", status), ("nome", clienteNome is null ? null : $"%{EscaparLike(clienteNome.Trim())}%"));
        var total = (long)(contagem.ExecuteScalar() ?? 0L);
        using var comando = Comando(conexao, """
            SELECT o.id, o.status::text, c.nome, o.categoria, o.quantidade_paineis,
                   o.data_fim_estimada
            """ + filtro + " ORDER BY o.id LIMIT @limite OFFSET @inicio",
            ("status", status), ("nome", clienteNome is null ? null : $"%{EscaparLike(clienteNome.Trim())}%"),
            ("limite", pageSize), ("inicio", (long)(page - 1) * pageSize));
        using var leitor = comando.ExecuteReader();
        var itens = new List<ObraListaBanco>();
        while (leitor.Read())
            itens.Add(new ObraListaBanco(leitor.GetInt32(0), leitor.GetString(1), leitor.GetString(2),
                leitor.IsDBNull(3) ? null : leitor.GetString(3), leitor.GetInt32(4), Data(leitor, 5)));
        return new ListaObrasBanco(page, pageSize, total, itens);
    }

    static string EscaparLike(string texto) => texto.Replace("\\", "\\\\").Replace("%", "\\%").Replace("_", "\\_");

    public ObraCriadaBanco CriarObra(int? clienteId, string? clienteNome, string? cidade,
        string? cpfCnpj, string endereco, int quantidadePaineis, DateOnly? inicio, DateOnly? fim,
        DateOnly dataConfirmacao, int prazo, int usuarioId)
    {
        using var conexao = Abrir();
        // Cliente, obra, pagamento e histórico precisam ser persistidos como uma única operação.
        using var transacao = conexao.BeginTransaction();
        int? clienteExistente = null;
        if (clienteId is int id)
        {
            using var busca = Comando(conexao, transacao, "SELECT id FROM cliente WHERE id = @id", ("id", id));
            clienteExistente = busca.ExecuteScalar() as int?;
        }
        if (clienteExistente is null)
        {
            if (string.IsNullOrWhiteSpace(clienteNome))
                throw new ArgumentException("Informe o clienteId de um cliente existente ou o clienteNome para cadastrar um novo cliente.");
            using var inserirCliente = Comando(conexao, transacao,
                "INSERT INTO cliente (nome, cidade, cpf_cnpj) VALUES (@nome, @cidade, @cpf) RETURNING id",
                ("nome", clienteNome.Trim()), ("cidade", cidade?.Trim()), ("cpf", cpfCnpj));
            clienteExistente = (int)inserirCliente.ExecuteScalar()!;
        }

        using var inserirObra = Comando(conexao, transacao, """
            INSERT INTO obra (quantidade_paineis, endereco, data_inicio_estimada, data_fim_estimada, id_cliente)
            VALUES (@quantidade, @endereco, @inicio, @fim, @cliente) RETURNING id, status::text
            """, ("quantidade", quantidadePaineis), ("endereco", endereco),
            ("inicio", inicio), ("fim", fim), ("cliente", clienteExistente));
        int obraId;
        string status;
        using (var leitor = inserirObra.ExecuteReader())
        {
            leitor.Read();
            obraId = leitor.GetInt32(0);
            status = leitor.GetString(1);
        }
        using var inserirPagamento = Comando(conexao, transacao, """
            INSERT INTO pagamento (data_confirmacao, prazo_contratual_dias, id_obra)
            VALUES (@confirmacao, @prazo, @obra)
            """, ("confirmacao", dataConfirmacao), ("prazo", prazo), ("obra", obraId));
        inserirPagamento.ExecuteNonQuery();
        using var inserirHistorico = Comando(conexao, transacao, """
            INSERT INTO historico_obra (tipo_acao, status_novo, observacao, id_obra, id_usuario, data_alteracao)
            VALUES ('Cadastro', @status, 'Obra criada no sistema.', @obra, @usuario, timezone('UTC', now()))
            RETURNING data_alteracao
            """, ("status", status), ("obra", obraId), ("usuario", usuarioId));
        DateTime criadoEm;
        using (var leitor = inserirHistorico.ExecuteReader())
        {
            leitor.Read();
            criadoEm = InstanteUtc(leitor, 0);
        }
        transacao.Commit();
        return new ObraCriadaBanco(obraId, status, clienteExistente.Value, inicio, fim, null, null, criadoEm);
    }

    public ObraBanco? EditarObra(int id, string? cidade, DateOnly? inicio, DateOnly? fim, int? prazo)
    {
        using var conexao = Abrir();
        using var transacao = conexao.BeginTransaction();
        using var atualizar = Comando(conexao, transacao, """
            UPDATE obra SET data_inicio_estimada = COALESCE(@inicio, data_inicio_estimada),
                           data_fim_estimada = COALESCE(@fim, data_fim_estimada)
            WHERE id = @id AND excluida_em IS NULL RETURNING id_cliente
            """, ("inicio", inicio), ("fim", fim), ("id", id));
        var clienteId = atualizar.ExecuteScalar() as int?;
        if (clienteId is null) return null;
        if (cidade is not null)
        {
            using var atualizarCliente = Comando(conexao, transacao,
                "UPDATE cliente SET cidade = @cidade WHERE id = @id",
                ("cidade", cidade.Trim()), ("id", clienteId));
            atualizarCliente.ExecuteNonQuery();
        }
        if (prazo is int dias)
        {
            using var atualizarPagamento = Comando(conexao, transacao,
                "UPDATE pagamento SET prazo_contratual_dias = @prazo WHERE id_obra = @obra",
                ("prazo", dias), ("obra", id));
            atualizarPagamento.ExecuteNonQuery();
        }
        transacao.Commit();
        return BuscarObra(id);
    }

    public MovimentoBanco? MoverStatus(int id, string novo, string? observacao, int usuarioId)
    {
        using var conexao = Abrir();
        using var transacao = conexao.BeginTransaction();
        // Impede duas atualizações simultâneas de avaliarem o mesmo status anterior.
        using var buscar = Comando(conexao, transacao,
            "SELECT status::text FROM obra WHERE id = @id AND excluida_em IS NULL FOR UPDATE", ("id", id));
        var anterior = buscar.ExecuteScalar() as string;
        if (anterior is null) return null;
        var permitidos = RegrasBase.Transicoes[anterior];
        if (!permitidos.Contains(novo))
            return new MovimentoBanco(id, anterior, novo, default, false, false, permitidos);

        using var atualizar = Comando(conexao, transacao,
            "UPDATE obra SET status = CAST(@status AS status_obra_enum) WHERE id = @id",
            ("status", novo), ("id", id));
        atualizar.ExecuteNonQuery();
        using var inserirHistorico = Comando(conexao, transacao, """
            INSERT INTO historico_obra (tipo_acao, status_anterior, status_novo, observacao, id_obra, id_usuario, data_alteracao)
            VALUES ('MudancaStatus', @anterior, @novo, @observacao, @obra, @usuario, timezone('UTC', now()))
            RETURNING data_alteracao
            """, ("anterior", anterior), ("novo", novo), ("observacao", observacao),
            ("obra", id), ("usuario", usuarioId));
        DateTime dataAlteracao;
        using (var leitor = inserirHistorico.ExecuteReader())
        {
            leitor.Read();
            dataAlteracao = InstanteUtc(leitor, 0);
        }
        transacao.Commit();
        return new MovimentoBanco(id, anterior, novo, dataAlteracao, false, true, permitidos);
    }

    public List<MaterialBanco> ListarMateriais(int obraId)
    {
        using var conexao = Abrir();
        using var comando = Comando(conexao, """
            SELECT id, tipo, quantidade, status_logistico::text, id_obra
            FROM material WHERE id_obra = @obra ORDER BY id
            """, ("obra", obraId));
        using var leitor = comando.ExecuteReader();
        var itens = new List<MaterialBanco>();
        while (leitor.Read())
            itens.Add(new MaterialBanco(leitor.GetInt32(0), leitor.GetString(1), leitor.GetInt32(2),
                leitor.IsDBNull(3) ? null : leitor.GetString(3), leitor.GetInt32(4)));
        return itens;
    }

    public MaterialBanco CriarMaterial(int obraId, string tipo, int quantidade, string? status)
    {
        using var conexao = Abrir();
        using var comando = Comando(conexao, """
            INSERT INTO material (tipo, quantidade, status_logistico, id_obra)
            VALUES (@tipo, @quantidade, CAST(@status AS status_logistico_enum), @obra)
            RETURNING id
            """, ("tipo", tipo), ("quantidade", quantidade), ("status", status), ("obra", obraId));
        var id = (int)comando.ExecuteScalar()!;
        return new MaterialBanco(id, tipo, quantidade, status, obraId);
    }

    public List<HistoricoBanco> ListarHistorico(int obraId)
    {
        using var conexao = Abrir();
        using var comando = Comando(conexao, """
            SELECT h.id, h.id_obra, h.status_anterior, h.status_novo, h.data_alteracao,
                   h.observacao, u.id, u.nome
            FROM historico_obra h JOIN usuario u ON u.id = h.id_usuario
            WHERE h.id_obra = @obra ORDER BY h.data_alteracao DESC, h.id DESC
            """, ("obra", obraId));
        using var leitor = comando.ExecuteReader();
        var itens = new List<HistoricoBanco>();
        while (leitor.Read())
            itens.Add(new HistoricoBanco(leitor.GetInt64(0), leitor.GetInt32(1),
                leitor.IsDBNull(2) ? null : leitor.GetString(2), leitor.IsDBNull(3) ? null : leitor.GetString(3),
                InstanteUtc(leitor, 4), leitor.IsDBNull(5) ? null : leitor.GetString(5),
                new AutorBanco(leitor.GetInt32(6), leitor.GetString(7))));
        return itens;
    }
}
