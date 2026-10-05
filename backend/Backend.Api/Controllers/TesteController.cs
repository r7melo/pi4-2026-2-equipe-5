using Microsoft.AspNetCore.Mvc;
using Npgsql;

namespace Backend.Api.Controllers;

[ApiController]
[Route("api/teste")]
public class TesteController : ControllerBase
{
    private readonly IConfiguration _configuration;

    public TesteController(IConfiguration configuration)
    {
        _configuration = configuration;
    }

    // GET /api/teste/obras
    [HttpGet("obras")]
    public async Task<IActionResult> ListarObras()
    {
        var connectionString =
            _configuration.GetConnectionString("DefaultConnection");

        await using var connection = new NpgsqlConnection(connectionString);
        await connection.OpenAsync();

        const string sql = """
            SELECT
                id,
                status,
                categoria,
                quantidade_paineis,
                data_inicio_estimada,
                data_fim_estimada,
                data_inicio_real
            FROM obra
            ORDER BY id;
            """;

        await using var command = new NpgsqlCommand(sql, connection);
        await using var reader = await command.ExecuteReaderAsync();

        var obras = new List<object>();

        while (await reader.ReadAsync())
        {
            obras.Add(new
            {
                id = reader.GetInt32(0),

                status = reader.GetString(1),

                categoria = reader.IsDBNull(2)
                    ? null
                    : reader.GetString(2),

                quantidadePaineis = reader.GetInt32(3),

                dataInicioEstimada = reader.IsDBNull(4)
                    ? (DateOnly?)null
                    : reader.GetFieldValue<DateOnly>(4),

                dataFimEstimada = reader.IsDBNull(5)
                    ? (DateOnly?)null
                    : reader.GetFieldValue<DateOnly>(5),

                dataInicioReal = reader.IsDBNull(6)
                    ? (DateOnly?)null
                    : reader.GetFieldValue<DateOnly>(6)
            });
        }

        return Ok(obras);
    }

    // GET /api/teste/obras/{id}
    [HttpGet("obras/{id:int}")]
    public async Task<IActionResult> BuscarObra(int id)
    {
        var connectionString =
            _configuration.GetConnectionString("DefaultConnection");

        await using var connection = new NpgsqlConnection(connectionString);
        await connection.OpenAsync();

        const string sql = """
            SELECT
                id,
                status,
                categoria,
                quantidade_paineis,
                data_inicio_estimada,
                data_fim_estimada,
                data_inicio_real
            FROM obra
            WHERE id = @id;
            """;

        await using var command = new NpgsqlCommand(sql, connection);

        command.Parameters.AddWithValue("id", id);

        await using var reader = await command.ExecuteReaderAsync();

        if (!await reader.ReadAsync())
        {
            return NotFound(new
            {
                mensagem = $"Obra {id} não encontrada."
            });
        }

        var obra = new
        {
            id = reader.GetInt32(0),

            status = reader.GetString(1),

            categoria = reader.IsDBNull(2)
                ? null
                : reader.GetString(2),

            quantidadePaineis = reader.GetInt32(3),

            dataInicioEstimada = reader.IsDBNull(4)
                ? (DateOnly?)null
                : reader.GetFieldValue<DateOnly>(4),

            dataFimEstimada = reader.IsDBNull(5)
                ? (DateOnly?)null
                : reader.GetFieldValue<DateOnly>(5),

            dataInicioReal = reader.IsDBNull(6)
                ? (DateOnly?)null
                : reader.GetFieldValue<DateOnly>(6)
        };

        return Ok(obra);
    }
}