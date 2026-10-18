using System.Text.RegularExpressions;
using Microsoft.AspNetCore.Mvc;

namespace Backend.Api.Controllers;

[ApiController]
[Route("api/obras")]
public class ObrasController(BancoDados banco) : ControllerBase
{
    static readonly string[] Categorias = ["Residencial", "Comercial"];

    public record PagamentoEntrada(int? PrazoContratualDias, DateOnly? DataConfirmacao);
    public record ClienteEntrada(string? Nome, string? CpfCnpj, string? Cidade, string? Endereco,
        string? Telefone, string? Email, string? DadosContrato);
    // clienteNome, cidade e cpfCnpj soltos são o formato anterior, aceito enquanto o front não usa "cliente".
    public record CriarObraEntrada(int? ClienteId, ClienteEntrada? Cliente, string? ClienteNome, string? Cidade,
        string? CpfCnpj, string? Categoria, int? QuantidadePaineis, int? QuantidadeInversores, string? Endereco,
        string? Descricao, DateOnly? DataInicioEstimada, DateOnly? DataFimEstimada, PagamentoEntrada? Pagamento);
    public record EditarObraEntrada(string? Cidade, string? Categoria, int? QuantidadePaineis,
        int? QuantidadeInversores, string? Endereco, string? Descricao, DateOnly? DataInicioEstimada,
        DateOnly? DataFimEstimada, PagamentoEntrada? Pagamento);
    public record MoverStatusEntrada(string? StatusNovo, string? Observacao);
    public record MaterialEntrada(string? Tipo, int? Quantidade, decimal? CustoUnitario, string? StatusLogistico);

    // Rota 7 — UC-01, RF-03
    [HttpPost]
    public IActionResult Criar(CriarObraEntrada e)
    {
        if (e.QuantidadePaineis is null or <= 0)
            return Validacao("quantidadePaineis é obrigatório e deve ser maior que zero.");
        if (e.QuantidadeInversores < 0)
            return Validacao("quantidadeInversores não pode ser negativo.");
        if (e.Pagamento?.PrazoContratualDias is null or <= 0)
            return Validacao("pagamento.prazoContratualDias é obrigatório e deve ser maior que zero.");
        if (e.Pagamento?.DataConfirmacao is null)
            return Validacao("pagamento.dataConfirmacao é obrigatório.");
        if (e.DataFimEstimada < e.DataInicioEstimada)
            return Validacao("dataFimEstimada não pode ser anterior a dataInicioEstimada.");
        if (e.Categoria is not null && !Categorias.Contains(e.Categoria))
            return CategoriaInvalida(e.Categoria);
        if (string.IsNullOrWhiteSpace(e.Endereco) || e.Endereco.Trim().Length > 255)
            return Validacao("endereco é obrigatório e deve ter no máximo 255 caracteres.");

        var cliente = e.Cliente ?? (e.ClienteNome is null && e.CpfCnpj is null ? null
            : new ClienteEntrada(e.ClienteNome, e.CpfCnpj, e.Cidade, null, null, null, null));
        if (e.ClienteId is not null && cliente is not null)
            return Validacao("Informe clienteId (cliente existente) ou cliente (cliente novo), não os dois.");
        if (e.ClienteId is null && cliente is null)
            return Validacao("Informe o clienteId de um cliente existente ou os dados do cliente novo em cliente.");
        ClienteNovoBanco? clienteNovo = null;
        if (cliente is not null)
        {
            var erro = ValidarCliente(cliente, out clienteNovo);
            if (erro is not null) return erro;
        }

        try
        {
            var obra = banco.CriarObra(e.ClienteId, clienteNovo, e.Categoria, e.QuantidadePaineis.Value,
                e.QuantidadeInversores, e.Endereco.Trim(), Limpar(e.Descricao), e.DataInicioEstimada,
                e.DataFimEstimada, e.Pagamento.DataConfirmacao.Value, e.Pagamento.PrazoContratualDias.Value,
                banco.UsuarioAtualId(Request));
            return Created($"/api/obras/{obra.Id}", obra);
        }
        catch (RegraVioladaException ex)
        {
            return Erro.Criar(ex.Status, ex.Code, ex.Message);
        }
    }

