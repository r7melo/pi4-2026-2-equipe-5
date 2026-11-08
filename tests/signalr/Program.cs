using System.Diagnostics;
using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Net.Sockets;
using System.Text;
using System.Text.Json;
using System.Threading.Channels;
using Backend.Api;
using Backend.Api.Controllers;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Microsoft.AspNetCore.Http.Connections;
using Microsoft.AspNetCore.SignalR.Client;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.IdentityModel.JsonWebTokens;
using Microsoft.IdentityModel.Tokens;
using Npgsql;

// Este executavel so recebe a conexao do PostgreSQL descartavel criado pelo script.
var admin = Environment.GetEnvironmentVariable("SIGNALR_TEST_ADMIN_CONNECTION")
    ?? throw new InvalidOperationException("Use tests/executar-signalr.ps1: exige PostgreSQL exclusivo de testes.");
const string secret = "segredo-exclusivo-dos-testes-signalr-2026-nao-producao";
var passed = 0;
var failed = 0;
await using var database = await TestDatabase.Create(admin);
await using var app = await ApiProcess.Start(database.Connection, secret);
using var http = new HttpClient { BaseAddress = new Uri(app.Address) };

await Case("Preflight com credenciais aceita localhost e rejeita origem externa", async () =>
{
    foreach (var origin in new[] { "http://localhost:3000", "http://127.0.0.1:3000" })
    {
        using var response = await Preflight(http, origin);
        Check(response.StatusCode == HttpStatusCode.NoContent, "Preflight nao respondeu 204.");
        Check(response.Headers.GetValues("Access-Control-Allow-Origin").Single() == origin, "Origem deve ser explicita.");
        Check(response.Headers.GetValues("Access-Control-Allow-Credentials").Single() == "true", "Credenciais ausentes.");
        Check(response.Headers.GetValues("Access-Control-Allow-Methods").Single().Contains("POST"), "POST nao permitido.");
    }
    using var denied = await Preflight(http, "https://origem-nao-autorizada.invalid");
    Check(!denied.Headers.Contains("Access-Control-Allow-Origin"), "Origem externa recebeu permissao CORS.");
});

await Case("Negociacao real exige JWT valido e perfil autorizado", async () =>
{
    foreach (var role in new[] { Perfis.Administrador, Perfis.Engenharia, Perfis.Financeiro, Perfis.Instalador, "EngenhariaObras" })
    {
        using var response = await Negotiate(http, Token(role));
        Check(response.StatusCode == HttpStatusCode.OK, $"Perfil {role} perdeu acesso ao hub.");
        var body = await response.Content.ReadAsStringAsync();
        Check(body.Contains("connectionToken") && body.Contains("WebSockets"), "Nao respondeu negociacao SignalR.");
    }
    foreach (var token in new string?[] { null, Token(Perfis.Engenharia, expires: DateTime.UtcNow.AddMinutes(-1)),
                 Token(Perfis.Engenharia, key: "assinatura-invalida-exclusiva-deste-teste-2026") })
    {
        using var denied = await Negotiate(http, token);
        Check(denied.StatusCode == HttpStatusCode.Unauthorized, "Hub aceitou token ausente, expirado ou adulterado.");
    }
    using var reader = await Negotiate(http, Token("VisualizadorLeitor"));
    Check(reader.StatusCode == HttpStatusCode.Forbidden, "Perfil sem permissao recebeu acesso ao hub.");
});

await Case("JWT na query funciona somente no hub; rotas REST continuam exigindo Bearer", async () =>
{
    var token = Token(Perfis.Engenharia);
    using var accepted = await http.PostAsync($"/hubs/obras/negotiate?negotiateVersion=1&access_token={token}", null);
    Check(accepted.StatusCode == HttpStatusCode.OK, "Negociacao nao aceita JWT na query do hub.");
    using var denied = await http.GetAsync($"/api/auth/me?access_token={token}");
    Check(denied.StatusCode == HttpStatusCode.Unauthorized, "JWT da query foi aceito em rota REST.");
    using var request = new HttpRequestMessage(HttpMethod.Get, "/api/auth/me");
    request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
    using var bearer = await http.SendAsync(request);
    Check(bearer.StatusCode == HttpStatusCode.OK, "Bearer nas rotas REST regrediu.");
});

