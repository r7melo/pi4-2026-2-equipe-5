using System.Security.Cryptography;
using System.Text;
using Npgsql;

namespace Backend.Api;

internal static class SchemaMigrator
{
    private const string MigrationVersion = "20261018_expansao_modelo.sql";
    private const string BaselineChecksum = "baseline-schema-v1";
    private const string MigrationResource = "Backend.Api.Migrations.20261018_expansao_modelo.sql";
    private const string ProfileMigrationVersion = "20261031_padroniza_perfil_engenharia.sql";
    // Sprint 5 (Backend 1): cada fase confirma sozinha; a 01 precisa confirmar antes de a 03 usar EmSolicitacao.
    private static readonly string[] Sprint5 =
    [
        "20261122_01_status_em_solicitacao.sql", "20261122_02_catalogo_produtos.sql",
        "20261122_03_materiais_corte.sql", "20261122_04_equipes_temporais.sql",
        "20261122_05_redefinicao_senha.sql",
    ];
    private const string CorteMateriais = "20261122_03_materiais_corte.sql";

    public static async Task ApplyAndValidateAsync(string connectionString)
    {
        await using var connection = new NpgsqlConnection(connectionString);
        await connection.OpenAsync();

        // Serializa inicializações concorrentes da API durante deploy/restart. O lock é de sessão porque
        // as fases da Sprint 5 confirmam em transações separadas; fechar a conexão o libera.
        await using (var lockCommand = new NpgsqlCommand("SELECT pg_advisory_lock(741205, 20261018)", connection))
            await lockCommand.ExecuteNonQueryAsync();

        await using (var transaction = await connection.BeginTransactionAsync())
        {
            await ApplyBaselineAsync(connection, transaction);
            await ApplyOnceAsync(connection, transaction, ProfileMigrationVersion);
            await transaction.CommitAsync();
        }

        foreach (var version in Sprint5)
        {
            await using var transaction = await connection.BeginTransactionAsync();
            await ApplyOnceAsync(connection, transaction, version);
            await transaction.CommitAsync();
        }

        await using (var transaction = await connection.BeginTransactionAsync())
        {
            await ValidateSchemaAsync(connection, transaction);
            await transaction.CommitAsync();
        }
    }