    // Rota 6 — UC-02, RF-04
    [HttpGet]
    public IActionResult Listar(string? status, string? clienteNome, string? categoria, int page = 1, int pageSize = 20)
    {
        if (status is not null && !RegrasBase.StatusObra.Contains(status))
            return StatusInvalido(status);
        if (page < 1 || pageSize < 1)
            return Erro.Criar(400, "INVALID_PARAMETER", "page e pageSize devem ser maiores ou iguais a 1.");
        return Ok(banco.ListarObras(status, clienteNome, categoria, page, pageSize));
    }

    // Rota 8 — UC-01
    [HttpGet("{id:int}")]
    public IActionResult Detalhar(int id)
    {
        var obra = banco.BuscarObra(id);
        return obra is null ? ObraNaoEncontrada(id) : Ok(Detalhe(obra));
    }

    // Rota 9 — UC-01, RF-03
    [HttpPut("{id:int}")]
    public IActionResult Editar(int id, EditarObraEntrada e)
    {
        var atual = banco.BuscarObra(id);
        if (atual is null) return ObraNaoEncontrada(id);
        var inicio = e.DataInicioEstimada ?? atual.DataInicioEstimada;
        var fim = e.DataFimEstimada ?? atual.DataFimEstimada;
        if (fim < inicio)
            return Validacao("dataFimEstimada não pode ser anterior a dataInicioEstimada.");
        if (e.QuantidadePaineis <= 0)
            return Validacao("quantidadePaineis deve ser maior que zero.");
        if (e.QuantidadeInversores < 0)
            return Validacao("quantidadeInversores não pode ser negativo.");
        if (e.Pagamento?.PrazoContratualDias <= 0)
            return Validacao("pagamento.prazoContratualDias deve ser maior que zero.");
        if (e.Categoria is not null && !Categorias.Contains(e.Categoria))
            return CategoriaInvalida(e.Categoria);
        if (e.Endereco is not null && (string.IsNullOrWhiteSpace(e.Endereco) || e.Endereco.Trim().Length > 255))
            return Validacao("endereco não pode ser vazio e deve ter no máximo 255 caracteres.");
        if (e.Cidade?.Trim().Length > 100)
            return Validacao("cidade deve ter no máximo 100 caracteres.");

        var obra = banco.EditarObra(id, e.Cidade, e.Categoria, e.QuantidadePaineis, e.QuantidadeInversores,
            e.Endereco?.Trim(), Limpar(e.Descricao), e.DataInicioEstimada, e.DataFimEstimada,
            e.Pagamento?.PrazoContratualDias, e.Pagamento?.DataConfirmacao);
        return obra is null ? ObraNaoEncontrada(id) : Ok(Detalhe(obra));
    }

