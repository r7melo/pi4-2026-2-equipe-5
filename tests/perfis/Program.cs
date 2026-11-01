using System.Net;
using System.Net.Http.Headers;
using System.Reflection;
using System.Security.Claims;
using System.Text.Json;
using Backend.Api;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Hosting.Server;
using Microsoft.AspNetCore.Hosting.Server.Features;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.IdentityModel.JsonWebTokens;
using Microsoft.IdentityModel.Tokens;
using Npgsql;

// Executar apenas contra um servidor de teste: cria e remove bancos com nomes aleatorios proprios.
var adminConnection = Environment.GetEnvironmentVariable("PERFIS_TEST_ADMIN_CONNECTION")
    ?? throw new InvalidOperationException("Defina PERFIS_TEST_ADMIN_CONNECTION para um PostgreSQL de testes com CREATE DATABASE.");
var repository = Directory.GetCurrentDirectory();
if (!File.Exists(Path.Combine(repository, "database", "01_schema.sql")))
    throw new InvalidOperationException("Execute o teste a partir da raiz do repositorio.");
var schema = await File.ReadAllTextAsync(Path.Combine(repository, "database", "01_schema.sql"));
var seed = await File.ReadAllTextAsync(Path.Combine(repository, "database", "02_seed.sql"));
const string profileVersion = "20261031_padroniza_perfil_engenharia.sql";
const string oldVersion = "20261018_expansao_modelo.sql";
const string secret = "segredo-isolado-dos-testes-de-perfis-2026";
var passed = 0;
var failed = 0;

await Case("Banco novo: seed canonico, hash e reinicializacao", () => Database(false, async connection =>
{
    var before = await Snapshot(connection);
    await Migrate(connection);
    var appliedAt = await Scalar<DateTime>(connection, $"SELECT aplicado_em FROM schema_migrations WHERE version = '{profileVersion}'");
    await Migrate(connection);
    Check(appliedAt == await Scalar<DateTime>(connection, $"SELECT aplicado_em FROM schema_migrations WHERE version = '{profileVersion}'"), "Reinicializacao reaplicou a migracao.");
    Check(before == await Snapshot(connection), "A migracao alterou dados do banco novo.");
    await CheckCanonical(connection);
    var user = new BancoDados(connection).BuscarUsuarioPorEmail("engenharia@zlengenharia.com")!;
    Check(user.PerfilId == 2 && user.NomePerfil == Perfis.Engenharia, "Perfil do seed divergente.");
    Check(BCrypt.Net.BCrypt.Verify("Senha123!", user.SenhaHash), "Senha documentada do seed nao confere.");
    Check(!BCrypt.Net.BCrypt.Verify("senha-incorreta", user.SenhaHash), "Hash aceitou senha incorreta.");
}));

await Case("Banco expandido legado: preserva IDs, hashes, bloqueio, inativos e vinculos", () => Database(true, async connection =>
{
    await Sql(connection, "UPDATE usuario SET ativo = FALSE, tentativas_login = 3, bloqueado_ate = TIMESTAMP '2026-12-01 10:00:00' WHERE id = 6");
    var before = await Snapshot(connection);
    await Migrate(connection);
    var appliedAt = await Scalar<DateTime>(connection, $"SELECT aplicado_em FROM schema_migrations WHERE version = '{profileVersion}'");
    await Migrate(connection);
    Check(appliedAt == await Scalar<DateTime>(connection, $"SELECT aplicado_em FROM schema_migrations WHERE version = '{profileVersion}'"), "Reinicializacao alterou aplicado_em.");
    Check(before == await Snapshot(connection), "Dados legados foram alterados alem do rotulo do perfil.");
    await CheckCanonical(connection);
    Check(await Scalar<string>(connection, "SELECT nome_perfil::text FROM perfil_acesso WHERE id = 2") == "Engenharia", "ID 2 nao foi preservado.");
    Check(!await Scalar<bool>(connection, "SELECT ativo FROM usuario WHERE id = 6"), "Conta inativa foi reativada.");
}));

await Case("Adota expansao manual sem reaplicar SQL antigo", () => Database(true, async connection =>
{
    await Sql(connection, "DELETE FROM schema_migrations");
    var before = await Snapshot(connection);
    await Migrate(connection);
    Check(before == await Snapshot(connection), "A adocao alterou dados existentes.");
    await CheckCanonical(connection);
    Check(await Scalar<string>(connection, $"SELECT checksum FROM schema_migrations WHERE version = '{oldVersion}'") != "baseline-schema-v1", "Expansao manual nao foi adotada com checksum.");
}));