    private static async Task ApplyBaselineAsync(NpgsqlConnection connection, NpgsqlTransaction transaction)
    {
        await using (var tableCommand = new NpgsqlCommand("""
            CREATE TABLE IF NOT EXISTS schema_migrations (
                version VARCHAR(200) PRIMARY KEY,
                checksum VARCHAR(64) NOT NULL,
                aplicado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
            )
            """, connection, transaction))
            await tableCommand.ExecuteNonQueryAsync();

        var migrationSql = ReadMigration();
        var checksum = Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(migrationSql))).ToLowerInvariant();

        string? installedChecksum;
        await using (var lookup = new NpgsqlCommand(
            "SELECT checksum FROM schema_migrations WHERE version = @version", connection, transaction))
        {
            lookup.Parameters.AddWithValue("version", MigrationVersion);
            installedChecksum = (string?)await lookup.ExecuteScalarAsync();
        }

        if (installedChecksum is null && await IsExpandedSchemaAsync(connection, transaction))
        {
            // Adota bancos que receberam a migration manualmente antes do controle de versão.
            await using var adopt = new NpgsqlCommand(
                "INSERT INTO schema_migrations (version, checksum) VALUES (@version, @checksum)", connection, transaction);
            adopt.Parameters.AddWithValue("version", MigrationVersion);
            adopt.Parameters.AddWithValue("checksum", checksum);
            await adopt.ExecuteNonQueryAsync();
            installedChecksum = checksum;
        }

        if (installedChecksum is null)
        {
            await using (var apply = new NpgsqlCommand(migrationSql, connection, transaction))
                await apply.ExecuteNonQueryAsync();
            await using var record = new NpgsqlCommand(
                "INSERT INTO schema_migrations (version, checksum) VALUES (@version, @checksum)", connection, transaction);
            record.Parameters.AddWithValue("version", MigrationVersion);
            record.Parameters.AddWithValue("checksum", checksum);
            await record.ExecuteNonQueryAsync();
        }
        else if (installedChecksum != BaselineChecksum && installedChecksum != checksum)
        {
            throw new InvalidOperationException(
                $"Checksum da migration {MigrationVersion} diverge do arquivo aplicado. Banco={installedChecksum}; arquivo={checksum}.");
        }
    }

    private static async Task ApplyOnceAsync(NpgsqlConnection connection, NpgsqlTransaction transaction, string version)
    {
        var sql = ReadMigration("Backend.Api.Migrations." + version);
        var checksum = Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(sql))).ToLowerInvariant();
        await using var lookup = new NpgsqlCommand(
            "SELECT checksum FROM schema_migrations WHERE version = @version", connection, transaction);
        lookup.Parameters.AddWithValue("version", version);
        var installedChecksum = (string?)await lookup.ExecuteScalarAsync();
        if (installedChecksum is not null)
        {
            if (installedChecksum != checksum)
                throw new InvalidOperationException(
                    $"Checksum da migration {version} diverge do arquivo aplicado. Banco={installedChecksum}; arquivo={checksum}.");
            return;
        }

        if (version == CorteMateriais) await PrepareMaterialsCutAsync(connection, transaction);

        await using (var apply = new NpgsqlCommand(sql, connection, transaction))
            await apply.ExecuteNonQueryAsync();
        await using var record = new NpgsqlCommand(
            "INSERT INTO schema_migrations (version, checksum) VALUES (@version, @checksum)", connection, transaction);
        record.Parameters.AddWithValue("version", version);
        record.Parameters.AddWithValue("checksum", checksum);
        await record.ExecuteNonQueryAsync();
    }

    // O corte exige produto em todo material. Só a fixture do seed (materiais 501 a 515) recebe o catálogo
    // de demonstração do Backend 1; em outra base o corte falha com a mensagem da migration até o mapeamento manual.
    private static async Task PrepareMaterialsCutAsync(NpgsqlConnection connection, NpgsqlTransaction transaction)
    {
        await using var check = new NpgsqlCommand("""
            SELECT NOT EXISTS (SELECT 1 FROM produto)
               AND EXISTS (SELECT 1 FROM material WHERE id_produto IS NULL)
               AND NOT EXISTS (SELECT 1 FROM material WHERE id_produto IS NULL AND id NOT BETWEEN 501 AND 515)
            """, connection, transaction);
        if ((bool?)await check.ExecuteScalarAsync() != true) return;
        await using var load = new NpgsqlCommand(
            ReadMigration("Backend.Api.Migrations.04_catalogo_demonstracao.sql"), connection, transaction);
        await load.ExecuteNonQueryAsync();
    }

    private static string ReadMigration(string resource = MigrationResource)
    {
        using var stream = typeof(SchemaMigrator).Assembly.GetManifestResourceStream(resource)
            ?? throw new InvalidOperationException($"Recurso da migration não encontrado: {resource}.");
        using var reader = new StreamReader(stream, Encoding.UTF8);
        var sql = reader.ReadToEnd();
        // A transação é controlada pelo migrador para registrar a versão atomicamente.
        sql = sql.Replace("BEGIN;", "", StringComparison.OrdinalIgnoreCase)
                 .Replace("COMMIT;", "", StringComparison.OrdinalIgnoreCase);
        return sql;
    }

    private static async Task ValidateSchemaAsync(NpgsqlConnection connection, NpgsqlTransaction transaction)
    {
        await using var command = new NpgsqlCommand("""
            SELECT to_regclass('public.audit_log') IS NOT NULL
               AND to_regclass('public.equipe_instalador') IS NOT NULL
               AND to_regclass('public.manutencao') IS NOT NULL
               AND to_regclass('public.cronograma_compartilhado') IS NOT NULL
               AND (SELECT count(*) = 7
                    FROM information_schema.columns
                    WHERE table_schema = 'public' AND table_name = 'audit_log'
                      AND column_name IN ('id', 'id_usuario', 'acao', 'entidade', 'entidade_id', 'detalhes', 'timestamp'))
               AND to_regclass('public.schema_migrations') IS NOT NULL
               AND to_regclass('public.produto') IS NOT NULL
               AND to_regclass('public.equipe_temporal') IS NOT NULL
               AND to_regclass('public.equipe_integrante') IS NOT NULL
               AND to_regclass('public.token_redefinicao_senha') IS NOT NULL
               AND EXISTS (SELECT 1 FROM pg_trigger
                           WHERE tgname = 'trg_audit_somente_insert' AND NOT tgisinternal)
               AND EXISTS (SELECT 1 FROM pg_indexes
                           WHERE schemaname = 'public' AND indexname = 'idx_audit_entidade')
               AND EXISTS (SELECT 1 FROM pg_enum WHERE enumtypid = 'public.nome_perfil_enum'::regtype
                           AND enumlabel = 'Engenharia')
               AND NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumtypid = 'public.nome_perfil_enum'::regtype
                               AND enumlabel = 'EngenhariaObras')
            """, connection, transaction);
        if ((bool?)await command.ExecuteScalarAsync() != true)
            throw new InvalidOperationException(
                "Integridade do banco inválida: audit_log, schema_migrations ou tabelas da Sprint 5 ausentes/incompletos. Consulte a migration e o estado do schema.");
    }

    private static async Task<bool> IsExpandedSchemaAsync(NpgsqlConnection connection, NpgsqlTransaction transaction)
    {
        await using var command = new NpgsqlCommand("""
            SELECT to_regclass('public.audit_log') IS NOT NULL
               AND to_regclass('public.equipe_instalador') IS NOT NULL
               AND to_regclass('public.manutencao') IS NOT NULL
               AND to_regclass('public.cronograma_compartilhado') IS NOT NULL
               AND EXISTS (SELECT 1 FROM information_schema.columns
                           WHERE table_schema = 'public' AND table_name = 'cliente' AND column_name = 'cpf_cnpj')
               AND EXISTS (SELECT 1 FROM information_schema.columns
                           WHERE table_schema = 'public' AND table_name = 'usuario' AND column_name = 'bloqueado_ate')
               AND EXISTS (SELECT 1 FROM pg_trigger
                           WHERE tgname = 'trg_audit_somente_insert' AND NOT tgisinternal)
            """, connection, transaction);
        return (bool?)await command.ExecuteScalarAsync() == true;
    }
}
