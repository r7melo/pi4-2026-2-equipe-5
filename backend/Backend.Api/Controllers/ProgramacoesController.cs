using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Backend.Api.Controllers;

// Cronograma com equipe temporal (RF-07 a RF-10): cada programação tem a sua equipe.
[ApiController]
[Route("api/programacoes")]
public class ProgramacoesController(BancoDados banco, ObrasNotificador notificador) : ControllerBase
{
    public record ProgramarEntrada(int? ObraId, DateOnly? DataInicio, int? Prioridade, int? PessoasPrevistas,
        int[]? IntegrantesIds);
    public record ReordenarEntrada(DateOnly? NovaDataInicio);
    public record IntegranteEntrada(int? UsuarioId, DateOnly? DataEntrada, DateOnly? DataSaida);
    public record DatasIntegranteEntrada(DateOnly? DataEntrada, DateOnly? DataSaida);
    public record EquipeEntrada(int? PessoasPrevistas);

    /// <summary>Cronograma consolidado com a equipe de cada programação (rota 28, RF-07 e RF-08).</summary>
    /// <remarks>O instalador vê só as programações cujas equipes integra ou integrou.</remarks>
    [Authorize(Roles = Perfis.Todos)]
    [HttpGet]
    [ProducesResponseType(typeof(List<ProgramacaoBanco>), StatusCodes.Status200OK)]
    public IActionResult Listar(DateOnly? dataInicio, DateOnly? dataFim, int? instaladorId)
    {
        if (dataFim < dataInicio)
            return Erro.Criar(400, "INVALID_PARAMETER", "dataFim não pode ser anterior a dataInicio.");
        if (User.Instalador())
        {
            if (instaladorId is not null && instaladorId != this.UsuarioAtualId())
                return this.AcessoNegado("O instalador só consulta o próprio cronograma.", "CronogramaDeOutroInstalador");
            instaladorId = this.UsuarioAtualId();
        }
        return Ok(banco.ListarProgramacoes(dataInicio, dataFim, instaladorId));
    }

