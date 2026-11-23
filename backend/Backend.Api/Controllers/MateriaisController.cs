using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Backend.Api.Controllers;

[ApiController]
[Route("api/materiais")]
public class MateriaisController(BancoDados banco, ObrasNotificador notificador) : ControllerBase
{
    public record AtualizarMaterialEntrada(string? StatusLogistico, int? QuantidadeUtilizada);

    /// <summary>Avança o status logístico e registra a quantidade utilizada (rota 20, RF-06).</summary>
    /// <remarks>Ordem: EmSolicitacao → Comprado → EmTransito → Disponivel → Utilizado; só o próximo status é aceito (Q12).</remarks>
    [Authorize(Roles = Perfis.Administrador + "," + Perfis.Financeiro)]
    [HttpPatch("{id:int}")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ErroSaida), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ErroSaida), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Atualizar(int id, AtualizarMaterialEntrada e)
    {
        if (e.StatusLogistico is null && e.QuantidadeUtilizada is null)
            return Erro.Criar(400, "VALIDATION_ERROR", "Informe statusLogistico e/ou quantidadeUtilizada.");
        if (e.StatusLogistico is not null && !RegrasBase.StatusLogistico.Contains(e.StatusLogistico))
            return Erro.Criar(400, "INVALID_STATUS_LOGISTICO",
                $"statusLogistico '{e.StatusLogistico}' inválido. Valores aceitos: {string.Join(", ", RegrasBase.StatusLogistico)}.");
        if (e.QuantidadeUtilizada < 0)
            return Erro.Criar(400, "VALIDATION_ERROR", "quantidadeUtilizada não pode ser negativa.");
        try
        {
            var material = banco.AtualizarMaterial(id, e.StatusLogistico, e.QuantidadeUtilizada, this.UsuarioAtualId());
            await notificador.MaterialAtualizadoAsync();
            return Ok(material.Saida(veValores: true));
        }
        catch (RegraVioladaException ex)
        {
            return Erro.Criar(ex.Status, ex.Code, ex.Message);
        }
    }
}