await Case("WebSocket real aceita JWT da query e origem permitida", async () =>
{
    await using var connection = Hub(app.Address, Token(Perfis.Engenharia), "http://localhost:3000");
    await connection.StartAsync();
    Check(connection.State == HubConnectionState.Connected, "Conexao WebSocket nao estabelecida.");
    // O hub nao oferece mutacoes invocaveis pelo cliente.
    try { await connection.InvokeAsync("MoverStatus", 301, "Concluido"); throw new InvalidOperationException("Hub expos metodo de escrita."); }
    catch (Microsoft.AspNetCore.SignalR.HubException) { }
});

await Case("Upgrade WebSocket rejeita Origin externo mesmo com JWT valido", async () =>
{
    await using var connection = Hub(app.Address, Token(Perfis.Engenharia), "https://origem-nao-autorizada.invalid");
    try { await connection.StartAsync(); throw new InvalidOperationException("Origin externo abriu WebSocket."); }
    catch (System.Net.WebSockets.WebSocketException) { }
});

await Case("Long polling real preserva fallback do cliente", async () =>
{
    await using var connection = new HubConnectionBuilder().WithUrl(app.Address + "/hubs/obras", options =>
    {
        options.AccessTokenProvider = () => Task.FromResult<string?>(Token(Perfis.Engenharia));
        options.Transports = HttpTransportType.LongPolling;
    }).ConfigureLogging(logging => logging.SetMinimumLevel(LogLevel.Warning)).Build();
    await connection.StartAsync();
    Check(connection.State == HubConnectionState.Connected, "Fallback long polling nao conecta.");
});

await Case("Conexao fecha quando o JWT expira", async () =>
{
    await using var connection = Hub(app.Address, Token(Perfis.Engenharia, expires: DateTime.UtcNow.AddSeconds(3)));
    var closed = new TaskCompletionSource(TaskCreationOptions.RunContinuationsAsynchronously);
    connection.Closed += _ => { closed.TrySetResult(); return Task.CompletedTask; };
    await connection.StartAsync();
    await closed.Task.WaitAsync(TimeSpan.FromSeconds(12));
    Check(connection.State == HubConnectionState.Disconnected, "JWT expirado manteve canal aberto.");
});

await Case("Origem adicional configurada vale no CORS e no WebSocket", async () =>
{
    const string customOrigin = "http://homologacao.local:3000";
    await using var custom = await ApiProcess.Start(database.Connection, secret, customOrigin);
    using var customHttp = new HttpClient { BaseAddress = new Uri(custom.Address) };
    using var response = await Preflight(customHttp, customOrigin);
    Check(response.Headers.GetValues("Access-Control-Allow-Origin").Single() == customOrigin, "Configuracao CORS ignorada.");
    await using var connection = Hub(custom.Address, Token(Perfis.Engenharia), customOrigin);
    await connection.StartAsync();
    using var defaultOrigin = await Preflight(customHttp, "http://localhost:3000");
    Check(!defaultOrigin.Headers.Contains("Access-Control-Allow-Origin"), "Origem padrao persistiu fora da configuracao explicita.");
});