    // Rota 11 — UC-02, RF-04, RF-06, RF-10, RF-13
    [HttpPatch("{id:int}/status")]
    public IActionResult MoverStatus(int id, MoverStatusEntrada e)
    {
        if (string.IsNullOrWhiteSpace(e.StatusNovo))
            return Erro.Criar(400, "MISSING_STATUS", "Novo status não informado (campo statusNovo).");
        if (!RegrasBase.StatusObra.Contains(e.StatusNovo))
            return StatusInvalido(e.StatusNovo);

        var movimento = banco.MoverStatus(id, e.StatusNovo, e.Observacao, banco.UsuarioAtualId(Request));
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

    // Rota 12 — RF-06
    [HttpGet("{id:int}/materiais")]
    public IActionResult ListarMateriais(int id)
    {
        if (banco.BuscarObra(id) is null) return ObraNaoEncontrada(id);
        return Ok(banco.ListarMateriais(id).Select(m => new
        {
            m.Id, m.Tipo, m.Quantidade, m.QuantidadeUtilizada, m.CustoUnitario, m.StatusLogistico,
        }));
    }

    // Rota 13 — RF-06
    [HttpPost("{id:int}/materiais")]
    public IActionResult RegistrarMaterial(int id, MaterialEntrada e)
    {
        if (string.IsNullOrWhiteSpace(e.Tipo) || e.Tipo.Trim().Length > 200)
            return Validacao("tipo é obrigatório e deve ter no máximo 200 caracteres.");
        if (e.Quantidade is null or < 0)
            return Validacao("quantidade é obrigatória e não pode ser negativa.");
        if (e.CustoUnitario < 0)
            return Validacao("custoUnitario não pode ser negativo.");
        if (e.StatusLogistico is not null && !RegrasBase.StatusLogistico.Contains(e.StatusLogistico))
            return Erro.Criar(400, "INVALID_STATUS_LOGISTICO",
                $"statusLogistico '{e.StatusLogistico}' inválido. Valores aceitos: {string.Join(", ", RegrasBase.StatusLogistico)}.");
        if (banco.BuscarObra(id) is null) return ObraNaoEncontrada(id);

        var material = banco.CriarMaterial(id, e.Tipo.Trim(), e.Quantidade.Value, e.CustoUnitario, e.StatusLogistico);
        return Created($"/api/obras/{id}/materiais", material);
    }

    // Rota 15 — RF-11
    [HttpGet("{id:int}/historico")]
    public IActionResult ListarHistorico(int id)
    {
        if (banco.BuscarObra(id) is null) return ObraNaoEncontrada(id);
        return Ok(banco.ListarHistorico(id));
    }

    static object Detalhe(ObraBanco obra) => new
    {
        obra.Id, obra.Status, obra.Categoria, obra.QuantidadePaineis, obra.QuantidadeInversores,
        obra.Endereco, obra.Descricao, obra.DataInicioEstimada, obra.DataFimEstimada,
        obra.DataInicioReal, obra.DataFimReal,
        cliente = obra.Cliente,
        pagamento = obra.Pagamento,
    };

    // CPF/CNPJ é guardado só com dígitos (o contrato aceita a máscara na entrada).
    static ObjectResult? ValidarCliente(ClienteEntrada c, out ClienteNovoBanco? cliente)
    {
        cliente = null;
        var cpfCnpj = c.CpfCnpj is null ? "" : Regex.Replace(c.CpfCnpj, "[.\\-/ ]", "");
        if (string.IsNullOrWhiteSpace(c.Nome) || c.Nome.Trim().Length > 200)
            return Validacao("cliente.nome é obrigatório e deve ter no máximo 200 caracteres.");
        if (!Regex.IsMatch(cpfCnpj, "^[0-9]{11}([0-9]{3})?$"))
            return Validacao("cliente.cpfCnpj é obrigatório e deve ter 11 (CPF) ou 14 (CNPJ) dígitos.");
        if (c.Cidade?.Trim().Length > 100)
            return Validacao("cliente.cidade deve ter no máximo 100 caracteres.");
        if (c.Endereco?.Trim().Length > 255)
            return Validacao("cliente.endereco deve ter no máximo 255 caracteres.");
        if (c.Telefone?.Trim().Length > 30)
            return Validacao("cliente.telefone deve ter no máximo 30 caracteres.");
        if (c.Email?.Trim().Length > 200)
            return Validacao("cliente.email deve ter no máximo 200 caracteres.");
        cliente = new ClienteNovoBanco(c.Nome.Trim(), cpfCnpj, Limpar(c.Cidade), Limpar(c.Endereco),
            Limpar(c.Telefone), Limpar(c.Email), Limpar(c.DadosContrato));
        return null;
    }

    static string? Limpar(string? texto) => string.IsNullOrWhiteSpace(texto) ? null : texto.Trim();

    static ObjectResult ObraNaoEncontrada(int id) => Erro.Criar(404, "OBRA_NOT_FOUND", $"Obra {id} não encontrada.");
    static ObjectResult Validacao(string mensagem) => Erro.Criar(400, "VALIDATION_ERROR", mensagem);
    static ObjectResult CategoriaInvalida(string categoria) =>
        Validacao($"categoria '{categoria}' inválida. Valores aceitos: {string.Join(", ", Categorias)}.");
    static ObjectResult StatusInvalido(string status) => Erro.Criar(400, "INVALID_STATUS",
        $"Status '{status}' inválido. Valores aceitos: {string.Join(", ", RegrasBase.StatusObra)}.");
}
