using Microsoft.AspNetCore.Mvc;

namespace Backend.Api.Controllers;

[ApiController]
[Route("api/obras")]
public class ObrasController(BancoDados banco) : ControllerBase
{
    public record PagamentoEntrada(int? PrazoContratualDias, DateOnly? DataConfirmacao);
    public record CriarObraEntrada(int? ClienteId, string? ClienteNome, string? Cidade, string? CpfCnpj,
        string? Endereco, int? QuantidadePaineis,
        DateOnly? DataInicioEstimada, DateOnly? DataFimEstimada, PagamentoEntrada? Pagamento);
    public record EditarObraEntrada(string? Cidade, DateOnly? DataInicioEstimada, DateOnly? DataFimEstimada, PagamentoEntrada? Pagamento);
    public record MoverStatusEntrada(string? StatusNovo, string? Observacao);
    public record MaterialEntrada(string? Tipo, int? Quantidade, string? StatusLogistico);

    // Rota 3 — UC-01, RF-03
    [HttpPost]
    public IActionResult Criar(CriarObraEntrada e)
    {
        if (e.QuantidadePaineis is null or <= 0)
            return Validacao("quantidadePaineis é obrigatório e deve ser maior que zero.");
        if (e.Pagamento?.PrazoContratualDias is null or <= 0)
            return Validacao("pagamento.prazoContratualDias é obrigatório e deve ser maior que zero.");
        if (e.DataFimEstimada < e.DataInicioEstimada)
            return Validacao("dataFimEstimada não pode ser anterior a dataInicioEstimada.");
        if (e.ClienteNome?.Trim().Length > 200)
            return Validacao("clienteNome deve ter no máximo 200 caracteres.");
        if (e.Cidade?.Trim().Length > 100)
            return Validacao("cidade deve ter no máximo 100 caracteres.");
        if (e.ClienteId is null && string.IsNullOrWhiteSpace(e.ClienteNome))
            return Validacao("Informe o clienteId de um cliente existente ou o clienteNome para cadastrar um novo cliente.");
        if (string.IsNullOrWhiteSpace(e.Endereco) || e.Endereco.Trim().Length > 255)
            return Validacao("endereco é obrigatório e deve ter no máximo 255 caracteres.");
        if (e.ClienteId is null && (e.CpfCnpj is null ||
            !System.Text.RegularExpressions.Regex.IsMatch(e.CpfCnpj, "^[0-9]{11}([0-9]{3})?$")))
            return Validacao("cpfCnpj é obrigatório para um cliente novo e deve ter 11 ou 14 dígitos.");
        if (e.Pagamento?.DataConfirmacao is null)
            return Validacao("pagamento.dataConfirmacao é obrigatório.");
        try
        {
            var obra = banco.CriarObra(e.ClienteId, e.ClienteNome, e.Cidade, e.CpfCnpj, e.Endereco.Trim(),
                e.QuantidadePaineis.Value, e.DataInicioEstimada, e.DataFimEstimada,
                e.Pagamento.DataConfirmacao.Value, e.Pagamento.PrazoContratualDias.Value, UsuarioAtualId());
            return Created($"/api/obras/{obra.Id}", obra);
        }
        catch (ArgumentException ex)
        {
            return Validacao(ex.Message);
        }
    }

    // Rota 4 — UC-02, RF-04
    [HttpGet]
    public IActionResult Listar(string? status, string? clienteNome, int page = 1, int pageSize = 20)
    {
        if (status is not null && !RegrasBase.StatusObra.Contains(status))
            return StatusInvalido(status);
        if (page < 1 || pageSize < 1)
            return Erro.Criar(400, "INVALID_PARAMETER", "page e pageSize devem ser maiores ou iguais a 1.");
        return Ok(banco.ListarObras(status, clienteNome, page, pageSize));
    }

    // Rota 5 — UC-01
    [HttpGet("{id:int}")]
    public IActionResult Detalhar(int id)
    {
        var obra = banco.BuscarObra(id);
        return obra is null ? ObraNaoEncontrada(id) : Ok(Detalhe(obra));
    }

    // Rota 6 — UC-01, RF-03
    [HttpPut("{id:int}")]
    public IActionResult Editar(int id, EditarObraEntrada e)
    {
        var atual = banco.BuscarObra(id);
        if (atual is null) return ObraNaoEncontrada(id);
        var inicio = e.DataInicioEstimada ?? atual.DataInicioEstimada;
        var fim = e.DataFimEstimada ?? atual.DataFimEstimada;
        if (fim < inicio)
            return Validacao("dataFimEstimada não pode ser anterior a dataInicioEstimada.");
        if (e.Pagamento?.PrazoContratualDias <= 0)
            return Validacao("pagamento.prazoContratualDias deve ser maior que zero.");
        if (e.Cidade?.Trim().Length > 100)
            return Validacao("cidade deve ter no máximo 100 caracteres.");

        var obra = banco.EditarObra(id, e.Cidade, e.DataInicioEstimada, e.DataFimEstimada,
            e.Pagamento?.PrazoContratualDias);
        return obra is null ? ObraNaoEncontrada(id) : Ok(Detalhe(obra));
    }