await Case("Duas sessoes reais recebem os cinco topicos sem payload somente apos commit", () => WithApi(async (db, api, client) =>
{
    var engineer = await Login(client, "engenharia@zlengenharia.com");
    var installer = await Login(client, "instalador07@zl.com.br");
    await using var first = new EventObserver(Hub(api.Address, engineer));
    await using var second = new EventObserver(Hub(api.Address, installer));
    await first.Start(); await second.Start();

    async Task<JsonElement> Mutate(string topic, HttpMethod method, string route, object payload,
        HttpStatusCode status, Func<Task<bool>> persisted)
    {
        first.PersistenceCheck = second.PersistenceCheck = persisted;
        using var response = await Send(client, engineer, method, route, payload);
        Check(response.StatusCode == status, $"{method} {route}: esperado {status}, veio {response.StatusCode}: {await response.Content.ReadAsStringAsync()}");
        await first.Expect(topic); await second.Expect(topic);
        var json = await response.Content.ReadFromJsonAsync<JsonElement>();
        return json;
    }

    var created = await Mutate("ObraAtualizada", HttpMethod.Post, "/api/obras", NewWork("signalr-criacao"), HttpStatusCode.Created,
        async () => await Scalar<long>(db.Connection, "SELECT count(*) FROM obra WHERE descricao='signalr-criacao'") == 1);
    var id = created.GetProperty("id").GetInt32();
    await Mutate("ObraAtualizada", HttpMethod.Put, $"/api/obras/{id}", new { descricao = "signalr-edicao" }, HttpStatusCode.OK,
        async () => await Scalar<string>(db.Connection, $"SELECT descricao FROM obra WHERE id={id}") == "signalr-edicao");
    await Mutate("ObraAtualizada", HttpMethod.Patch, $"/api/obras/{id}/status", new { statusNovo = "NoDeposito" }, HttpStatusCode.OK,
        async () => await Scalar<string>(db.Connection, $"SELECT status::text FROM obra WHERE id={id}") == "NoDeposito");
    await Mutate("ObraAtualizada", HttpMethod.Patch, $"/api/obras/{id}/status", new { statusNovo = "Separado" }, HttpStatusCode.OK,
        async () => await Scalar<string>(db.Connection, $"SELECT status::text FROM obra WHERE id={id}") == "Separado");
    await Mutate("MaterialAtualizado", HttpMethod.Post, $"/api/obras/{id}/materiais",
        new { tipo = "Material SignalR", quantidade = 2, custoUnitario = 12.34m, statusLogistico = "Comprado" }, HttpStatusCode.Created,
        async () => await Scalar<long>(db.Connection, $"SELECT count(*) FROM material WHERE id_obra={id} AND tipo='Material SignalR'") == 1);
    await Mutate("ComentarioCriado", HttpMethod.Post, $"/api/obras/{id}/comentarios",
        new { descricao = "Comentario SignalR", tipo = "Cartao" }, HttpStatusCode.Created,
        async () => await Scalar<long>(db.Connection, $"SELECT count(*) FROM comentario WHERE id_obra={id} AND descricao='Comentario SignalR'") == 1
            && await Scalar<long>(db.Connection, $"SELECT count(*) FROM historico_obra WHERE id_obra={id} AND observacao='Comentario SignalR'") == 1);
    var schedule = await Mutate("ProgramacaoCriada", HttpMethod.Post, "/api/programacoes",
        new { obraId = id, equipeId = 10, dataInicio = "2030-01-07", prioridade = 1 }, HttpStatusCode.Created,
        async () => await Scalar<long>(db.Connection, $"SELECT count(*) FROM programacao_obra WHERE id_obra={id} AND id_equipe=10") == 1
            && await Scalar<string>(db.Connection, $"SELECT status::text FROM obra WHERE id={id}") == "EmAndamento");
    var following = await Mutate("ProgramacaoCriada", HttpMethod.Post, "/api/programacoes",
        new { obraId = 304, equipeId = 10, dataInicio = "2030-01-09", prioridade = 2 }, HttpStatusCode.Created,
        async () => await Scalar<long>(db.Connection, "SELECT count(*) FROM programacao_obra WHERE id_obra=304 AND id_equipe=10") == 1);
    var scheduleId = schedule.GetProperty("id").GetInt32();
    var followingId = following.GetProperty("id").GetInt32();
    var reordered = await Mutate("ProgramacaoAtualizada", HttpMethod.Put, $"/api/programacoes/{scheduleId}/reordenar",
        new { novaDataInicio = "2030-01-14" }, HttpStatusCode.OK,
        async () => await Scalar<DateOnly>(db.Connection, $"SELECT data_inicio FROM programacao_obra WHERE id={scheduleId}") == new DateOnly(2030, 1, 14)
            && await Scalar<DateOnly>(db.Connection, $"SELECT data_inicio FROM programacao_obra WHERE id={followingId}") == new DateOnly(2030, 1, 16));
    Check(reordered.GetProperty("programacoesAfetadas").GetArrayLength() == 1, "Reordenacao nao propagou a programacao seguinte.");
    await first.ExpectSilence(); await second.ExpectSilence();

    // A segunda sessao recebe apenas invalidacoes: as consultas REST continuam filtradas por equipe.
    using var forbidden = await Send(client, installer, HttpMethod.Get, $"/api/obras/{id}");
    Check(forbidden.StatusCode == HttpStatusCode.Forbidden, "Notificacao ampliou acesso do instalador a obra de outra equipe.");
    using var agenda = await Send(client, installer, HttpMethod.Get, "/api/programacoes");
    Check(agenda.StatusCode == HttpStatusCode.OK, "Consulta da propria equipe regrediu.");
    var rows = await agenda.Content.ReadFromJsonAsync<JsonElement>();
    Check(rows.EnumerateArray().All(row => row.GetProperty("equipeId").GetInt32() == 7), "Cronograma vazou outra equipe.");
}));