    /// <summary>Programa a obra no Gantt com a equipe prevista e, se quiser, os integrantes (rota 29).</summary>
    /// <remarks>Duração = painéis ÷ 9 em dias úteis (RN-01, RN-02). Obra Separado vai para EmAndamento (RF-10).
    /// Se algum integrante estiver ocupado no período, nada é gravado (409).</remarks>
    [Authorize(Roles = Perfis.Gestao)]
    [HttpPost]
    [ProducesResponseType(typeof(ProgramacaoBanco), StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(ErroSaida), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ErroSaida), StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(ErroSaida), StatusCodes.Status409Conflict)]
    public async Task<IActionResult> Programar(ProgramarEntrada e)
    {
        if (e.ObraId is null || e.DataInicio is null)
            return Validacao("obraId e dataInicio são obrigatórios.");
        if (e.Prioridade is <= 0)
            return Validacao("prioridade deve ser maior que zero.");
        if (e.PessoasPrevistas is <= 0)
            return Validacao("pessoasPrevistas deve ser maior que zero.");
        if (!Gantt.DiaUtil(e.DataInicio.Value))
            return Validacao("dataInicio precisa ser um dia útil (segunda a sexta).");
        var integrantes = e.IntegrantesIds ?? [];
        if (integrantes.Distinct().Count() != integrantes.Length)
            return Erro.Criar(400, "INTEGRANTE_INVALIDO", "integrantesIds não pode repetir instalador.");
        return await Executar(async () =>
        {
            var programacao = banco.CriarProgramacao(e.ObraId.Value, e.DataInicio.Value, e.Prioridade ?? 1,
                e.PessoasPrevistas ?? Math.Max(1, integrantes.Length), integrantes, this.UsuarioAtualId());
            await notificador.ProgramacaoCriadaAsync();
            return Created($"/api/programacoes/{programacao.Id}", programacao);
        });
    }

    /// <summary>Reordena a programação e propaga para as seguintes com integrantes em comum (rota 30, RF-09).</summary>
    [Authorize(Roles = Perfis.Gestao)]
    [HttpPut("{id:int}/reordenar")]
    [ProducesResponseType(typeof(ReordenacaoBanco), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ErroSaida), StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(ErroSaida), StatusCodes.Status409Conflict)]
    public async Task<IActionResult> Reordenar(int id, ReordenarEntrada e)
    {
        if (e.NovaDataInicio is null)
            return Validacao("novaDataInicio é obrigatória.");
        if (!Gantt.DiaUtil(e.NovaDataInicio.Value))
            return Validacao("novaDataInicio precisa ser um dia útil (segunda a sexta).");
        return await Executar(async () =>
        {
            var reordenacao = banco.Reordenar(id, e.NovaDataInicio.Value, this.UsuarioAtualId());
            if (reordenacao is null)
                return Erro.Criar(404, "PROGRAMACAO_NOT_FOUND", $"Programação {id} não encontrada.");
            await notificador.ProgramacaoAtualizadaAsync();
            return Ok(reordenacao);
        });
    }

    /// <summary>Inclui instalador na equipe da programação (rota 27). Sem datas, cobre o período inteiro.</summary>
    [Authorize(Roles = Perfis.Gestao)]
    [HttpPost("{id:int}/integrantes")]
    [ProducesResponseType(typeof(EquipeTemporalBanco), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ErroSaida), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ErroSaida), StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(ErroSaida), StatusCodes.Status409Conflict)]
    public Task<IActionResult> AdicionarIntegrante(int id, IntegranteEntrada e)
    {
        if (e.UsuarioId is null)
            return Task.FromResult<IActionResult>(Validacao("usuarioId é obrigatório."));
        return Executar(async () => await Equipe(banco.AdicionarIntegrante(id, e.UsuarioId.Value, e.DataEntrada,
            e.DataSaida, this.UsuarioAtualId())));
    }

    /// <summary>Altera as datas de entrada e saída do integrante (rota 27a).</summary>
    [Authorize(Roles = Perfis.Gestao)]
    [HttpPatch("{id:int}/integrantes/{usuarioId:int}")]
    [ProducesResponseType(typeof(EquipeTemporalBanco), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ErroSaida), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ErroSaida), StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(ErroSaida), StatusCodes.Status409Conflict)]
    public Task<IActionResult> AlterarIntegrante(int id, int usuarioId, DatasIntegranteEntrada e) =>
        Executar(async () => await Equipe(banco.AlterarIntegrante(id, usuarioId, e.DataEntrada, e.DataSaida,
            this.UsuarioAtualId())));

    /// <summary>Remove o integrante (rota 27b). Depois da entrada, exige dataSaida e encerra o vínculo nela.</summary>
    [Authorize(Roles = Perfis.Gestao)]
    [HttpDelete("{id:int}/integrantes/{usuarioId:int}")]
    [ProducesResponseType(typeof(EquipeTemporalBanco), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ErroSaida), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ErroSaida), StatusCodes.Status404NotFound)]
    public Task<IActionResult> RemoverIntegrante(int id, int usuarioId, DateOnly? dataSaida) =>
        // shortcut: "hoje" em UTC; perto da meia-noite de Brasília pode adiantar um dia. Usar fuso da empresa se incomodar.
        Executar(async () => await Equipe(banco.RemoverIntegrante(id, usuarioId, dataSaida,
            DateOnly.FromDateTime(DateTime.UtcNow), this.UsuarioAtualId())));

    /// <summary>Altera a quantidade de pessoas previstas na equipe (rota 27c).</summary>
    [Authorize(Roles = Perfis.Gestao)]
    [HttpPatch("{id:int}/equipe")]
    [ProducesResponseType(typeof(EquipeTemporalBanco), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ErroSaida), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ErroSaida), StatusCodes.Status404NotFound)]
    public Task<IActionResult> AlterarEquipe(int id, EquipeEntrada e)
    {
        if (e.PessoasPrevistas is null or <= 0)
            return Task.FromResult<IActionResult>(Validacao("pessoasPrevistas é obrigatório e deve ser maior que zero."));
        return Executar(async () => await Equipe(banco.AlterarPessoasPrevistas(id, e.PessoasPrevistas.Value,
            this.UsuarioAtualId())));
    }

    async Task<IActionResult> Equipe(EquipeTemporalBanco equipe)
    {
        await notificador.ProgramacaoAtualizadaAsync();
        return Ok(equipe);
    }

    static async Task<IActionResult> Executar(Func<Task<IActionResult>> acao)
    {
        try { return await acao(); }
        catch (RegraVioladaException ex) { return Erro.Criar(ex.Status, ex.Code, ex.Message); }
    }

    static ObjectResult Validacao(string mensagem) => Erro.Criar(400, "VALIDATION_ERROR", mensagem);
}