await Case("Checksum antigo divergente bloqueia antes de renomear", () => Database(true, async connection =>
{
    await Sql(connection, $"UPDATE schema_migrations SET checksum = '{new string('0', 64)}'");
    await Throws<InvalidOperationException>(() => Migrate(connection));
    Check(await Scalar<string>(connection, "SELECT nome_perfil::text FROM perfil_acesso WHERE id = 2") == "EngenhariaObras", "Falha de checksum alterou perfil.");
    Check(await Scalar<long>(connection, $"SELECT count(*) FROM schema_migrations WHERE version = '{profileVersion}'") == 0, "Versao nova foi registrada apesar da falha.");
}));

await Case("Checksum novo divergente bloqueia reinicializacao", () => Database(false, async connection =>
{
    await Migrate(connection);
    await Sql(connection, $"UPDATE schema_migrations SET checksum = '{new string('0', 64)}' WHERE version = '{profileVersion}'");
    var before = await Snapshot(connection);
    await Throws<InvalidOperationException>(() => Migrate(connection));
    Check(before == await Snapshot(connection), "Falha de checksum novo alterou dados.");
}));

await Case("Perfis ambiguos recusados e adocao revertida atomicamente", () => Database(true, async connection =>
{
    await Sql(connection, "ALTER TYPE nome_perfil_enum ADD VALUE 'Engenharia'");
    await Sql(connection, "DELETE FROM schema_migrations");
    var before = await Snapshot(connection);
    await Throws<PostgresException>(() => Migrate(connection));
    Check(await Scalar<long>(connection, "SELECT count(*) FROM schema_migrations") == 0, "Transacao deixou versoes parciais.");
    Check(before == await Snapshot(connection), "Falha de migracao alterou dados.");
}));

await Case("JWT real: novo/legado, perfis distintos, expirado e assinatura invalida", () => Database(true, async connection =>
{
    await Migrate(connection);
    var builder = WebApplication.CreateBuilder();
    builder.Logging.ClearProviders();
    builder.WebHost.UseUrls("http://127.0.0.1:0");
    builder.Configuration.AddInMemoryCollection(new Dictionary<string, string?> { ["JWT_SECRET"] = secret });
    var auth = new Autenticacao(builder.Configuration, builder.Environment);
    builder.Services.AddSingleton(new BancoDados(connection));
    builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme).AddJwtBearer(auth.Configurar);
    builder.Services.AddAuthorization();
    await using var app = builder.Build();
    app.UseAuthentication();
    app.UseAuthorization();
    app.MapGet("/engenharia", (ClaimsPrincipal principal) => new { perfil = principal.Perfil(), id = principal.UsuarioId() })
        .RequireAuthorization(policy => policy.RequireRole(Perfis.Engenharia));
    app.MapGet("/financeiro", () => "permitido").RequireAuthorization(policy => policy.RequireRole(Perfis.Financeiro));
    await app.StartAsync();
    var address = app.Services.GetRequiredService<IServer>().Features.Get<IServerAddressesFeature>()!.Addresses.Single();
    using var http = new HttpClient { BaseAddress = new Uri(address) };
    try
    {
        var user = new BancoDados(connection).BuscarUsuarioPorId(2)!;
        var (newToken, _) = auth.GerarToken(user);
        Check(new JsonWebToken(newToken).GetClaim(Autenticacao.ClaimPerfil).Value == "Engenharia", "JWT novo nao e canonico.");
        var legacy = Token("EngenhariaObras", auth.Chave);
        foreach (var token in new[] { newToken, legacy })
        {
            using var response = await Get("/engenharia", token);
            Check(response.StatusCode == HttpStatusCode.OK, "Engenharia perdeu acesso com token valido.");
            using var body = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
            Check(body.RootElement.GetProperty("perfil").GetString() == "Engenharia", "Claim legada nao foi normalizada.");
            using var forbidden = await Get("/financeiro", token);
            Check(forbidden.StatusCode == HttpStatusCode.Forbidden, "Normalizacao concedeu acesso financeiro.");
        }
        using var finance = await Get("/engenharia", Token(Perfis.Financeiro, auth.Chave));
        Check(finance.StatusCode == HttpStatusCode.Forbidden, "Perfil Financeiro foi elevado para Engenharia.");
        using var forged = await Get("/engenharia", Token("EngenhariaObras", new SymmetricSecurityKey(System.Text.Encoding.UTF8.GetBytes("outra-chave-sem-relacao-com-a-chave-valida-2026"))));
        Check(forged.StatusCode == HttpStatusCode.Unauthorized, "Token com assinatura invalida foi aceito.");
        using var expired = await Get("/engenharia", Token("EngenhariaObras", auth.Chave, expired: true));
        Check(expired.StatusCode == HttpStatusCode.Unauthorized, "Token legado expirado foi aceito.");
        using var anonymous = await Get("/engenharia", null);
        Check(anonymous.StatusCode == HttpStatusCode.Unauthorized, "Rota aceita requisicao anonima.");
    }
    finally { await app.StopAsync(); }

    async Task<HttpResponseMessage> Get(string route, string? token)
    {
        using var request = new HttpRequestMessage(HttpMethod.Get, route);
        if (token is not null) request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        return await http.SendAsync(request);
    }
}));

