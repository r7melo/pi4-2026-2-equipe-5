using System.Text;
using System.Text.Json;
using System.Security.Claims;
using Backend.Api;
using Backend.Api.Controllers;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.IdentityModel.JsonWebTokens;
using Npgsql;

var adminConnection = Environment.GetEnvironmentVariable("USUARIOS_TEST_ADMIN_CONNECTION")
    ?? throw new InvalidOperationException("Defina USUARIOS_TEST_ADMIN_CONNECTION para um PostgreSQL de testes com CREATE DATABASE.");
var repository = Directory.GetCurrentDirectory();
var schema = await File.ReadAllTextAsync(Path.Combine(repository, "database", "01_schema.sql"));
var seed = await File.ReadAllTextAsync(Path.Combine(repository, "database", "02_seed.sql"));
var passed = 0;
var failed = 0;
var publicJson = new JsonSerializerOptions(JsonSerializerDefaults.Web);

await Case("Lista quatro perfis sem remover o Leitor legado", () => Database(async (connection, banco) =>
{
    var perfis = banco.ListarPerfis();
    Check(perfis.Count == 4, "Quantidade de perfis de cadastro incorreta.");
    Check(perfis.Select(p => p.NomePerfil).Order().SequenceEqual(new[] { "Administrador", "Engenharia", "Financeiro", "InstaladorCampo" }), "Perfis oferecidos divergem da matriz.");
    Check(perfis.Single(p => p.NomePerfil == Perfis.Instalador).Id == 5, "DAL inventou ID de perfil.");
    Check(await Scalar<long>(connection, "SELECT count(*) FROM perfil_acesso WHERE nome_perfil::text = 'VisualizadorLeitor'") == 1, "Perfil legado foi removido.");
}));

await Case("Cria quatro perfis, preserva consulta interna e retorna DTO sem segredos", () => Database(async (connection, banco) =>
{
    foreach (var perfil in banco.ListarPerfis())
    {
        var equipe = perfil.NomePerfil == Perfis.Instalador ? (int?)1 : null;
        var created = banco.CriarUsuario("  Novo Usuario  ", $"  {perfil.NomePerfil}@Example.COM  ", "SenhaTeste123!", perfil.NomePerfil, equipe);
        Check(created.Nome == "Novo Usuario" && created.Email == $"{perfil.NomePerfil.ToLowerInvariant()}@example.com", "Nome/e-mail nao foram normalizados.");
        Check(created.Perfil == perfil.NomePerfil && created.EquipeId == equipe && created.Ativo, "DTO publico incorreto.");
        var internalUser = banco.BuscarUsuarioPorId(created.Id)!;
        Check(internalUser.PerfilId == perfil.Id && internalUser.NomePerfil == perfil.NomePerfil, "Perfil persistido incorreto.");
        Check(banco.BuscarUsuarioPorEmail(created.Email.ToUpperInvariant())?.Id == created.Id, "Consulta por e-mail existente perdeu compatibilidade.");
        Check(internalUser.SenhaHash != "SenhaTeste123!" && BCrypt.Net.BCrypt.Verify("SenhaTeste123!", internalUser.SenhaHash), "Hash persistido nao verifica a senha original.");
        Check(!BCrypt.Net.BCrypt.Verify("senha-incorreta", internalUser.SenhaHash), "Hash aceitou senha errada.");
        var serialized = JsonSerializer.SerializeToElement(created, publicJson);
        var keys = serialized.EnumerateObject().Select(p => p.Name).Order();
        Check(keys.SequenceEqual(new[] { "ativo", "email", "equipeId", "id", "nome", "perfil" }), "DTO publico expoe campos inesperados.");
        Check(!serialized.ToString().Contains(internalUser.SenhaHash) && !serialized.ToString().Contains("SenhaTeste123!"), "DTO publico expoe segredo.");
        Check(await Scalar<long>(connection, $"SELECT count(*) FROM equipe_instalador WHERE id_usuario = {created.Id}") == (equipe is null ? 0 : 1), "Vinculo de instalador incorreto.");
    }
}));