await Case("Mutacoes recusadas por 400, 403, 404 e 409 nao publicam nem alteram os dados", () => WithApi(async (db, api, client) =>
{
    await using var observer = new EventObserver(Hub(api.Address, Token(Perfis.Engenharia)));
    await observer.Start();
    var before = await Snapshot(db.Connection);
    var rejected = new (HttpMethod Method, string Path, object Body, string Role, HttpStatusCode Status)[]
    {
        (HttpMethod.Patch, "/api/obras/301/status", new { statusNovo="Concluido" }, Perfis.Engenharia, HttpStatusCode.BadRequest),
        (HttpMethod.Post, "/api/obras/301/materiais", new { tipo="Invalido", quantidade=-1 }, Perfis.Engenharia, HttpStatusCode.BadRequest),
        (HttpMethod.Post, "/api/obras/301/comentarios", new { descricao=" " }, Perfis.Engenharia, HttpStatusCode.BadRequest),
        (HttpMethod.Patch, "/api/obras/301/status", new { statusNovo="NoDeposito" }, Perfis.Financeiro, HttpStatusCode.Forbidden),
        (HttpMethod.Put, "/api/obras/999999", new { descricao="Inexistente" }, Perfis.Engenharia, HttpStatusCode.NotFound),
        (HttpMethod.Post, "/api/programacoes", new { obraId=304, equipeId=7, dataInicio="2026-10-09" }, Perfis.Engenharia, HttpStatusCode.Conflict),
        (HttpMethod.Put, "/api/programacoes/999999/reordenar", new { novaDataInicio="2030-01-07" }, Perfis.Engenharia, HttpStatusCode.NotFound),
    };
    foreach (var item in rejected)
    {
        using var response = await Send(client, Token(item.Role), item.Method, item.Path, item.Body);
        Check(response.StatusCode == item.Status, $"{item.Method} {item.Path}: esperado {item.Status}, veio {response.StatusCode}.");
        await observer.ExpectSilence();
    }
    Check(before == await Snapshot(db.Connection), "Operacao recusada deixou alteracoes de negocio.");
}));

await Case("Falha PostgreSQL real reverte criacao composta e nao publica evento", () => WithApi(async (db, api, client) =>
{
    await using var observer = new EventObserver(Hub(api.Address, Token(Perfis.Engenharia)));
    await observer.Start();
    var before = await Snapshot(db.Connection);
    await Sql(db.Connection, """
        CREATE FUNCTION rejeitar_historico_signalr_teste() RETURNS trigger LANGUAGE plpgsql AS $$
        BEGIN RAISE EXCEPTION 'Falha de persistencia injetada no banco descartavel'; END; $$;
        CREATE TRIGGER rejeitar_historico_signalr_teste BEFORE INSERT ON historico_obra
        FOR EACH ROW EXECUTE FUNCTION rejeitar_historico_signalr_teste();
        """);
    using var response = await Send(client, Token(Perfis.Engenharia), HttpMethod.Post, "/api/obras", NewWork("signalr-rollback"));
    Check(response.StatusCode == HttpStatusCode.InternalServerError, "Falha PostgreSQL nao retornou erro HTTP.");
    await observer.ExpectSilence();
    Check(before == await Snapshot(db.Connection), "Falha deixou obra/pagamento/historico parcial.");
}));

await Case("Falha do transporte preserva resposta e gravacao concluida", async () =>
{
    await using var db = await TestDatabase.Create(admin);
    var proxy = new FailingProxy(async () =>
        Check(await Scalar<long>(db.Connection, "SELECT count(*) FROM material WHERE tipo='SignalR transporte indisponivel'") == 1,
            "Tentou notificar antes de a gravacao estar visivel em outra conexao."));
    var notifier = new ObrasNotificador(new TestHubContext(proxy), NullLogger<ObrasNotificador>.Instance);
    var controller = new ObrasController(new BancoDados(db.Connection), notifier);
    var response = await controller.RegistrarMaterial(301,
        new ObrasController.MaterialEntrada("SignalR transporte indisponivel", 1, 1m, "Comprado"));
    Check(response is CreatedResult { StatusCode: 201 }, "Falha do envio alterou sucesso REST.");
    Check(proxy.Attempts == 1 && proxy.LastTopic == "MaterialAtualizado" && proxy.ArgumentCount == 0 && proxy.BeforeFailureCompleted,
        "Envio nao foi exercitado sem payload depois do commit.");
    Check(await Scalar<long>(db.Connection, "SELECT count(*) FROM material WHERE tipo='SignalR transporte indisponivel'") == 1,
        "Falha de transporte reverteu gravacao concluida.");
    // O mesmo caminho de falha protege todos os topicos, sem mocks na aplicacao em producao.
    await notifier.ObraAtualizadaAsync(); await notifier.ProgramacaoCriadaAsync();
    await notifier.ProgramacaoAtualizadaAsync(); await notifier.ComentarioCriadoAsync();
    Check(proxy.Attempts == 5 && proxy.ArgumentCount == 0, "Um dos topicos propagou falha ou incluiu payload.");
});