    // Rota 7 — UC-02, RF-04, RF-06, RF-10, RF-13
    [HttpPatch("{id:int}/status")]
    public IActionResult MoverStatus(int id, MoverStatusEntrada e)
    {
        if (string.IsNullOrWhiteSpace(e.StatusNovo))
            return Erro.Criar(400, "MISSING_STATUS", "Novo status não informado (campo statusNovo).");
        if (!RegrasBase.StatusObra.Contains(e.StatusNovo))
            return StatusInvalido(e.StatusNovo);

        var movimento = banco.MoverStatus(id, e.StatusNovo, e.Observacao, UsuarioAtualId());
        if (movimento is null) return ObraNaoEncontrada(id);
        if (!movimento.Alterado)
            return Erro.Criar(400, "INVALID_STATUS_TRANSITION",
                $"Não é possível mover a obra de {movimento.StatusAnterior} para {e.StatusNovo}. " +
                $"Próxima(s) etapa(s) permitida(s): {string.Join(", ", movimento.Permitidos)}.");
        return Ok(new
        {
            movimento.Id, movimento.StatusAnterior, movimento.StatusNovo,
            movimento.DataAlteracao, movimento.EmailNotificacaoEnviado,
        });
    }

    // Rota 8 — RF-06
    [HttpGet("{id:int}/materiais")]
    public IActionResult ListarMateriais(int id)
    {
        if (banco.BuscarObra(id) is null) return ObraNaoEncontrada(id);
        return Ok(banco.ListarMateriais(id).Select(m => new { m.Id, m.Tipo, m.Quantidade, m.StatusLogistico }));
    }

    // Rota 9 — RF-06
    [HttpPost("{id:int}/materiais")]
    public IActionResult RegistrarMaterial(int id, MaterialEntrada e)
    {
        if (string.IsNullOrWhiteSpace(e.Tipo) || e.Tipo.Trim().Length > 200)
            return Validacao("tipo é obrigatório e deve ter no máximo 200 caracteres.");
        if (e.Quantidade is null or < 0)
            return Validacao("quantidade é obrigatória e não pode ser negativa.");
        if (e.StatusLogistico is not null && !RegrasBase.StatusLogistico.Contains(e.StatusLogistico))
            return Erro.Criar(400, "INVALID_STATUS_LOGISTICO",
                $"statusLogistico '{e.StatusLogistico}' inválido. Valores aceitos: {string.Join(", ", RegrasBase.StatusLogistico)}.");
        if (banco.BuscarObra(id) is null) return ObraNaoEncontrada(id);

        var material = banco.CriarMaterial(id, e.Tipo.Trim(), e.Quantidade.Value, e.StatusLogistico);
        return Created($"/api/obras/{id}/materiais", new
        {
            material.Id, material.Tipo, material.Quantidade, material.StatusLogistico,
            obraId = material.ObraId,
        });
    }

    // Rota 10 — RF-11
    [HttpGet("{id:int}/historico")]
    public IActionResult ListarHistorico(int id)
    {
        if (banco.BuscarObra(id) is null) return ObraNaoEncontrada(id);
        return Ok(banco.ListarHistorico(id));
    }

    static object Detalhe(ObraBanco obra) => new
    {
        obra.Id, obra.Status, obra.DataInicioEstimada, obra.DataFimEstimada,
        obra.DataInicioReal, obra.DataFimReal,
        cliente = obra.Cliente,
        pagamento = obra.Pagamento,
    };

    int UsuarioAtualId()
    {
        var id = RegrasBase.IdDoToken(Request.Headers.Authorization);
        return id is int usuarioId && banco.BuscarUsuarioPorId(usuarioId) is not null ? usuarioId : 1;
    }

    static ObjectResult ObraNaoEncontrada(int id) => Erro.Criar(404, "OBRA_NOT_FOUND", $"Obra {id} não encontrada.");
    static ObjectResult Validacao(string mensagem) => Erro.Criar(400, "VALIDATION_ERROR", mensagem);
    static ObjectResult StatusInvalido(string status) => Erro.Criar(400, "INVALID_STATUS",
        $"Status '{status}' inválido. Valores aceitos: {string.Join(", ", RegrasBase.StatusObra)}.");
}