await Case("Senha tem salt aleatorio, preserva espacos e respeita limite UTF-8", () => Database(async (connection, banco) =>
{
    var first = banco.CriarUsuario("Primeiro Usuario", "primeiro@example.com", "  Senha com espacos  ", Perfis.Engenharia);
    var second = banco.CriarUsuario("Segundo Usuario", "segundo@example.com", "  Senha com espacos  ", Perfis.Engenharia);
    var firstHash = banco.BuscarUsuarioPorId(first.Id)!.SenhaHash;
    Check(firstHash != banco.BuscarUsuarioPorId(second.Id)!.SenhaHash, "Senhas iguais receberam o mesmo salt/hash.");
    Check(BCrypt.Net.BCrypt.Verify("  Senha com espacos  ", firstHash) && !BCrypt.Net.BCrypt.Verify("Senha com espacos", firstHash), "Senha foi aparada silenciosamente.");
    var exactAscii = new string('a', 72);
    var exactUnicode = new string('\u00e1', 36);
    Check(Encoding.UTF8.GetByteCount(exactUnicode) == 72, "Fixture Unicode incorreta.");
    foreach (var item in new[] { ("ascii", exactAscii), ("unicode", exactUnicode), ("minimo-ascii", "123456"), ("minimo-unicode", "\u00e1\u00e1\u00e1") })
    {
        var user = banco.CriarUsuario("Limite de Senha", item.Item1 + "@example.com", item.Item2, Perfis.Financeiro);
        Check(BCrypt.Net.BCrypt.Verify(item.Item2, banco.BuscarUsuarioPorId(user.Id)!.SenhaHash), "Senha no limite minimo/maximo em bytes nao foi preservada.");
    }
    var before = await UsersSnapshot(connection);
    foreach (var password in new string?[] { null, "", "      ", "12345", new string('a', 73), new string('\u00e1', 37), new string('a', 71) + "\u00e1", "senha\0oculta" })
        Rule(() => banco.CriarUsuario("Senha Invalida", Guid.NewGuid().ToString("N") + "@example.com", password, Perfis.Administrador), 400, "VALIDATION_ERROR");
    Check(before == await UsersSnapshot(connection), "Senha invalida deixou registro parcial.");
}));

await Case("Duplicidade sem diferenca de caixa retorna erro do dominio", () => Database(async (connection, banco) =>
{
    var before = await UsersSnapshot(connection);
    Rule(() => banco.CriarUsuario("Duplicado Usuario", " ADMIN@ZL.COM.BR ", "SenhaTeste123!", Perfis.Administrador), 409, "EMAIL_ALREADY_EXISTS");
    Check(before == await UsersSnapshot(connection), "E-mail duplicado deixou registro parcial.");
}));

await Case("Duplicidade concorrente e resolvida pela restricao PostgreSQL", () => Database(async (connection, banco) =>
{
    // Uma das contas inicia em caixa mista no banco, exercitando o indice lower(email).
    await Sql(connection, "UPDATE usuario SET email = 'CaSe.SeEd@Example.COM' WHERE id = 2");
    Rule(() => banco.CriarUsuario("Duplicado Usuario", "case.seed@example.com", "SenhaTeste123!", Perfis.Administrador), 409, "EMAIL_ALREADY_EXISTS");
    using var barrier = new Barrier(2);
    var attempts = await Task.WhenAll(Enumerable.Range(0, 2).Select(index => Task.Run(() =>
    {
        if (!barrier.SignalAndWait(TimeSpan.FromSeconds(15))) throw new InvalidOperationException("A barreira concorrente expirou.");
        try { banco.CriarUsuario("Concorrente " + index, "concorrente@example.com", "SenhaTeste123!", Perfis.Engenharia); return "criado"; }
        catch (RegraVioladaException error) when (error.Status == 409 && error.Code == "EMAIL_ALREADY_EXISTS") { return "duplicado"; }
    })));
    Check(attempts.Count(r => r == "criado") == 1 && attempts.Count(r => r == "duplicado") == 1, "Duas gravacoes concorrentes tiveram resultado incorreto.");
    Check(await Scalar<long>(connection, "SELECT count(*) FROM usuario WHERE lower(email) = 'concorrente@example.com'") == 1, "Duplicidade persistiu no banco.");
}));

