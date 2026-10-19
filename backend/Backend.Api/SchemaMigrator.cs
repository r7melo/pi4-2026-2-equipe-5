using System.Security.Cryptography;
using System.Text;
using Npgsql;

namespace Backend.Api;

internal static class SchemaMigrator
{
    private const string MigrationVersion = "20261018_expansao_modelo.sql";
    private const string BaselineChecksum = "baseline-schema-v1";
    private const string MigrationResource = "Backend.Api.Migrations.20261018_expansao_modelo.sql";

    public static async Task ApplyAndValidateAsync(string connectionString)
    {
        await using var connection = new NpgsqlConnection(connectionString);
        await connection.OpenAsync();
        await using var transaction = await connection.BeginTransactionAsync();

        // Serializa inicializações concorrentes da API durante deploy/restart.
        await using (var lockCommand = new NpgsqlCommand("SELECT pg_advisory_xact_lock(741205, 20261018)", connection, transaction))
            await lockCommand.ExecuteNonQueryAsync();

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

        await ValidateSchemaAsync(connection, transaction);
        await transaction.CommitAsync();
    }

    private static string ReadMigration()
    {
        using var stream = typeof(SchemaMigrator).Assembly.GetManifestResourceStream(MigrationResource)
            ?? throw new InvalidOperationException($"Recurso da migration não encontrado: {MigrationResource}.");
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
               AND EXISTS (SELECT 1 FROM pg_trigger
                           WHERE tgname = 'trg_audit_somente_insert' AND NOT tgisinternal)
               AND EXISTS (SELECT 1 FROM pg_indexes
                           WHERE schemaname = 'public' AND indexname = 'idx_audit_entidade')
            """, connection, transaction);
        if ((bool?)await command.ExecuteScalarAsync() != true)
            throw new InvalidOperationException(
                "Integridade do banco inválida: audit_log ou schema_migrations ausente/incompleto. Consulte a migration e o estado do schema.");
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
