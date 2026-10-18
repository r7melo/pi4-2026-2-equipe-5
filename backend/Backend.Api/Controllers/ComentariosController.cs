using Microsoft.AspNetCore.Authorization;
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

    // Rota 16 — RF-11, RN-04
    [Authorize(Roles = Perfis.Todos)]
    [HttpGet("obras/{id:int}/comentarios")]
    public IActionResult Listar(int id, string? tipo)
    {
        if (tipo is not null && !Tipos.Contains(tipo))
            return Erro.Criar(400, "INVALID_PARAMETER", $"tipo '{tipo}' inválido. Valores aceitos: {string.Join(", ", Tipos)}.");
        if (banco.BuscarObra(id) is null) return ObraNaoEncontrada(id);
        if (!this.PodeVerObra(banco, id)) return this.ObraDeOutraEquipe(id);
        return Ok(banco.ListarComentarios(id, tipo));
    }

    // Rota 17 — RF-04, RF-11 (04-regras-negocio.md, seção 5)
    [Authorize(Roles = Perfis.Comentaristas)]
    [HttpPost("obras/{id:int}/comentarios")]
    public IActionResult Criar(int id, CriarComentarioEntrada e)
    {
        if (e.Tipo == "Manutencao")
            return Validacao("Comentário de manutenção é criado em POST /api/manutencoes/{id}/comentarios.");
        // Sem tipo (o front ainda envia só a descrição), vale o local onde o perfil comenta.
        var tipo = e.Tipo ?? (User.Perfil() == Perfis.Financeiro ? "Timeline" : "Cartao");
        if (!TiposCriaveis.Contains(tipo))
            return Validacao($"tipo '{tipo}' inválido. Valores aceitos: {string.Join(", ", TiposCriaveis)}.");
        if (string.IsNullOrWhiteSpace(e.Descricao))
            return Validacao("descricao é obrigatória e não pode ser vazia.");
        if (banco.BuscarObra(id) is null) return ObraNaoEncontrada(id);
        if (User.Perfil() == Perfis.Financeiro && tipo != "Timeline")
            return this.AcessoNegado("O perfil Financeiro comenta somente na timeline (tipo Timeline).", "FinanceiroForaDaTimeline");

        var comentario = banco.CriarComentario(id, tipo, e.Descricao.Trim(), this.UsuarioAtualId());
        return Created($"/api/obras/{id}/comentarios", comentario);
    }

    // Rota 18 — RF-12, RN-05
    [Authorize(Roles = Perfis.Administrador)]
    [HttpPut("comentarios/{id:int}")]
    public IActionResult Editar(int id, EditarComentarioEntrada e)
    {
        if (string.IsNullOrWhiteSpace(e.Descricao))
            return Validacao("descricao é obrigatória e não pode ser vazia.");
        var comentario = banco.EditarComentario(id, e.Descricao.Trim(), this.UsuarioAtualId());
        return comentario is null ? ComentarioNaoEncontrado(id) : Ok(comentario);
    }

    // Rota 19 — RF-12, RN-05
    [Authorize(Roles = Perfis.Administrador)]
    [HttpDelete("comentarios/{id:int}")]
    public IActionResult Excluir(int id) =>
        banco.ExcluirComentario(id, this.UsuarioAtualId()) ? NoContent() : ComentarioNaoEncontrado(id);

    static ObjectResult ObraNaoEncontrada(int id) => Erro.Criar(404, "OBRA_NOT_FOUND", $"Obra {id} não encontrada.");
    static ObjectResult ComentarioNaoEncontrado(int id) =>
        Erro.Criar(404, "COMENTARIO_NOT_FOUND", $"Comentário {id} não encontrado.");
    static ObjectResult Validacao(string mensagem) => Erro.Criar(400, "VALIDATION_ERROR", mensagem);
}