Console.WriteLine($"Resultado SignalR: {passed} grupos aprovados; {failed} reprovados.");
Environment.ExitCode = failed == 0 ? 0 : 1;

async Task Case(string name, Func<Task> test)
{
    try { await test(); passed++; Console.WriteLine("PASSOU: " + name); }
    catch (Exception error) { failed++; Console.WriteLine($"FALHOU: {name}: {error}"); }
}

async Task WithApi(Func<TestDatabase, ApiProcess, HttpClient, Task> test)
{
    await using var db = await TestDatabase.Create(admin);
    await using var api = await ApiProcess.Start(db.Connection, secret);
    using var client = new HttpClient { BaseAddress = new Uri(api.Address) };
    await test(db, api, client);
}

static object NewWork(string description) => new
{
    clienteId=1, categoria="Residencial", quantidadePaineis=9, endereco="Rua dos testes isolados, 1", descricao=description,
    pagamento = new { prazoContratualDias=30, dataConfirmacao="2026-11-08" },
};

static async Task<string> Login(HttpClient client, string email)
{
    using var response = await client.PostAsJsonAsync("/api/auth/login", new { email, senha="Senha123!" });
    Check(response.StatusCode == HttpStatusCode.OK, "Login real do seed falhou.");
    var json = await response.Content.ReadFromJsonAsync<JsonElement>();
    return json.GetProperty("token").GetString()!;
}

static async Task<HttpResponseMessage> Send(HttpClient client, string token, HttpMethod method, string path, object? body = null)
{
    using var request = new HttpRequestMessage(method, path);
    request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
    if (body is not null) request.Content = JsonContent.Create(body);
    return await client.SendAsync(request);
}

static async Task Sql(string connection, string sql)
{
    await using var c = new NpgsqlConnection(connection); await c.OpenAsync();
    await using var command = new NpgsqlCommand(sql, c); await command.ExecuteNonQueryAsync();
}

static async Task<T> Scalar<T>(string connection, string sql)
{
    await using var c = new NpgsqlConnection(connection); await c.OpenAsync();
    await using var command = new NpgsqlCommand(sql, c);
    await using var reader = await command.ExecuteReaderAsync();
    await reader.ReadAsync(); return reader.GetFieldValue<T>(0);
}

static Task<string> Snapshot(string connection) => Scalar<string>(connection, """
    SELECT jsonb_build_object(
      'obras',(SELECT jsonb_agg(to_jsonb(t) ORDER BY id) FROM obra t),
      'pagamentos',(SELECT jsonb_agg(to_jsonb(t) ORDER BY id) FROM pagamento t),
      'programacoes',(SELECT jsonb_agg(to_jsonb(t) ORDER BY id) FROM programacao_obra t),
      'materiais',(SELECT jsonb_agg(to_jsonb(t) ORDER BY id) FROM material t),
      'comentarios',(SELECT jsonb_agg(to_jsonb(t) ORDER BY id) FROM comentario t),
      'historico',(SELECT jsonb_agg(to_jsonb(t) ORDER BY id) FROM historico_obra t))::text
    """);

string Token(string role, DateTime? expires = null, string? key = null) => new JsonWebTokenHandler().CreateToken(new SecurityTokenDescriptor
{
    Claims = new Dictionary<string, object> { ["sub"] = "1", ["perfil"] = role },
    Expires = expires ?? DateTime.UtcNow.AddMinutes(5),
    IssuedAt = DateTime.UtcNow.AddMinutes(-2),
    NotBefore = DateTime.UtcNow.AddMinutes(-2),
    SigningCredentials = new SigningCredentials(new SymmetricSecurityKey(Encoding.UTF8.GetBytes(key ?? secret)), SecurityAlgorithms.HmacSha256),
});