await Case("Perfil, equipe, nome e e-mail invalidos nao criam usuarios", () => Database(async (connection, banco) =>
{
    var before = await UsersSnapshot(connection);
    foreach (var role in new string?[] { null, "", "VisualizadorLeitor", "EngenhariaObras", "Administrador' OR '1'='1" })
        Rule(() => banco.CriarUsuario("Perfil Invalido", "invalido@example.com", "SenhaTeste123!", role), 400, "VALIDATION_ERROR");
    foreach (var team in new int?[] { 0, -1 })
        Rule(() => banco.CriarUsuario("Instalador Invalido", "invalido@example.com", "SenhaTeste123!", Perfis.Instalador, team), 400, "VALIDATION_ERROR");
    Rule(() => banco.CriarUsuario("Instalador Invalido", "invalido@example.com", "SenhaTeste123!", Perfis.Instalador, 999999), 404, "EQUIPE_NOT_FOUND");
    foreach (var role in new[] { Perfis.Administrador, Perfis.Engenharia, Perfis.Financeiro })
        Rule(() => banco.CriarUsuario("Equipe Indevida", "invalido@example.com", "SenhaTeste123!", role, 1), 400, "VALIDATION_ERROR");
    foreach (var name in new string?[] { null, "", "  ", "ab", "nome\0invalido", new string('a', 201) })
        Rule(() => banco.CriarUsuario(name, "invalido@example.com", "SenhaTeste123!", Perfis.Administrador), 400, "VALIDATION_ERROR");
    foreach (var email in new string?[] { null, "", "sem-arroba", "a@b", "a\0@example.com", new string('a', 190) + "@example.com" })
        Rule(() => banco.CriarUsuario("Email Invalido", email, "SenhaTeste123!", Perfis.Administrador), 400, "VALIDATION_ERROR");
    Check(before == await UsersSnapshot(connection), "Uma validacao deixou usuario parcial.");
}));

await Case("Falha na segunda gravacao reverte usuario e vinculo", () => Database(async (connection, banco) =>
{
    var before = await UsersSnapshot(connection);
    var memberships = await Scalar<long>(connection, "SELECT count(*) FROM equipe_instalador");
    await Sql(connection, """
        CREATE FUNCTION rejeitar_vinculo_teste() RETURNS trigger LANGUAGE plpgsql AS $$
        BEGIN RAISE EXCEPTION 'Falha de vinculo injetada pelo teste'; END;
        $$;
        CREATE TRIGGER rejeitar_vinculo_teste BEFORE INSERT ON equipe_instalador
        FOR EACH ROW EXECUTE FUNCTION rejeitar_vinculo_teste();
        """);
    try { banco.CriarUsuario("Instalador Revertido", "rollback@example.com", "SenhaTeste123!", Perfis.Instalador, 1); throw new InvalidOperationException("A falha injetada nao foi propagada."); }
    catch (PostgresException error) when (error.SqlState == "P0001") { }
    Check(before == await UsersSnapshot(connection), "Usuario orfao permaneceu apos falha no vinculo.");
    Check(memberships == await Scalar<long>(connection, "SELECT count(*) FROM equipe_instalador"), "Vinculos foram alterados apos rollback.");
}));

await Case("SQL parametrizado preserva texto e nao mascara outras constraints", () => Database(async (connection, banco) =>
{
    const string name = "D'Avila; DROP TABLE usuario; --";
    var user = banco.CriarUsuario(name, "o'brien@example.com", "SenhaTeste123!", Perfis.Engenharia);
    Check(banco.BuscarUsuarioPorId(user.Id)?.Nome == name, "Texto de entrada nao foi preservado como dado.");
    Check(await Scalar<long>(connection, "SELECT count(*) FROM usuario") > 0, "A tabela de usuarios foi alterada pelo texto.");
    await Sql(connection, "CREATE UNIQUE INDEX usuario_nome_teste ON usuario(nome)");
    try { banco.CriarUsuario(name, "outro@example.com", "SenhaTeste123!", Perfis.Engenharia); throw new InvalidOperationException("Indice de teste nao rejeitou duplicidade."); }
    catch (PostgresException error) when (error.SqlState == PostgresErrorCodes.UniqueViolation && error.ConstraintName == "usuario_nome_teste") { }
}));

