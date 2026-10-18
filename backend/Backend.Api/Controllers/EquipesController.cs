using Microsoft.AspNetCore.Mvc;

namespace Backend.Api.Controllers;

[ApiController]
[Route("api/equipes")]
public class EquipesController(BancoDados banco) : ControllerBase
{
    // Rota 20 — RF-07
    [HttpGet]
    public IActionResult Listar(DateOnly? dataInicio, DateOnly? dataFim)
    {
        if ((dataInicio is null) != (dataFim is null))
            return Erro.Criar(400, "INVALID_PARAMETER", "Informe dataInicio e dataFim juntos para consultar a ocupação.");
        if (dataFim < dataInicio)
            return Erro.Criar(400, "INVALID_PARAMETER", "dataFim não pode ser anterior a dataInicio.");
        return Ok(banco.ListarEquipes(dataInicio, dataFim));
    }
}