static HubConnection Hub(string address, string token, string? origin = null) => new HubConnectionBuilder()
    .WithUrl(address + "/hubs/obras?access_token=" + token, options =>
    {
        options.SkipNegotiation = true;
        options.Transports = HttpTransportType.WebSockets;
        if (origin is not null) options.WebSocketConfiguration = socket => socket.SetRequestHeader("Origin", origin);
    }).ConfigureLogging(logging => logging.SetMinimumLevel(LogLevel.Warning)).Build();

static Task<HttpResponseMessage> Preflight(HttpClient http, string origin)
{
    var request = new HttpRequestMessage(HttpMethod.Options, "/hubs/obras/negotiate?negotiateVersion=1");
    request.Headers.Add("Origin", origin);
    request.Headers.Add("Access-Control-Request-Method", "POST");
    request.Headers.Add("Access-Control-Request-Headers", "authorization,content-type,x-signalr-user-agent");
    return http.SendAsync(request);
}

static Task<HttpResponseMessage> Negotiate(HttpClient http, string? token)
{
    var request = new HttpRequestMessage(HttpMethod.Post, "/hubs/obras/negotiate?negotiateVersion=1");
    if (token is not null) request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
    return http.SendAsync(request);
}

static void Check(bool condition, string message) { if (!condition) throw new InvalidOperationException(message); }

sealed class EventObserver(HubConnection connection) : IAsyncDisposable
{
    private readonly Channel<(string Topic, bool Committed, int Arguments)> events = Channel.CreateUnbounded<(string, bool, int)>();
    public Func<Task<bool>>? PersistenceCheck { get; set; }

    public async Task Start()
    {
        foreach (var topic in new[] { "ObraAtualizada", "ProgramacaoCriada", "ProgramacaoAtualizada", "MaterialAtualizado", "ComentarioCriado" })
            connection.On(topic, Type.EmptyTypes, async (args, _) =>
            {
                try { await events.Writer.WriteAsync((topic, PersistenceCheck is null || await PersistenceCheck(), args.Length)); }
                catch (Exception error) { events.Writer.TryComplete(error); }
            }, this);
        await connection.StartAsync();
    }

    public async Task Expect(string topic)
    {
        using var timeout = new CancellationTokenSource(TimeSpan.FromSeconds(5));
        var received = await events.Reader.ReadAsync(timeout.Token);
        if (received.Topic != topic || !received.Committed || received.Arguments != 0)
            throw new InvalidOperationException($"Evento {received.Topic}: esperado {topic}, commit={received.Committed}, argumentos={received.Arguments}.");
    }

    public async Task ExpectSilence()
    {
        using var timeout = new CancellationTokenSource(TimeSpan.FromMilliseconds(300));
        try { var received = await events.Reader.ReadAsync(timeout.Token); throw new InvalidOperationException("Evento indevido: " + received.Topic); }
        catch (OperationCanceledException) when (timeout.IsCancellationRequested) { }
    }

    public ValueTask DisposeAsync() => connection.DisposeAsync();
}

sealed class FailingProxy(Func<Task> beforeFailure) : IClientProxy
{
    public int Attempts { get; private set; }
    public string? LastTopic { get; private set; }
    public int ArgumentCount { get; private set; }
    public bool BeforeFailureCompleted { get; private set; }
    public async Task SendCoreAsync(string method, object?[] args, CancellationToken cancellationToken = default)
    {
        Attempts++; LastTopic = method; ArgumentCount = args.Length;
        await beforeFailure();
        BeforeFailureCompleted = true;
        throw new InvalidOperationException("Transporte SignalR indisponivel, simulado exclusivamente no teste.");
    }
}

sealed class TestHubContext(IClientProxy proxy) : IHubContext<ObrasHub>
{
    public IHubClients Clients { get; } = new TestHubClients(proxy);
    public IGroupManager Groups => throw new NotSupportedException();
}

sealed class TestHubClients(IClientProxy proxy) : IHubClients
{
    public IClientProxy All => proxy;
    public IClientProxy AllExcept(IReadOnlyList<string> excludedConnectionIds) => throw new NotSupportedException();
    public IClientProxy Client(string connectionId) => throw new NotSupportedException();
    public IClientProxy Clients(IReadOnlyList<string> connectionIds) => throw new NotSupportedException();
    public IClientProxy Group(string groupName) => throw new NotSupportedException();
    public IClientProxy GroupExcept(string groupName, IReadOnlyList<string> excludedConnectionIds) => throw new NotSupportedException();
    public IClientProxy Groups(IReadOnlyList<string> groupNames) => throw new NotSupportedException();
    public IClientProxy User(string userId) => throw new NotSupportedException();
    public IClientProxy Users(IReadOnlyList<string> userIds) => throw new NotSupportedException();
}