await Case("Usuario criado funciona com o AuthController existente", () => Database((connection, banco) =>
{
    var created = banco.CriarUsuario("Login Compativel", "login.novo@example.com", "SenhaTeste123!", Perfis.Engenharia);
    var host = Host.CreateApplicationBuilder(new HostApplicationBuilderSettings { DisableDefaults = true });
    host.Configuration["JWT_SECRET"] = "segredo-isolado-do-teste-de-cadastro-2026";
    var controller = new AuthController(banco, new Autenticacao(host.Configuration, host.Environment));
    var result = controller.Login(new AuthController.LoginEntrada(created.Email.ToUpperInvariant(), "SenhaTeste123!"));
    Check(result is OkObjectResult, "Login existente nao aceitou usuario criado pela DAL.");
    var response = JsonSerializer.SerializeToElement(((OkObjectResult)result).Value, publicJson);
    Check(response.GetProperty("usuario").GetProperty("perfil").GetString() == "Engenharia", "Login nao retorna perfil canonico.");
    Check(!string.IsNullOrWhiteSpace(response.GetProperty("token").GetString()), "Login nao emitiu token.");
    var wrong = controller.Login(new AuthController.LoginEntrada(created.Email, "senha-incorreta"));
    Check(wrong is ObjectResult { StatusCode: 401 }, "Login existente aceitou senha incorreta.");
    return Task.CompletedTask;
}));

await Case("Fluxo real: instalador livre, equipe e novo login sem ampliar token antigo", () => Database(async (connection, banco) =>
{
    var primeiro = banco.CriarUsuario("Instalador Livre Um", "livre.um@example.com", "SenhaTeste123!", Perfis.Instalador);
    var segundo = banco.CriarUsuario("Instalador Livre Dois", "livre.dois@example.com", "SenhaTeste123!", Perfis.Instalador);
    Check(primeiro.EquipeId is null && segundo.EquipeId is null, "Cadastro livre inventou equipe.");
    Check(await Scalar<long>(connection, $"SELECT count(*) FROM equipe_instalador WHERE id_usuario IN ({primeiro.Id},{segundo.Id})") == 0,
        "Cadastro livre criou associacao.");
    var interno = banco.BuscarUsuarioPorId(primeiro.Id)!;
    Check(BCrypt.Net.BCrypt.Verify("SenhaTeste123!", interno.SenhaHash), "Cadastro livre nao aplicou bcrypt.");
    var dto = JsonSerializer.SerializeToElement(primeiro, publicJson);
    Check(dto.GetProperty("equipeId").ValueKind == JsonValueKind.Null && !dto.ToString().Contains(interno.SenhaHash), "DTO livre invalido ou expoe hash.");

    var host = Host.CreateApplicationBuilder(new HostApplicationBuilderSettings { DisableDefaults = true });
    host.Configuration["JWT_SECRET"] = "segredo-isolado-do-fluxo-de-equipes-2026";
    var autenticacao = new Autenticacao(host.Configuration, host.Environment);
    var auth = new AuthController(banco, autenticacao);
    var setup = new ServiceCollection().AddSingleton(banco).AddLogging();
    setup.AddSignalR();
    setup.AddSingleton<ObrasNotificador>();
    using var services = setup.BuildServiceProvider();
    string Login()
    {
        var result = auth.Login(new AuthController.LoginEntrada(primeiro.Email, "SenhaTeste123!"));
        Check(result is OkObjectResult, "Instalador livre nao consegue fazer login.");
        var body = JsonSerializer.SerializeToElement(((OkObjectResult)result).Value, publicJson);
        return body.GetProperty("token").GetString()!;
    }
    ProgramacoesController Cronograma(string token) => new(banco, services.GetRequiredService<ObrasNotificador>())
    {
        ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext
            {
                RequestServices = services,
                // Claims de um token emitido pelo login real acima; validacao criptografica
                // pelo middleware e coberta separadamente na suite de perfis/JWT.
                User = new ClaimsPrincipal(new ClaimsIdentity(new JsonWebToken(token).Claims, "Teste"))
            }
        }
    };
    var tokenAntigo = Login();
    Check(!new JsonWebToken(tokenAntigo).Claims.Any(c => c.Type == Autenticacao.ClaimEquipe), "Token livre recebeu equipe.");
    var semEquipe = Cronograma(tokenAntigo);
    Check(semEquipe.Listar(null, null, null) is ObjectResult { StatusCode: 403 }, "Sem equipe recebeu cronograma global.");
    Check(!semEquipe.PodeVerObra(banco, 301), "Sem equipe recebeu acesso a obra alheia.");

    var equipe = banco.CriarEquipe("Equipe do Fluxo Real", "Solar", primeiro.Id, [primeiro.Id, segundo.Id]);
    Check(banco.BuscarUsuarioPorId(primeiro.Id)!.EquipeId == equipe.Id && banco.BuscarUsuarioPorId(segundo.Id)!.EquipeId == equipe.Id,
        "Criacao da equipe nao atualizou os dois usuarios.");
    Check(await Scalar<long>(connection, $"SELECT count(*) FROM equipe_instalador WHERE id_equipe = {equipe.Id}") == 2,
        "Criacao da equipe deixou associacoes incompletas.");
    Check(banco.ListarEquipes(null, null).Single(e => e.Id == equipe.Id).Responsavel.Id == primeiro.Id,
        "Responsavel nao integra a equipe persistida.");
    banco.CriarProgramacao(304, equipe.Id, new DateOnly(2026, 11, 2), 1, 1);
    Check(Cronograma(tokenAntigo).Listar(null, null, null) is ObjectResult { StatusCode: 403 }, "Token anterior ganhou acesso implicitamente.");
    var tokenNovo = Login();
    Check(new JsonWebToken(tokenNovo).GetClaim(Autenticacao.ClaimEquipe).Value == equipe.Id.ToString(), "Novo login nao emitiu equipe atual.");
    var comEquipe = Cronograma(tokenNovo);
    Check(comEquipe.Listar(null, null, null) is OkObjectResult ok && ok.Value is List<ProgramacaoBanco> itens
        && itens.Count == 1 && itens.All(p => p.EquipeId == equipe.Id && p.ObraId == 304), "Cronograma nao restringiu a nova equipe.");
    Check(comEquipe.PodeVerObra(banco, 304) && !comEquipe.PodeVerObra(banco, 301), "Acesso por obra nao respeitou o novo vinculo.");
}));

