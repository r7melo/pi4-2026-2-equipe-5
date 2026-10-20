using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Backend.Api.Controllers;

[ApiController]
[Route("api/programacoes")]
public class ProgramacoesController(BancoDados banco, ObrasNotificador notificador) : ControllerBase
{
    public record AlocarEntrada(int? ObraId, int? EquipeId, DateOnly? DataInicio, int? Prioridade);
    public record ReordenarEntrada(DateOnly? NovaDataInicio);

    // Rota 22 — RF-07, RF-08, RN-04
    [Authorize(Roles = Perfis.Todos)]
    [HttpGet]
    public IActionResult Listar(DateOnly? dataInicio, DateOnly? dataFim, int? equipeId)
    {
        if (dataFim < dataInicio)
            return Erro.Criar(400, "INVALID_PARAMETER", "dataFim não pode ser anterior a dataInicio.");
        // O instalador vê só a própria equipe.
        if (User.Instalador())
        {
            var propria = User.EquipeId();
            if (propria is null || equipeId is not null && equipeId != propria)
                return this.AcessoNegado("O instalador só consulta o cronograma da própria equipe.", "CronogramaDeOutraEquipe");
            equipeId = propria;
        }
        return Ok(banco.ListarProgramacoes(dataInicio, dataFim, equipeId));
    }

    // Rota 23 — RF-07, RF-08, RF-10
    [Authorize(Roles = Perfis.Gestao)]
    [HttpPost]
    public async Task<IActionResult> Alocar(AlocarEntrada e)
    {
        if (e.ObraId is null || e.EquipeId is null || e.DataInicio is null)
            return Validacao("obraId, equipeId e dataInicio são obrigatórios.");
        if (e.Prioridade is <= 0)
            return Validacao("prioridade deve ser maior que zero.");
        if (!Gantt.DiaUtil(e.DataInicio.Value))
            return Validacao("dataInicio precisa ser um dia útil (segunda a sexta).");
        try
        {
            var programacao = banco.CriarProgramacao(e.ObraId.Value, e.EquipeId.Value, e.DataInicio.Value,
                e.Prioridade ?? 1, this.UsuarioAtualId());
            await notificador.NotificarAtualizacaoAsync(programacao.ObraId);
            return Created($"/api/programacoes/{programacao.Id}", programacao);
        }
        catch (RegraVioladaException ex)
        {
            return Erro.Criar(ex.Status, ex.Code, ex.Message);
        }
    }

    // Rota 24 — RF-09
    [Authorize(Roles = Perfis.Gestao)]
    [HttpPut("{id:int}/reordenar")]
    public async Task<IActionResult> Reordenar(int id, ReordenarEntrada e)
    {
        if (e.NovaDataInicio is null)
            return Validacao("novaDataInicio é obrigatória.");
        if (!Gantt.DiaUtil(e.NovaDataInicio.Value))
            return Validacao("novaDataInicio precisa ser um dia útil (segunda a sexta).");
        try
        {
            var reordenacao = banco.Reordenar(id, e.NovaDataInicio.Value);
            if (reordenacao is not null) await notificador.NotificarAgendaAtualizadaAsync();
            return reordenacao is null
                ? Erro.Criar(404, "PROGRAMACAO_NOT_FOUND", $"Programação {id} não encontrada.")
                : Ok(reordenacao);
        }
        catch (RegraVioladaException ex)
        {
            return Erro.Criar(ex.Status, ex.Code, ex.Message);
        }
    }

    static ObjectResult Validacao(string mensagem) => Erro.Criar(400, "VALIDATION_ERROR", mensagem);
}