sealed class TestDatabase(string admin, string name, string connection) : IAsyncDisposable
{
    public string Connection => connection;

    public static async Task<TestDatabase> Create(string admin)
    {
        var name = "pi4_signalr_" + Guid.NewGuid().ToString("N");
        await Sql(admin, $"CREATE DATABASE \"{name}\"");
        var fixture = new TestDatabase(admin, name, new NpgsqlConnectionStringBuilder(admin) { Database = name }.ConnectionString);
        try
        {
            await Sql(fixture.Connection, await File.ReadAllTextAsync("database/01_schema.sql"));
            await Sql(fixture.Connection, await File.ReadAllTextAsync("database/02_seed.sql"));
            return fixture;
        }
        catch { await fixture.DisposeAsync(); throw; }
    }

    public async ValueTask DisposeAsync()
    {
        NpgsqlConnection.ClearAllPools();
        await Sql(admin, $"DROP DATABASE \"{name}\" WITH (FORCE)");
    }

    static async Task Sql(string connection, string sql)
    {
        await using var c = new NpgsqlConnection(connection);
        await c.OpenAsync();
        await using var command = new NpgsqlCommand(sql, c);
        await command.ExecuteNonQueryAsync();
    }
}

sealed class ApiProcess(Process process, string address) : IAsyncDisposable
{
    public string Address => address;

    public static async Task<ApiProcess> Start(string connection, string secret, string? origin = null)
    {
        // Apenas processo filho proprio e porta de loopback dinamica; nenhum servico da equipe.
        using var listener = new TcpListener(IPAddress.Loopback, 0);
        listener.Start();
        var address = "http://127.0.0.1:" + ((IPEndPoint)listener.LocalEndpoint).Port;
        listener.Stop();
        var info = new ProcessStartInfo("dotnet", "backend/Backend.Api/bin/Debug/net8.0/Backend.Api.dll")
        {
            RedirectStandardOutput = true, RedirectStandardError = true, UseShellExecute = false,
        };
        info.Environment["ASPNETCORE_URLS"] = address;
        info.Environment["ASPNETCORE_ENVIRONMENT"] = "Production";
        info.Environment["DOTNET_ENVIRONMENT"] = "Production";
        info.Environment["ConnectionStrings__DefaultConnection"] = connection;
        info.Environment["JWT_SECRET"] = secret;
        info.Environment["Logging__LogLevel__Default"] = "Warning";
        // Nao herdar origens locais por acidente.
        foreach (var key in info.Environment.Keys.Where(k => k.StartsWith("Cors__AllowedOrigins__", StringComparison.OrdinalIgnoreCase)).ToArray())
            info.Environment.Remove(key);
        if (origin is not null) info.Environment["Cors__AllowedOrigins__0"] = origin;
        var process = new Process { StartInfo = info };
        var lines = new List<string>();
        void Record(object sender, DataReceivedEventArgs e) { if (e.Data is not null) lock (lines) lines.Add(e.Data); }
        process.OutputDataReceived += Record;
        process.ErrorDataReceived += Record;
        process.Start();
        process.BeginOutputReadLine(); process.BeginErrorReadLine();
        var app = new ApiProcess(process, address);
        using var http = new HttpClient { Timeout = TimeSpan.FromSeconds(1) };
        try
        {
            for (var attempt = 0; attempt < 100; attempt++)
            {
                if (process.HasExited) throw new InvalidOperationException("API encerrou no startup: " + string.Join("\n", lines));
                try { using var response = await http.GetAsync(address + "/rota-inexistente-teste"); return app; }
                catch (HttpRequestException) { await Task.Delay(100); }
            }
            throw new TimeoutException("API nao iniciou: " + string.Join("\n", lines));
        }
        catch { await app.DisposeAsync(); throw; }
    }

    public async ValueTask DisposeAsync()
    {
        if (!process.HasExited) { process.Kill(entireProcessTree: true); await process.WaitForExitAsync(); }
        process.Dispose();
    }
}
