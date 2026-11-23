using Npgsql;

namespace Backend.Api;

public sealed record IntegranteBanco(int UsuarioId, string Nome, DateOnly DataEntrada, DateOnly DataSaida);
// RN-10: alocadas = integrantes, faltantes = previstas − alocadas (mínimo 0), pessoaDia = dias úteis de cada integrante.
public sealed record EquipeTemporalBanco(int PessoasPrevistas, int PessoasAlocadas, int PessoasFaltantes, int PessoaDia,
    List<IntegranteBanco> Integrantes);
public sealed record ProgramacaoBanco(int Id, int ObraId, DateOnly DataInicio, DateOnly DataFim, int Prioridade,
    decimal? DuracaoEstimadaDias, EquipeTemporalBanco Equipe);
public sealed record DeslocamentoBanco(int Id, DateOnly NovaDataInicio, DateOnly NovaDataFim);
public sealed record ReordenacaoBanco(int Id, DateOnly NovaDataInicio, DateOnly NovaDataFim,
    List<DeslocamentoBanco> ProgramacoesAfetadas);

// Regra de negócio violada dentro de uma operação no banco; o controller devolve no formato do contrato.
public sealed class RegraVioladaException(int status, string code, string message) : Exception(message)
{
    public int Status { get; } = status;
    public string Code { get; } = code;
}

// Equipe temporal (RF-07, RF-09): cada programação tem a sua equipe, e o conflito de agenda é por instalador
// (restrição ex_instalador_periodo em equipe_integrante). O banco deriva período e reserva do integrante.
public sealed partial class BancoDados
{
    // Status em que a obra já tem os materiais separados e pode receber equipe (RF-07, UC-13).
    static readonly string[] StatusAptos = ["Separado", "EmAndamento", "Assistencia"];

    const string SelecionarProgramacao = """
        SELECT p.id, p.id_obra, p.data_inicio, p.data_fim, COALESCE(p.prioridade, 1), p.duracao_estimada_dias
        FROM programacao_obra p
        """;

    sealed record LinhaProgramacao(int Id, int ObraId, DateOnly DataInicio, DateOnly DataFim, int Prioridade,
        decimal? DuracaoEstimadaDias);

    static LinhaProgramacao LerLinha(NpgsqlDataReader leitor) => new(leitor.GetInt32(0), leitor.GetInt32(1),
        leitor.GetFieldValue<DateOnly>(2), leitor.GetFieldValue<DateOnly>(3), leitor.GetInt32(4),
        leitor.IsDBNull(5) ? null : leitor.GetDecimal(5));

    static List<LinhaProgramacao> LerLinhas(NpgsqlCommand comando)
    {
        using var leitor = comando.ExecuteReader();
        var itens = new List<LinhaProgramacao>();
        while (leitor.Read()) itens.Add(LerLinha(leitor));
        return itens;
    }

    static Dictionary<int, EquipeTemporalBanco> LerEquipes(NpgsqlConnection conexao, NpgsqlTransaction? transacao,
        int[] programacoes)
    {
        var previstas = new Dictionary<int, int>();
        using (var comando = Comando(conexao, "SELECT id_programacao, pessoas_previstas FROM equipe_temporal WHERE id_programacao = ANY(@ids)",
            ("ids", programacoes)))
        {
            comando.Transaction = transacao;
            using var leitor = comando.ExecuteReader();
            while (leitor.Read()) previstas[leitor.GetInt32(0)] = leitor.GetInt32(1);
        }
        var integrantes = programacoes.ToDictionary(id => id, _ => new List<IntegranteBanco>());
        using (var comando = Comando(conexao, """
            SELECT i.id_programacao, u.id, u.nome, i.data_entrada, i.data_saida
            FROM equipe_integrante i JOIN usuario u ON u.id = i.id_usuario
            WHERE i.id_programacao = ANY(@ids) ORDER BY i.data_entrada, u.nome, u.id
            """, ("ids", programacoes)))
        {
            comando.Transaction = transacao;
            using var leitor = comando.ExecuteReader();
            while (leitor.Read())
                integrantes[leitor.GetInt32(0)].Add(new IntegranteBanco(leitor.GetInt32(1), leitor.GetString(2),
                    leitor.GetFieldValue<DateOnly>(3), leitor.GetFieldValue<DateOnly>(4)));
        }
        return programacoes.ToDictionary(id => id, id =>
        {
            var lista = integrantes[id];
            var prev = previstas.GetValueOrDefault(id);
            return new EquipeTemporalBanco(prev, lista.Count, Math.Max(0, prev - lista.Count),
                lista.Sum(i => Gantt.DiasUteis(i.DataEntrada, i.DataSaida)), lista);
        });
    }

