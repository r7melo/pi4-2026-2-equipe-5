using Microsoft.AspNetCore.Mvc;

namespace Backend.Api.Controllers;

[ApiController]
[Route("api")]
public class ComentariosController(BancoDados banco) : ControllerBase
{
    static readonly string[] Tipos = ["Cartao", "Manutencao", "Timeline"];
    // Comentário de manutenção é criado pela rota do instalador (#35), não por esta.
    static readonly string[] TiposCriaveis = ["Cartao", "Timeline"];

    public record CriarComentarioEntrada(string? Tipo, string? Descricao);
    public record EditarComentarioEntrada(string? Descricao);

    // Rota 16 — RF-11
    [HttpGet("obras/{id:int}/comentarios")]
    public IActionResult Listar(int id, string? tipo)
    {
        if (tipo is not null && !Tipos.Contains(tipo))
            return Erro.Criar(400, "INVALID_PARAMETER", $"tipo '{tipo}' inválido. Valores aceitos: {string.Join(", ", Tipos)}.");
        if (banco.BuscarObra(id) is null) return ObraNaoEncontrada(id);
        return Ok(banco.ListarComentarios(id, tipo));
    }

    // Rota 17 — RF-04, RF-11
    [HttpPost("obras/{id:int}/comentarios")]
    public IActionResult Criar(int id, CriarComentarioEntrada e)
    {
        if (e.Tipo == "Manutencao")
            return Validacao("Comentário de manutenção é criado em POST /api/manutencoes/{id}/comentarios.");
        if (e.Tipo is null || !TiposCriaveis.Contains(e.Tipo))
            return Validacao($"tipo é obrigatório. Valores aceitos: {string.Join(", ", TiposCriaveis)}.");
        if (string.IsNullOrWhiteSpace(e.Descricao))
            return Validacao("descricao é obrigatória e não pode ser vazia.");
        if (banco.BuscarObra(id) is null) return ObraNaoEncontrada(id);

        var comentario = banco.CriarComentario(id, e.Tipo, e.Descricao.Trim(), banco.UsuarioAtualId(Request));
        return Created($"/api/obras/{id}/comentarios", comentario);
    }

    // Rota 18 — RF-12
    [HttpPut("comentarios/{id:int}")]
    public IActionResult Editar(int id, EditarComentarioEntrada e)
    {
        if (string.IsNullOrWhiteSpace(e.Descricao))
            return Validacao("descricao é obrigatória e não pode ser vazia.");
        var comentario = banco.EditarComentario(id, e.Descricao.Trim(), banco.UsuarioAtualId(Request));
        return comentario is null ? ComentarioNaoEncontrado(id) : Ok(comentario);
    }

    // Rota 19 — RF-12
    [HttpDelete("comentarios/{id:int}")]
    public IActionResult Excluir(int id) =>
        banco.ExcluirComentario(id, banco.UsuarioAtualId(Request)) ? NoContent() : ComentarioNaoEncontrado(id);

    static ObjectResult ObraNaoEncontrada(int id) => Erro.Criar(404, "OBRA_NOT_FOUND", $"Obra {id} não encontrada.");
    static ObjectResult ComentarioNaoEncontrado(int id) =>
        Erro.Criar(404, "COMENTARIO_NOT_FOUND", $"Comentário {id} não encontrado.");
    static ObjectResult Validacao(string mensagem) => Erro.Criar(400, "VALIDATION_ERROR", mensagem);
}