Console.WriteLine($"Resultado: {passed} casos aprovados; {failed} reprovados.");
Environment.ExitCode = failed == 0 ? 0 : 1;

async Task Case(string name, Func<Task> test)
{
    try { await test(); passed++; Console.WriteLine($"PASSOU: {name}"); }
    catch (Exception error) { failed++; Console.WriteLine($"FALHOU: {name}: {error}"); }
}

async Task Database(bool legacy, Func<string, Task> test)
{
    var name = "pi4_perfis_" + Guid.NewGuid().ToString("N");
    var target = new NpgsqlConnectionStringBuilder(adminConnection) { Database = name }.ConnectionString;
    await Sql(adminConnection, $"CREATE DATABASE \"{name}\"");
    try
    {
        await Sql(target, legacy ? schema.Replace("'Engenharia'", "'EngenhariaObras'") : schema);
        await Sql(target, legacy ? seed.Replace("'Engenharia'", "'EngenhariaObras'") : seed);
        await test(target);
    }
    finally
    {
        // O nome e gerado aqui; nunca remove o banco informado pelo operador.
        NpgsqlConnection.ClearAllPools();
        await Sql(adminConnection, $"DROP DATABASE \"{name}\" WITH (FORCE)");
    }
}

static async Task Migrate(string connection)
{
    var migrator = typeof(BancoDados).Assembly.GetType("Backend.Api.SchemaMigrator", throwOnError: true)!;
    var method = migrator.GetMethod("ApplyAndValidateAsync", BindingFlags.Public | BindingFlags.Static)!;
    await (Task)method.Invoke(null, new object[] { connection })!;
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

static async Task<string> Snapshot(string connection)
{
    var tables = new[] { "perfil_acesso", "usuario", "equipe", "equipe_instalador", "cliente", "obra", "pagamento", "material", "comentario", "historico_obra", "programacao_obra", "relatorio_custo", "manutencao", "audit_log", "cronograma_compartilhado" };
    var rows = new List<string>();
    foreach (var table in tables)
        rows.Add(await Scalar<string>(connection, $"SELECT COALESCE(jsonb_agg(to_jsonb(t) ORDER BY to_jsonb(t)::text), '[]'::jsonb)::text FROM public.\"{table}\" t"));
    // A unica diferenca permitida nos dados de negocio e o rotulo canonico.
    return string.Join("\n", rows).Replace("\"EngenhariaObras\"", "\"Engenharia\"");
}

async Task CheckCanonical(string connection)
{
    Check(await Scalar<long>(connection, $"SELECT count(*) FROM schema_migrations WHERE version = '{profileVersion}'") == 1, "Migracao nova nao registrada exatamente uma vez.");
    Check(await Scalar<long>(connection, "SELECT count(*) FROM pg_enum WHERE enumtypid = 'public.nome_perfil_enum'::regtype AND enumlabel = 'Engenharia'") == 1, "Enum canonico ausente.");
    Check(await Scalar<long>(connection, "SELECT count(*) FROM pg_enum WHERE enumtypid = 'public.nome_perfil_enum'::regtype AND enumlabel = 'EngenhariaObras'") == 0, "Enum legado permanece.");
}

static string Token(string role, SecurityKey key, bool expired = false) => new JsonWebTokenHandler().CreateToken(new SecurityTokenDescriptor
{
    Claims = new Dictionary<string, object> { [Autenticacao.ClaimId] = "2", [Autenticacao.ClaimPerfil] = role },
    IssuedAt = DateTime.UtcNow.AddMinutes(-30),
    NotBefore = DateTime.UtcNow.AddMinutes(-30),
    Expires = DateTime.UtcNow.AddMinutes(expired ? -1 : 10),
    SigningCredentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256),
});

static void Check(bool condition, string message)
{
    if (!condition) throw new InvalidOperationException(message);
}

static async Task Throws<T>(Func<Task> action) where T : Exception
{
    try { await action(); }
    catch (T) { return; }
    throw new InvalidOperationException($"Esperada excecao {typeof(T).Name}.");
}
