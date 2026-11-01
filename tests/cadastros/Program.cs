using Backend.Api;
using Npgsql;

var admin = Environment.GetEnvironmentVariable("CADASTROS_TEST_ADMIN_CONNECTION")
    ?? throw new InvalidOperationException("Defina CADASTROS_TEST_ADMIN_CONNECTION para PostgreSQL de testes com CREATE DATABASE.");
var schema = await File.ReadAllTextAsync(Path.Combine("database", "01_schema.sql"));
var seed = await File.ReadAllTextAsync(Path.Combine("database", "02_seed.sql"));
var passed = 0;
var failed = 0;

await Case("Cliente completo: mascara, campos opcionais e consulta independente", () => Database(async (connection, banco) =>
{
    var criado = banco.CriarCliente(new ClienteNovoBanco("  D'Avila; DROP TABLE cliente; --  ", "529.982.247-25",
        " Fortaleza ", " Rua A, 15 ", " 85999990000 ", " contato@example.com ", " Contrato teste "));
    Check(criado.Nome == "D'Avila; DROP TABLE cliente; --" && criado.CpfCnpj == "52998224725", "Nome/documento nao normalizados.");
    Check(criado.Cidade == "Fortaleza" && criado.Endereco == "Rua A, 15" && criado.Telefone == "85999990000" && criado.Email == "contato@example.com", "Campos opcionais incorretos.");
    Check(banco.BuscarCliente(criado.Id) == criado && banco.BuscarCliente(int.MaxValue) is null, "Busca individual incorreta.");
    Check(await Scalar<string>(connection, $"SELECT dados_contrato FROM cliente WHERE id = {criado.Id}") == "Contrato teste", "Contrato nao persistiu.");
    Check(await Scalar<long>(connection, "SELECT count(*) FROM obra") == 10, "Cadastro independente criou obra.");
}));

await Case("Clientes: busca textual literal, campos nulos e paginacao", () => Database((connection, banco) =>
{
    var literal = banco.CriarCliente(Cliente("%_Alvo", "52998224725") with { Cidade = "  " });
    banco.CriarCliente(Cliente("XXAlvo", "11144477735"));
    Check(literal.Cidade is null && literal.Email is null, "Campos opcionais vazios nao viraram NULL.");
    var encontrados = banco.ListarClientes("%_");
    Check(encontrados.Total == 1 && encontrados.Itens.Single().Id == literal.Id, "Curingas do usuario foram interpretados como SQL LIKE.");
    Check(banco.ListarClientes("xxalvo").Total == 1, "Filtro nao e case-insensitive.");
    var pagina = banco.ListarClientes(null, 2, 7);
    Check(pagina.Total == 12 && pagina.Itens.Count == 5 && pagina.Page == 2 && pagina.PageSize == 7, "Paginacao incorreta.");
    Check(banco.ListarClientes(null, int.MaxValue, int.MaxValue).Itens.Count == 0, "Offset grande transbordou.");
    Rule(() => banco.ListarClientes(null, 0, 20), 400, "INVALID_PARAMETER");
    Rule(() => banco.ListarClientes(null, 1, 0), 400, "INVALID_PARAMETER");
    Rule(() => banco.ListarClientes("a\0b"), 400, "VALIDATION_ERROR");
    return Task.CompletedTask;
}));

await Case("Cliente invalido e rejeitado antes de persistir", () => Database(async (connection, banco) =>
{
    var before = await Scalar<long>(connection, "SELECT count(*) FROM cliente");
    var valid = Cliente("Nome Valido", "52998224725");
    Rule(() => banco.CriarCliente(null), 400, "VALIDATION_ERROR");
    foreach (var entrada in new[] {
        valid with { Nome = " " }, valid with { Nome = new string('a', 201) }, valid with { Nome = "nome\0invalido" },
        valid with { CpfCnpj = "" }, valid with { CpfCnpj = "00000000000" }, valid with { CpfCnpj = "52998224724" },
        valid with { CpfCnpj = "a52998224725" }, valid with { Cidade = new string('a', 101) },
        valid with { Endereco = new string('a', 256) }, valid with { Telefone = new string('1', 31) },
        valid with { Email = "invalido" }, valid with { Email = new string('a', 201) }, valid with { DadosContrato = "a\0b" } })
        Rule(() => banco.CriarCliente(entrada), 400, "VALIDATION_ERROR");
    Check(before == await Scalar<long>(connection, "SELECT count(*) FROM cliente"), "Validacao deixou cliente parcial.");
}));