    static List<ProgramacaoBanco> ComEquipes(NpgsqlConnection conexao, NpgsqlTransaction? transacao,
        List<LinhaProgramacao> linhas)
    {
        var equipes = LerEquipes(conexao, transacao, linhas.Select(l => l.Id).ToArray());
        return linhas.Select(l => new ProgramacaoBanco(l.Id, l.ObraId, l.DataInicio, l.DataFim, l.Prioridade,
            l.DuracaoEstimadaDias, equipes[l.Id])).ToList();
    }

    static EquipeTemporalBanco BuscarEquipe(NpgsqlConnection conexao, NpgsqlTransaction? transacao, int programacaoId) =>
        LerEquipes(conexao, transacao, [programacaoId])[programacaoId];

    // Rota 28. instaladorId restringe às programações cujas equipes o instalador integra ou integrou.
    public List<ProgramacaoBanco> ListarProgramacoes(DateOnly? inicio, DateOnly? fim, int? instaladorId)
    {
        using var conexao = Abrir();
        // Obras excluídas logicamente não aparecem no Gantt.
        var sql = SelecionarProgramacao + " JOIN obra o ON o.id = p.id_obra WHERE o.excluida_em IS NULL";
        if (inicio is not null) sql += " AND p.data_fim >= @inicio";
        if (fim is not null) sql += " AND p.data_inicio <= @fim";
        if (instaladorId is not null)
            sql += " AND EXISTS (SELECT 1 FROM equipe_integrante i WHERE i.id_programacao = p.id AND i.id_usuario = @instalador)";
        using var comando = Comando(conexao, sql + " ORDER BY p.data_inicio, p.prioridade, p.id",
            ("inicio", inicio), ("fim", fim), ("instalador", instaladorId));
        return ComEquipes(conexao, null, LerLinhas(comando));
    }

    // Rota 29: programação, equipe e integrantes numa transação; se algum integrante estiver ocupado, nada é gravado.
    public ProgramacaoBanco CriarProgramacao(int obraId, DateOnly inicio, int prioridade, int pessoasPrevistas,
        int[] integrantesIds, int usuarioId)
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
        if (!StatusAptos.Contains(status))
            throw new RegraVioladaException(400, "VALIDATION_ERROR",
                $"A obra {obraId} ainda não está apta para instalação (status atual: {status}). " +
                "Os materiais precisam estar separados (status Separado).");

        var dias = Gantt.DuracaoEmDias(paineis);
        var fim = Gantt.DataFim(inicio, dias);
        GarantirInstaladoresValidos(conexao, transacao, integrantesIds);
        GarantirInstaladoresLivres(conexao, transacao, integrantesIds, inicio, fim, []);

        using var inserir = Comando(conexao, transacao, """
            INSERT INTO programacao_obra (data_inicio, data_fim, prioridade, duracao_estimada_dias, id_obra)
            VALUES (@inicio, @fim, @prioridade, @duracao, @obra) RETURNING id
            """, ("inicio", inicio), ("fim", fim), ("prioridade", prioridade), ("duracao", (decimal)dias), ("obra", obraId));
        var id = (int)inserir.ExecuteScalar()!;
        using var inserirEquipe = Comando(conexao, transacao,
            "INSERT INTO equipe_temporal (id_programacao, pessoas_previstas) VALUES (@programacao, @previstas) RETURNING id",
            ("programacao", id), ("previstas", pessoasPrevistas));
        var equipeId = (int)inserirEquipe.ExecuteScalar()!;
        foreach (var integrante in integrantesIds)
            InserirIntegrante(conexao, transacao, equipeId, integrante, null, null);

