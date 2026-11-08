using System.Diagnostics;
using System.Net;
using System.Net.Http.Headers;
using System.Net.Sockets;
using System.Text;
using Backend.Api;
using Microsoft.AspNetCore.Http.Connections;
using Microsoft.AspNetCore.SignalR.Client;
using Microsoft.Extensions.Logging;
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

Console.WriteLine($"Resultado SignalR: {passed} grupos aprovados; {failed} reprovados.");
Environment.ExitCode = failed == 0 ? 0 : 1;

async Task Case(string name, Func<Task> test)
{
    try { await test(); passed++; Console.WriteLine("PASSOU: " + name); }
    catch (Exception error) { failed++; Console.WriteLine($"FALHOU: {name}: {error}"); }
}

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