await Case("CPF/CNPJ duplicado e concorrente depende da constraint real", () => Database(async (connection, banco) =>
{
    Rule(() => banco.CriarCliente(Cliente("Duplicado", "12.345.678/0001-95")), 409, "CPF_CNPJ_ALREADY_EXISTS");
    using var barrier = new Barrier(2);
    var results = await Task.WhenAll(Enumerable.Range(0, 2).Select(i => Task.Run(() =>
    {
        if (!barrier.SignalAndWait(TimeSpan.FromSeconds(15))) throw new InvalidOperationException("Barreira expirou.");
        try { banco.CriarCliente(Cliente("Concorrente " + i, "52998224725")); return "criado"; }
        catch (RegraVioladaException e) when (e.Status == 409 && e.Code == "CPF_CNPJ_ALREADY_EXISTS") { return "duplicado"; }
    })));
    Check(results.Count(r => r == "criado") == 1 && results.Count(r => r == "duplicado") == 1, "Duplicidade concorrente incorreta.");
    Check(await Scalar<long>(connection, "SELECT count(*) FROM cliente WHERE cpf_cnpj = '52998224725'") == 1, "Dois clientes com mesmo documento persistiram.");
    await Sql(connection, "CREATE UNIQUE INDEX cliente_nome_teste ON cliente(nome)");
    try { banco.CriarCliente(Cliente("Rede Alfa Supermercados", "11144477735")); throw new InvalidOperationException("Constraint alheia nao foi exercitada."); }
    catch (PostgresException e) when (e.ConstraintName == "cliente_nome_teste" && e.SqlState == "23505") { }
}));

await Case("Equipe nova grava responsavel, membros e vinculo singular", () => Database(async (connection, banco) =>
{
    var primeiro = await InstaladorLivre(connection);
    var segundo = await InstaladorLivre(connection);
    var equipe = banco.CriarEquipe("  Equipe D'Avila  ", "  Solar  ", segundo, [segundo, primeiro]);
    Check(equipe.Nome == "Equipe D'Avila" && equipe.Especialidade == "Solar" && equipe.Responsavel.Id == segundo && equipe.Ocupada is null, "Equipe retornada incorreta.");
    Check(equipe.Instaladores.Select(u => u.Id).SequenceEqual(new[] { primeiro, segundo }), "Membros incorretos.");
    var consulta = banco.ListarEquipes(null, null).Single(e => e.Id == equipe.Id);
    Check(consulta.Responsavel.Id == segundo && consulta.Instaladores.Count == 2, "Consulta existente incompativel.");
    Check(await Scalar<long>(connection, $"SELECT count(*) FROM usuario WHERE id IN ({primeiro},{segundo}) AND id_equipe = {equipe.Id}") == 2, "usuario.id_equipe diverge da associacao.");
    Check(await Scalar<long>(connection, $"SELECT count(*) FROM equipe_instalador WHERE id_equipe = {equipe.Id}") == 2, "Associacoes ausentes.");
}));

await Case("Equipe invalida, usuario inexistente ou perfil errado nao persistem", () => Database(async (connection, banco) =>
{
    var livre = await InstaladorLivre(connection);
    var inativo = await InstaladorLivre(connection);
    await Sql(connection, $"UPDATE usuario SET ativo = FALSE WHERE id = {inativo}");
    var before = await Snapshot(connection);
    Rule(() => banco.CriarEquipe("Nome", null, livre, null), 400, "VALIDATION_ERROR");
    Rule(() => banco.CriarEquipe("Nome", null, livre, []), 400, "VALIDATION_ERROR");
    Rule(() => banco.CriarEquipe("Nome", null, livre, [livre, livre]), 400, "VALIDATION_ERROR");
    Rule(() => banco.CriarEquipe("Nome", null, livre, [0, livre]), 400, "VALIDATION_ERROR");
    Rule(() => banco.CriarEquipe("Nome", null, 0, [livre]), 400, "VALIDATION_ERROR");
    Rule(() => banco.CriarEquipe("Nome", null, livre, [int.MaxValue]), 400, "VALIDATION_ERROR");
    Rule(() => banco.CriarEquipe("Nome", null, int.MaxValue, [int.MaxValue]), 404, "USUARIO_NOT_FOUND");
    Rule(() => banco.CriarEquipe("Nome", null, 1, [1]), 400, "VALIDATION_ERROR");
    Rule(() => banco.CriarEquipe("Nome", null, inativo, [inativo]), 400, "VALIDATION_ERROR");
    foreach (var nome in new string?[] { null, " ", new string('a', 101), "a\0b" })
        Rule(() => banco.CriarEquipe(nome, null, livre, [livre]), 400, "VALIDATION_ERROR");
    Rule(() => banco.CriarEquipe("Nome", new string('a', 101), livre, [livre]), 400, "VALIDATION_ERROR");
    Check(before == await Snapshot(connection), "Validacao de equipe deixou dados parciais.");
}));

await Case("Equipe recusa mover membros existentes, mesmo com legado divergente", () => Database(async (connection, banco) =>
{
    var before = await Snapshot(connection);
    Rule(() => banco.CriarEquipe("Equipe Indevida", null, 8, [8]), 409, "INSTALADOR_ALREADY_ASSIGNED");
    Check(before == await Snapshot(connection), "Membro foi movido silenciosamente.");
    await Sql(connection, "UPDATE usuario SET id_equipe = NULL WHERE id = 8");
    var divergent = await Snapshot(connection);
    Rule(() => banco.CriarEquipe("Equipe Indevida", null, 8, [8]), 409, "INSTALADOR_ALREADY_ASSIGNED");
    Check(divergent == await Snapshot(connection), "Vinculo legado foi ignorado.");
}));

