using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Backend.Api.Controllers;

// Disponibilidade e ocupação dos instaladores para montar as equipes (RF-07, RN-10).
[ApiController]
[Route("api")]
public class AgendaController(BancoDados banco) : ControllerBase
{
    /// <summary>Instaladores ativos e, com período, quem está ocupado e em quais obras (rota 26).</summary>
    [Authorize(Roles = Perfis.Gestao)]
    [HttpGet("instaladores/disponibilidade")]
    [ProducesResponseType(typeof(List<DisponibilidadeBanco>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ErroSaida), StatusCodes.Status400BadRequest)]
    public IActionResult Disponibilidade(DateOnly? dataInicio, DateOnly? dataFim)
    {
        if ((dataInicio is null) != (dataFim is null))
            return Erro.Criar(400, "INVALID_PARAMETER", "Informe dataInicio e dataFim juntos.");
        if (dataFim < dataInicio)
            return Erro.Criar(400, "INVALID_PARAMETER", "dataFim não pode ser anterior a dataInicio.");
        return Ok(banco.ListarDisponibilidade(dataInicio, dataFim));
    }

    /// <summary>Ocupação dos instaladores por dia útil e por instalador no período (rota 28a).</summary>
    [Authorize(Roles = Perfis.Leitura)]
    [HttpGet("gantt/ocupacao")]
    [ProducesResponseType(typeof(OcupacaoGanttBanco), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ErroSaida), StatusCodes.Status400BadRequest)]
    public IActionResult Ocupacao(DateOnly? dataInicio, DateOnly? dataFim)
    {
        if (dataInicio is null || dataFim is null)
            return Erro.Criar(400, "INVALID_PARAMETER", "dataInicio e dataFim são obrigatórios.");
        if (dataFim < dataInicio || dataFim.Value.DayNumber - dataInicio.Value.DayNumber > 366)
            return Erro.Criar(400, "INVALID_PARAMETER", "Informe um período de até um ano, com dataFim depois de dataInicio.");
        return Ok(banco.Ocupacao(dataInicio.Value, dataFim.Value));
    }
}