        // RF-10: programar a equipe leva o cartão para a coluna de instalação.
        if (status == "Separado")
        {
            using var atualizar = Comando(conexao, transacao,
                "UPDATE obra SET status = 'EmAndamento' WHERE id = @id", ("id", obraId));
            atualizar.ExecuteNonQuery();
            using var inserirHistorico = Comando(conexao, transacao, """
                INSERT INTO historico_obra (tipo_acao, status_anterior, status_novo, observacao, id_obra, id_usuario, data_alteracao)
                VALUES ('MudancaStatus', 'Separado', 'EmAndamento', @observacao, @obra, @usuario, timezone('UTC', now()))
                """, ("observacao", $"Equipe programada de {inicio:yyyy-MM-dd} a {fim:yyyy-MM-dd}."),
                ("obra", obraId), ("usuario", usuarioId));
            inserirHistorico.ExecuteNonQuery();
            Auditar(conexao, transacao, usuarioId, "MudancaStatus", "obra", obraId,
                new { statusAnterior = "Separado", statusNovo = "EmAndamento", programacaoId = id });
        }
        Auditar(conexao, transacao, usuarioId, "AlteracaoEquipe", "programacao_obra", id,
            new { pessoasPrevistas, integrantesIds });
        var equipe = BuscarEquipe(conexao, transacao, id);
        Confirmar(transacao);
        return new ProgramacaoBanco(id, obraId, inicio, fim, prioridade, dias, equipe);
    }

    // Rota 27: sem datas, o integrante cobre o período inteiro (o banco preenche).
    public EquipeTemporalBanco AdicionarIntegrante(int programacaoId, int instaladorId, DateOnly? entrada,
        DateOnly? saida, int usuarioId)
    {
        using var conexao = Abrir();
        using var transacao = conexao.BeginTransaction();
        var (programacao, equipeId) = BuscarProgramacaoParaEquipe(conexao, transacao, programacaoId);
        GarantirInstaladoresValidos(conexao, transacao, [instaladorId]);
        using (var existe = Comando(conexao, transacao,
            "SELECT 1 FROM equipe_integrante WHERE id_equipe = @equipe AND id_usuario = @usuario",
            ("equipe", equipeId), ("usuario", instaladorId)))
            if (existe.ExecuteScalar() is not null)
                throw IntegranteInvalido($"O instalador {instaladorId} já integra a equipe da programação {programacaoId}.");
        var (de, ate) = (entrada ?? programacao.DataInicio, saida ?? programacao.DataFim);
        GarantirPeriodoDoIntegrante(programacao, de, ate);
        GarantirInstaladoresLivres(conexao, transacao, [instaladorId], de, ate, [programacaoId]);
        InserirIntegrante(conexao, transacao, equipeId, instaladorId, de, ate);
        Auditar(conexao, transacao, usuarioId, "AlteracaoEquipe", "programacao_obra", programacaoId,
            new { acao = "IncluirIntegrante", instaladorId, dataEntrada = de, dataSaida = ate });
        var equipe = BuscarEquipe(conexao, transacao, programacaoId);
        Confirmar(transacao);
        return equipe;
    }

    // Rota 27a: datas omitidas mantêm o valor atual.
    public EquipeTemporalBanco AlterarIntegrante(int programacaoId, int instaladorId, DateOnly? entrada,
        DateOnly? saida, int usuarioId)
    {
        using var conexao = Abrir();
        using var transacao = conexao.BeginTransaction();
        var (programacao, equipeId) = BuscarProgramacaoParaEquipe(conexao, transacao, programacaoId);
        var atual = BuscarIntegrante(conexao, transacao, equipeId, programacaoId, instaladorId);
        var (de, ate) = (entrada ?? atual.DataEntrada, saida ?? atual.DataSaida);
        GarantirPeriodoDoIntegrante(programacao, de, ate);
        GarantirInstaladoresLivres(conexao, transacao, [instaladorId], de, ate, [programacaoId]);
        AtualizarDatasIntegrante(conexao, transacao, equipeId, instaladorId, de, ate);
        Auditar(conexao, transacao, usuarioId, "AlteracaoEquipe", "programacao_obra", programacaoId, new
        {
            acao = "AlterarIntegrante", instaladorId,
            dataEntradaAnterior = atual.DataEntrada, dataSaidaAnterior = atual.DataSaida, dataEntrada = de, dataSaida = ate,
        });
        var equipe = BuscarEquipe(conexao, transacao, programacaoId);
        Confirmar(transacao);
        return equipe;
    }

    // Rota 27b: antes da entrada apaga o vínculo; depois dela encerra em dataSaida, preservando os dias trabalhados.
    public EquipeTemporalBanco RemoverIntegrante(int programacaoId, int instaladorId, DateOnly? dataSaida, DateOnly hoje,
        int usuarioId)
    {
        using var conexao = Abrir();
        using var transacao = conexao.BeginTransaction();
        var (_, equipeId) = BuscarProgramacaoParaEquipe(conexao, transacao, programacaoId);
        var atual = BuscarIntegrante(conexao, transacao, equipeId, programacaoId, instaladorId);
        if (hoje < atual.DataEntrada)
        {
            using var apagar = Comando(conexao, transacao,
                "DELETE FROM equipe_integrante WHERE id_equipe = @equipe AND id_usuario = @usuario",
                ("equipe", equipeId), ("usuario", instaladorId));
            apagar.ExecuteNonQuery();
        }
        else
        {
            if (dataSaida is null)
                throw new RegraVioladaException(400, "VALIDATION_ERROR",
                    $"O instalador já entrou na equipe em {atual.DataEntrada:yyyy-MM-dd}. Informe ?dataSaida= para encerrar o vínculo.");
            if (dataSaida < atual.DataEntrada || dataSaida > atual.DataSaida)
                throw new RegraVioladaException(400, "VALIDATION_ERROR",
                    $"dataSaida deve ficar dentro do vínculo atual ({atual.DataEntrada:yyyy-MM-dd} a {atual.DataSaida:yyyy-MM-dd}).");
            AtualizarDatasIntegrante(conexao, transacao, equipeId, instaladorId, atual.DataEntrada, dataSaida.Value);
        }
        Auditar(conexao, transacao, usuarioId, "AlteracaoEquipe", "programacao_obra", programacaoId,
            new { acao = "RemoverIntegrante", instaladorId, dataSaida });
        var equipe = BuscarEquipe(conexao, transacao, programacaoId);
        Confirmar(transacao);
        return equipe;
    }

    // Rota 27c.
    public EquipeTemporalBanco AlterarPessoasPrevistas(int programacaoId, int pessoasPrevistas, int usuarioId)
    {
        using var conexao = Abrir();
        using var transacao = conexao.BeginTransaction();
        BuscarProgramacaoParaEquipe(conexao, transacao, programacaoId);
        var anterior = BuscarEquipe(conexao, transacao, programacaoId).PessoasPrevistas;
        using var atualizar = Comando(conexao, transacao,
            "UPDATE equipe_temporal SET pessoas_previstas = @previstas WHERE id_programacao = @programacao",
            ("previstas", pessoasPrevistas), ("programacao", programacaoId));
        atualizar.ExecuteNonQuery();
        Auditar(conexao, transacao, usuarioId, "AlteracaoEquipe", "programacao_obra", programacaoId,
            new { acao = "AlterarPessoasPrevistas", anterior, pessoasPrevistas });
        var equipe = BuscarEquipe(conexao, transacao, programacaoId);
        Confirmar(transacao);
        return equipe;
    }

    // RF-09 / Q10: desloca a programação e, em cadeia, as seguintes que têm integrantes em comum com alguma já
    // deslocada, na ordem de início e prioridade. Programação e integrantes andam o mesmo número de dias úteis.
    public ReordenacaoBanco? Reordenar(int id, DateOnly novaDataInicio, int usuarioId)
    {
        using var conexao = Abrir();
        using var transacao = conexao.BeginTransaction();
        LinhaProgramacao? alvo;
        using (var buscar = Comando(conexao, transacao, SelecionarProgramacao + """
             JOIN obra o ON o.id = p.id_obra WHERE p.id = @id AND o.excluida_em IS NULL FOR UPDATE OF p
            """, ("id", id)))
            alvo = LerLinhas(buscar).SingleOrDefault();
        if (alvo is null) return null;

        List<LinhaProgramacao> candidatas;
        using (var buscar = Comando(conexao, transacao, SelecionarProgramacao + """
             WHERE p.reserva_agenda AND p.id <> @id AND p.data_inicio >= @inicio
             ORDER BY p.data_inicio, p.prioridade, p.id FOR UPDATE
            """, ("id", id), ("inicio", alvo.DataInicio)))
            candidatas = LerLinhas(buscar);
        var equipes = LerEquipes(conexao, transacao, candidatas.Select(c => c.Id).Append(id).ToArray());
        var ocupados = equipes[id].Integrantes.Select(i => i.UsuarioId).ToHashSet();
        var movidas = new List<LinhaProgramacao> { alvo };
        foreach (var candidata in candidatas)
        {
            var integrantes = equipes[candidata.Id].Integrantes.Select(i => i.UsuarioId).ToList();
            if (!integrantes.Any(ocupados.Contains)) continue;
            movidas.Add(candidata);
            ocupados.UnionWith(integrantes);
        }

        var deslocamento = Gantt.DeslocamentoEmDiasUteis(alvo.DataInicio, novaDataInicio);
        // Cada programação mantém a quantidade de dias úteis que já ocupava.
        var novas = movidas.Select(p =>
        {
            var inicio = Gantt.Deslocar(p.DataInicio, deslocamento);
            return new DeslocamentoBanco(p.Id, inicio, Gantt.DataFim(inicio, Gantt.DiasUteis(p.DataInicio, p.DataFim)));
        }).ToList();
        var ids = novas.Select(n => n.Id).ToArray();
        foreach (var (movida, nova) in movidas.Zip(novas))
            foreach (var integrante in equipes[movida.Id].Integrantes)
            {
                var (entrada, saida) = NovoVinculo(integrante, movida, nova, deslocamento);
                GarantirInstaladoresLivres(conexao, transacao, [integrante.UsuarioId], entrada, saida, ids);
            }

        // O deslocamento em cadeia cruza períodos de outras programações movidas: a sobreposição de integrantes
        // é conferida no fim da transação. A restrição legada por equipe fixa não é adiável, então quem anda
        // na direção do movimento é atualizado primeiro.
        using (var adiar = Comando(conexao, transacao, "SET CONSTRAINTS ex_instalador_periodo DEFERRED"))
            adiar.ExecuteNonQuery();
        foreach (var (movida, nova) in (deslocamento > 0 ? movidas.Zip(novas).Reverse() : movidas.Zip(novas)).ToList())
        {
            using var atualizar = Comando(conexao, transacao,
                "UPDATE programacao_obra SET data_inicio = @inicio, data_fim = @fim WHERE id = @id",
                ("inicio", nova.NovaDataInicio), ("fim", nova.NovaDataFim), ("id", nova.Id));
            atualizar.ExecuteNonQuery();
            // Todo integrante é atualizado: além das datas, o banco renova o período de referência dele.
            foreach (var integrante in equipes[movida.Id].Integrantes)
            {
                var (entrada, saida) = NovoVinculo(integrante, movida, nova, deslocamento);
                AtualizarDatasIntegrante(conexao, transacao, null, integrante.UsuarioId, entrada, saida, nova.Id);
            }
        }
        Auditar(conexao, transacao, usuarioId, "Reordenacao", "programacao_obra", id,
            new { deslocamentoDiasUteis = deslocamento, programacoes = novas });
        Confirmar(transacao);
        var afetadas = novas.Skip(1).Zip(movidas.Skip(1))
            .Where(par => par.First.NovaDataInicio != par.Second.DataInicio || par.First.NovaDataFim != par.Second.DataFim)
            .Select(par => par.First).ToList();
        return new ReordenacaoBanco(id, novas[0].NovaDataInicio, novas[0].NovaDataFim, afetadas);
    }

    // Quem cobria o período inteiro acompanha o novo período; vínculo parcial anda os mesmos dias úteis e fica
    // dentro do novo período (o seed tem programações que terminam em fim de semana).
    static (DateOnly Entrada, DateOnly Saida) NovoVinculo(IntegranteBanco integrante, LinhaProgramacao antiga,
        DeslocamentoBanco nova, int deslocamento)
    {
        if (integrante.DataEntrada == antiga.DataInicio && integrante.DataSaida == antiga.DataFim)
            return (nova.NovaDataInicio, nova.NovaDataFim);
        var entrada = Clamp(Gantt.Deslocar(integrante.DataEntrada, deslocamento), nova);
        var saida = Clamp(Gantt.Deslocar(integrante.DataSaida, deslocamento), nova);
        return (entrada, saida < entrada ? entrada : saida);
    }

    static DateOnly Clamp(DateOnly data, DeslocamentoBanco periodo) =>
        data < periodo.NovaDataInicio ? periodo.NovaDataInicio : data > periodo.NovaDataFim ? periodo.NovaDataFim : data;

    (LinhaProgramacao Programacao, int EquipeId) BuscarProgramacaoParaEquipe(NpgsqlConnection conexao,
        NpgsqlTransaction transacao, int programacaoId)
    {
        using var buscar = Comando(conexao, transacao, """
            SELECT p.id, p.id_obra, p.data_inicio, p.data_fim, COALESCE(p.prioridade, 1), p.duracao_estimada_dias, e.id
            FROM programacao_obra p JOIN equipe_temporal e ON e.id_programacao = p.id
            JOIN obra o ON o.id = p.id_obra
            WHERE p.id = @id AND o.excluida_em IS NULL FOR UPDATE OF p, e
            """, ("id", programacaoId));
        using var leitor = buscar.ExecuteReader();
        if (!leitor.Read())
            throw new RegraVioladaException(404, "PROGRAMACAO_NOT_FOUND", $"Programação {programacaoId} não encontrada.");
        return (LerLinha(leitor), leitor.GetInt32(6));
    }

    static IntegranteBanco BuscarIntegrante(NpgsqlConnection conexao, NpgsqlTransaction transacao, int equipeId,
        int programacaoId, int instaladorId)
    {
        using var buscar = Comando(conexao, transacao, """
            SELECT u.id, u.nome, i.data_entrada, i.data_saida FROM equipe_integrante i JOIN usuario u ON u.id = i.id_usuario
            WHERE i.id_equipe = @equipe AND i.id_usuario = @usuario FOR UPDATE OF i
            """, ("equipe", equipeId), ("usuario", instaladorId));
        using var leitor = buscar.ExecuteReader();
        return leitor.Read()
            ? new IntegranteBanco(leitor.GetInt32(0), leitor.GetString(1), leitor.GetFieldValue<DateOnly>(2), leitor.GetFieldValue<DateOnly>(3))
            : throw new RegraVioladaException(404, "INTEGRANTE_NOT_FOUND",
                $"O usuário {instaladorId} não integra a equipe da programação {programacaoId}.");
    }

    static void InserirIntegrante(NpgsqlConnection conexao, NpgsqlTransaction transacao, int equipeId, int instaladorId,
        DateOnly? entrada, DateOnly? saida)
    {
        using var inserir = Comando(conexao, transacao, """
            INSERT INTO equipe_integrante (id_equipe, id_usuario, data_entrada, data_saida)
            VALUES (@equipe, @usuario, @entrada, @saida)
            """, ("equipe", equipeId), ("usuario", instaladorId), ("entrada", entrada), ("saida", saida));
        Executar(inserir);
    }

    // Identifica o vínculo pela equipe ou, na reordenação, pela programação.
    static void AtualizarDatasIntegrante(NpgsqlConnection conexao, NpgsqlTransaction transacao, int? equipeId,
        int instaladorId, DateOnly entrada, DateOnly saida, int? programacaoId = null)
    {
        using var atualizar = Comando(conexao, transacao, """
            UPDATE equipe_integrante SET data_entrada = @entrada, data_saida = @saida
            WHERE id_usuario = @usuario AND (id_equipe = @equipe OR id_programacao = @programacao)
            """, ("entrada", entrada), ("saida", saida), ("usuario", instaladorId), ("equipe", equipeId),
            ("programacao", programacaoId));
        Executar(atualizar);
    }

    static void GarantirPeriodoDoIntegrante(LinhaProgramacao programacao, DateOnly entrada, DateOnly saida)
    {
        if (saida < entrada)
            throw IntegranteInvalido("dataSaida não pode ser anterior a dataEntrada.");
        if (entrada < programacao.DataInicio || saida > programacao.DataFim)
            throw IntegranteInvalido($"As datas do integrante precisam ficar dentro do período da programação " +
                $"({programacao.DataInicio:yyyy-MM-dd} a {programacao.DataFim:yyyy-MM-dd}).");
    }

    // 404 para usuário inexistente; 400 para inativo ou sem perfil InstaladorCampo (o banco confere de novo no INSERT).
    static void GarantirInstaladoresValidos(NpgsqlConnection conexao, NpgsqlTransaction transacao, int[] usuarios)
    {
        if (usuarios.Length == 0) return;
        var encontrados = new HashSet<int>();
        using var buscar = Comando(conexao, transacao, """
            SELECT u.id, u.nome, u.ativo AND p.nome_perfil::text = @perfil
            FROM usuario u JOIN perfil_acesso p ON p.id = u.id_perfil WHERE u.id = ANY(@ids) ORDER BY u.id
            """, ("perfil", Perfis.Instalador), ("ids", usuarios));
        using (var leitor = buscar.ExecuteReader())
            while (leitor.Read())
            {
                if (!leitor.GetBoolean(2))
                    throw IntegranteInvalido($"{leitor.GetString(1)} (usuário {leitor.GetInt32(0)}) precisa ser um instalador de campo ativo.");
                encontrados.Add(leitor.GetInt32(0));
            }
        var faltando = usuarios.FirstOrDefault(u => !encontrados.Contains(u));
        if (faltando != 0)
            throw new RegraVioladaException(404, "USUARIO_NOT_FOUND", $"Usuário {faltando} não encontrado.");
    }

    // RF-07: um instalador não pode estar em duas equipes com períodos sobrepostos. Confere antes para dar uma
    // mensagem com instalador, obra e período; a restrição do banco cobre gravações concorrentes.
    static void GarantirInstaladoresLivres(NpgsqlConnection conexao, NpgsqlTransaction transacao, int[] usuarios,
        DateOnly inicio, DateOnly fim, int[] ignorar)
    {
        if (usuarios.Length == 0) return;
        using var comando = Comando(conexao, transacao, """
            SELECT u.nome, p.id_obra, i.data_entrada, i.data_saida
            FROM equipe_integrante i JOIN usuario u ON u.id = i.id_usuario JOIN programacao_obra p ON p.id = i.id_programacao
            WHERE i.id_usuario = ANY(@usuarios) AND i.reserva_agenda AND i.data_entrada <= @fim AND i.data_saida >= @inicio
              AND NOT (i.id_programacao = ANY(@ignorar))
            ORDER BY i.data_entrada LIMIT 1
            """, ("usuarios", usuarios), ("inicio", inicio), ("fim", fim), ("ignorar", ignorar));
        using var leitor = comando.ExecuteReader();
        if (leitor.Read())
            throw new RegraVioladaException(409, "SCHEDULE_CONFLICT",
                $"{leitor.GetString(0)} já está na equipe da obra {leitor.GetInt32(1)} de " +
                $"{leitor.GetFieldValue<DateOnly>(2):yyyy-MM-dd} a {leitor.GetFieldValue<DateOnly>(3):yyyy-MM-dd}. " +
                $"O período pedido vai de {inicio:yyyy-MM-dd} a {fim:yyyy-MM-dd}.");
    }

    static RegraVioladaException IntegranteInvalido(string mensagem) => new(400, "INTEGRANTE_INVALIDO", mensagem);

    static void Executar(NpgsqlCommand comando)
    {
        try { comando.ExecuteNonQuery(); }
        catch (PostgresException erro) when (Traduzir(erro) is { } regra) { throw regra; }
    }

    // Restrições conferidas no COMMIT (sobreposição adiada, período de referência) também viram erro do contrato.
    static void Confirmar(NpgsqlTransaction transacao)
    {
        try { transacao.Commit(); }
        catch (PostgresException erro) when (Traduzir(erro) is { } regra) { throw regra; }
    }

    static RegraVioladaException? Traduzir(PostgresException erro) => erro switch
    {
        { SqlState: PostgresErrorCodes.ExclusionViolation, ConstraintName: "ex_instalador_periodo" } =>
            new(409, "SCHEDULE_CONFLICT", "Um dos instaladores já está em outra equipe no período pedido."),
        { ConstraintName: "ck_integrante_instalador_ativo" } =>
            IntegranteInvalido("O integrante precisa ser um instalador de campo ativo."),
        { ConstraintName: "ck_integrante_periodo" or "fk_integrante_periodo" } =>
            IntegranteInvalido("As datas do integrante precisam ficar dentro do período da programação."),
        { ConstraintName: "uq_equipe_integrante" } => IntegranteInvalido("O instalador já integra esta equipe."),
        _ => null,
    };
}