await Case("Falha depois dos membros reverte equipe e todos os vinculos", () => Database(async (connection, banco) =>
{
    var livre = await InstaladorLivre(connection);
    var before = await Snapshot(connection);
    await Sql(connection, """
        CREATE FUNCTION rejeitar_equipe_teste() RETURNS trigger LANGUAGE plpgsql AS $$
        BEGIN RAISE EXCEPTION 'Falha injetada pelo teste'; END;
        $$;
        CREATE TRIGGER rejeitar_equipe_teste BEFORE UPDATE OF id_equipe ON usuario
        FOR EACH ROW EXECUTE FUNCTION rejeitar_equipe_teste();
        """);
    try { banco.CriarEquipe("Equipe Revertida", null, livre, [livre]); throw new InvalidOperationException("Falha de teste nao ocorreu."); }
    catch (PostgresException e) when (e.SqlState == "P0001") { }
    Check(before == await Snapshot(connection), "Rollback deixou equipe ou membros orfaos.");
}));

await Case("Equipes concorrentes nao disputam o mesmo instalador silenciosamente", () => Database(async (connection, banco) =>
{
    var livre = await InstaladorLivre(connection);
    using var barrier = new Barrier(2);
    var results = await Task.WhenAll(Enumerable.Range(0, 2).Select(i => Task.Run(() =>
    {
        if (!barrier.SignalAndWait(TimeSpan.FromSeconds(15))) throw new InvalidOperationException("Barreira expirou.");
        try { banco.CriarEquipe("Equipe Concorrente " + i, null, livre, [livre]); return "criado"; }
        catch (RegraVioladaException e) when (e.Status == 409 && e.Code == "INSTALADOR_ALREADY_ASSIGNED") { return "conflito"; }
    })));
    Check(results.Count(r => r == "criado") == 1 && results.Count(r => r == "conflito") == 1, "Equipe concorrente teve resultado incorreto.");
    Check(await Scalar<long>(connection, $"SELECT count(*) FROM equipe_instalador WHERE id_usuario = {livre}") == 1, "Instalador ficou em duas equipes.");
}));

Console.WriteLine($"Resultado: {passed} casos aprovados; {failed} reprovados.");
Environment.ExitCode = failed == 0 ? 0 : 1;

static ClienteNovoBanco Cliente(string nome, string documento) => new(nome, documento, null, null, null, null, null);

async Task Case(string nome, Func<Task> test)
{
    try { await test(); passed++; Console.WriteLine($"PASSOU: {nome}"); }
    catch (Exception e) { failed++; Console.WriteLine($"FALHOU: {nome}: {e}"); }
}

async Task Database(Func<string, BancoDados, Task> test)
{
    var nome = "pi4_cadastros_" + Guid.NewGuid().ToString("N");
    var connection = new NpgsqlConnectionStringBuilder(admin) { Database = nome }.ConnectionString;
    await Sql(admin, $"CREATE DATABASE \"{nome}\"");
    try
    {
        await Sql(connection, schema);
        await Sql(connection, seed);
        await test(connection, new BancoDados(connection));
    }
    finally
    {
        NpgsqlConnection.ClearAllPools();
        await Sql(admin, $"DROP DATABASE \"{nome}\" WITH (FORCE)");
    }
}

static async Task Sql(string connection, string sql)
{
    await using var db = new NpgsqlConnection(connection);
    await db.OpenAsync();
    await using var comando = new NpgsqlCommand(sql, db);
    await comando.ExecuteNonQueryAsync();
}

static async Task<T> Scalar<T>(string connection, string sql)
{
    await using var db = new NpgsqlConnection(connection);
    await db.OpenAsync();
    await using var comando = new NpgsqlCommand(sql, db);
    return (T)(await comando.ExecuteScalarAsync())!;
}

static Task<int> InstaladorLivre(string connection) => Task.FromResult(
    new BancoDados(connection).CriarUsuario("Instalador Livre", $"{Guid.NewGuid():N}@example.com",
        "SenhaTeste123!", Perfis.Instalador).Id);

static Task<string> Snapshot(string connection) => Scalar<string>(connection, """
    SELECT jsonb_build_object('equipes',(SELECT jsonb_agg(to_jsonb(e) ORDER BY id) FROM equipe e),
        'usuarios',(SELECT jsonb_agg(to_jsonb(u) ORDER BY id) FROM usuario u),
        'membros',(SELECT jsonb_agg(to_jsonb(m) ORDER BY id_equipe,id_usuario) FROM equipe_instalador m))::text
    """);

static void Rule(Action action, int status, string code)
{
    try { action(); }
    catch (RegraVioladaException e) when (e.Status == status && e.Code == code) { return; }
    throw new InvalidOperationException($"Esperado {status} {code}.");
}

static void Check(bool condition, string message)
{
    if (!condition) throw new InvalidOperationException(message);
}
