using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Backend.Api.Controllers;

// Catálogo de produtos (RF-25). Preço só para Administrador e Financeiro (RF-26, RN-07).
[ApiController]
[Route("api/produtos")]
public class ProdutosController(BancoDados banco) : ControllerBase
{
    const string Financas = Perfis.Administrador + "," + Perfis.Financeiro;

    public record ProdutoEntrada(string? Nome, string? Tipo, string? Unidade, decimal? PrecoUnitario, bool? Ativo);

    /// <summary>Lista os produtos do catálogo (rota 20a). Engenharia recebe sem precoUnitario.</summary>
    /// <param name="nome">Parte do nome.</param>
    /// <param name="tipo">Tipo exato (ex.: Painel).</param>
    /// <param name="incluirInativos">Só Administrador e Financeiro.</param>
    [Authorize(Roles = Perfis.Leitura)]
    [HttpGet]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public IActionResult Listar(string? nome, string? tipo, bool incluirInativos = false)
    {
        var veValores = User.VeValores();
        if (incluirInativos && !veValores)
            return this.AcessoNegado("Só Administrador e Financeiro listam produtos desativados.", "ProdutosInativos");
        return Ok(banco.ListarProdutos(nome, tipo, incluirInativos).Select(p => p.Saida(veValores)));
    }

    /// <summary>Cadastra produto no catálogo (rota 20b).</summary>
    [Authorize(Roles = Financas)]
    [HttpPost]
    [ProducesResponseType(StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(ErroSaida), StatusCodes.Status400BadRequest)]
    public IActionResult Criar(ProdutoEntrada e)
    {
        var erro = Validar(e, novo: true);
        if (erro is not null) return erro;
        var produto = banco.CriarProduto(e.Nome!.Trim(), e.Tipo!.Trim(), e.Unidade!.Trim(), e.PrecoUnitario!.Value,
            this.UsuarioAtualId());
        return Created($"/api/produtos/{produto.Id}", produto.Saida(veValores: true));
    }

    /// <summary>Altera ou desativa produto (rota 20c). Mudar o preço não altera materiais já incluídos (Q13).</summary>
    [Authorize(Roles = Financas)]
    [HttpPut("{id:int}")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ErroSaida), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ErroSaida), StatusCodes.Status404NotFound)]
    public IActionResult Editar(int id, ProdutoEntrada e)
    {
        var erro = Validar(e, novo: false);
        if (erro is not null) return erro;
        var produto = banco.EditarProduto(id, e.Nome?.Trim(), e.Tipo?.Trim(), e.Unidade?.Trim(), e.PrecoUnitario,
            e.Ativo, this.UsuarioAtualId());
        return produto is null
            ? Erro.Criar(404, "PRODUTO_NOT_FOUND", $"Produto {id} não encontrado.")
            : Ok(produto.Saida(veValores: true));
    }

    // No cadastro tudo é obrigatório; na edição, campo omitido mantém o valor atual.
    static ObjectResult? Validar(ProdutoEntrada e, bool novo)
    {
        foreach (var (campo, valor, maximo) in new[] { ("nome", e.Nome, 200), ("tipo", e.Tipo, 200), ("unidade", e.Unidade, 30) })
            if ((novo || valor is not null) && (string.IsNullOrWhiteSpace(valor) || valor.Trim().Length > maximo))
                return Erro.Criar(400, "VALIDATION_ERROR", $"{campo} é obrigatório e deve ter no máximo {maximo} caracteres.");
        if (novo && e.PrecoUnitario is null)
            return Erro.Criar(400, "VALIDATION_ERROR", "precoUnitario é obrigatório.");
        if (e.PrecoUnitario is < 0 or >= 10_000_000_000m)
            return Erro.Criar(400, "VALIDATION_ERROR", "precoUnitario deve ser zero ou positivo e menor que 10.000.000.000.");
        return null;
    }
}