Console.WriteLine($"Resultado: {passed} casos aprovados; {failed} reprovados.");
Environment.ExitCode = failed == 0 ? 0 : 1;

async Task Case(string name, Func<Task> test)
{
    try { await test(); passed++; Console.WriteLine($"PASSOU: {name}"); }
    catch (Exception error) { failed++; Console.WriteLine($"FALHOU: {name}: {error}"); }
}

async Task Database(Func<string, BancoDados, Task> test)
{
    var name = "pi4_usuarios_" + Guid.NewGuid().ToString("N");
    var target = new NpgsqlConnectionStringBuilder(adminConnection) { Database = name }.ConnectionString;
    await Sql(adminConnection, $"CREATE DATABASE \"{name}\"");
    try
    {
        await Sql(target, schema);
        await Sql(target, seed);
        await test(target, new BancoDados(target));
    }
    finally
    {
        NpgsqlConnection.ClearAllPools();
        await Sql(adminConnection, $"DROP DATABASE \"{name}\" WITH (FORCE)");
    }
}

static async Task Sql(string connection, string sql)
{
    await using var db = new NpgsqlConnection(connection);
    await db.OpenAsync();
    await using var command = new NpgsqlCommand(sql, db);
    await command.ExecuteNonQueryAsync();
}

static async Task<T> Scalar<T>(string connection, string sql)
{
    await using var db = new NpgsqlConnection(connection);
    await db.OpenAsync();
    await using var command = new NpgsqlCommand(sql, db);
    return (T)(await command.ExecuteScalarAsync())!;
}

static Task<string> UsersSnapshot(string connection) => Scalar<string>(connection,
    "SELECT jsonb_agg(to_jsonb(u) ORDER BY id)::text FROM usuario u");

static void Rule(Action action, int status, string code)
{
    try { action(); }
    catch (RegraVioladaException error) when (error.Status == status && error.Code == code) { return; }
    throw new InvalidOperationException($"Esperado erro {status} {code}.");
}

static void Check(bool condition, string message)
{
    if (!condition) throw new InvalidOperationException(message);
}
