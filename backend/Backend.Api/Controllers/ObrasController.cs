using Microsoft.AspNetCore.Mvc;
using static Backend.Api.DadosFixos;

namespace Backend.Api.Controllers;

[ApiController]
[Route("api/obras")]
public class ObrasController : ControllerBase
{
    public record PagamentoEntrada(int? PrazoContratualDias);
    public record CriarObraEntrada(int? ClienteId, string? ClienteNome, string? Cidade, int? QuantidadePaineis,
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

        lock (Trava)
        {
            // Usa o cliente informado se existir; senão cadastra um novo com clienteNome + cidade
            var cliente = Clientes.FirstOrDefault(c => c.Id == e.ClienteId);
            if (cliente is null)
            {
                if (string.IsNullOrWhiteSpace(e.ClienteNome))
                    return Validacao("Informe o clienteId de um cliente existente ou o clienteNome para cadastrar um novo cliente.");
                cliente = new Cliente(Clientes.Max(c => c.Id) + 1, e.ClienteNome.Trim(), e.Cidade?.Trim());
                Clientes.Add(cliente);
            }

            var obra = new Obra(Obras.Max(o => o.Id) + 1, "MaterialComprado", null, e.QuantidadePaineis.Value,
                e.DataInicioEstimada, e.DataFimEstimada, null, null, cliente.Id);
            Obras.Add(obra);
            Pagamentos.Add(new Pagamento(Pagamentos.Max(p => p.Id) + 1, null, e.Pagamento.PrazoContratualDias.Value, obra.Id));
            var criadoEm = Agora();
            Historicos.Add(new Historico(Historicos.Max(h => h.Id) + 1, null, obra.Status, criadoEm, "Obra criada no sistema.", obra.Id, UsuarioAtualId()));

            return Created($"/api/obras/{obra.Id}", new
            {
                obra.Id,
                obra.Status,
                obra.ClienteId,
                obra.DataInicioEstimada,
                obra.DataFimEstimada,
                obra.DataInicioReal,
                obra.DataFimReal,
                criadoEm,
            });
        }
    }

    // Rota 4 — UC-02, RF-04
    [HttpGet]
    public IActionResult Listar(string? status, string? clienteNome, int page = 1, int pageSize = 20)
    {
        if (status is not null && !StatusObra.Contains(status))
            return StatusInvalido(status);
        if (page < 1 || pageSize < 1)
            return Erro.Criar(400, "INVALID_PARAMETER", "page e pageSize devem ser maiores ou iguais a 1.");

        lock (Trava)
        {
            var filtradas = Obras
                .Select(o => (Obra: o, Cliente: Clientes.First(c => c.Id == o.ClienteId)))
                .Where(x => status is null || x.Obra.Status == status)
                .Where(x => string.IsNullOrWhiteSpace(clienteNome) || x.Cliente.Nome.Contains(clienteNome.Trim(), StringComparison.OrdinalIgnoreCase))
                .ToList();

            return Ok(new
            {
                page,
                pageSize,
                total = filtradas.Count,
                itens = filtradas.Skip((page - 1) * pageSize).Take(pageSize).Select(x => new
                {
                    x.Obra.Id,
                    x.Obra.Status,
                    clienteNome = x.Cliente.Nome,
                    x.Obra.Categoria,
                    x.Obra.QuantidadePaineis,
                    x.Obra.DataFimEstimada,
                }),
            });
        }
    }

    // Rota 5 — UC-01
    [HttpGet("{id:int}")]
    public IActionResult Detalhar(int id)
    {
        lock (Trava)
        {
            var obra = Obras.FirstOrDefault(o => o.Id == id);
            return obra is null ? ObraNaoEncontrada(id) : Ok(Detalhe(obra));
        }
    }

    // Rota 6 — UC-01, RF-03
    [HttpPut("{id:int}")]
    public IActionResult Editar(int id, EditarObraEntrada e)
    {
        lock (Trava)
        {
            var i = Obras.FindIndex(o => o.Id == id);
            if (i < 0) return ObraNaoEncontrada(id);

            var obra = Obras[i] with
            {
                DataInicioEstimada = e.DataInicioEstimada ?? Obras[i].DataInicioEstimada,
                DataFimEstimada = e.DataFimEstimada ?? Obras[i].DataFimEstimada,
            };
            if (obra.DataFimEstimada < obra.DataInicioEstimada)
                return Validacao("dataFimEstimada não pode ser anterior a dataInicioEstimada.");
            if (e.Pagamento?.PrazoContratualDias <= 0)
                return Validacao("pagamento.prazoContratualDias deve ser maior que zero.");
            if (e.Cidade?.Trim().Length > 100)
                return Validacao("cidade deve ter no máximo 100 caracteres.");

            Obras[i] = obra;
            // No MER a cidade pertence ao Cliente
            if (e.Cidade is not null)
            {
                var c = Clientes.FindIndex(c => c.Id == obra.ClienteId);
                Clientes[c] = Clientes[c] with { Cidade = e.Cidade.Trim() };
            }
            if (e.Pagamento?.PrazoContratualDias is int prazo)
            {
                var p = Pagamentos.FindIndex(p => p.ObraId == id);
                Pagamentos[p] = Pagamentos[p] with { PrazoContratualDias = prazo };
            }
            return Ok(Detalhe(obra));
        }
    }

    // Rota 7 — UC-02, RF-04, RF-06, RF-10, RF-13
    [HttpPatch("{id:int}/status")]
    public IActionResult MoverStatus(int id, MoverStatusEntrada e)
    {
        if (string.IsNullOrWhiteSpace(e.StatusNovo))
            return Erro.Criar(400, "MISSING_STATUS", "Novo status não informado (campo statusNovo).");
        if (!StatusObra.Contains(e.StatusNovo))
            return StatusInvalido(e.StatusNovo);

        lock (Trava)
        {
            var i = Obras.FindIndex(o => o.Id == id);
            if (i < 0) return ObraNaoEncontrada(id);

            var anterior = Obras[i].Status;
            var permitidos = Transicoes[anterior];
            if (!permitidos.Contains(e.StatusNovo))
                return Erro.Criar(400, "INVALID_STATUS_TRANSITION",
                    $"Não é possível mover a obra de {anterior} para {e.StatusNovo}. Próxima(s) etapa(s) permitida(s): {string.Join(", ", permitidos)}.");

            Obras[i] = Obras[i] with { Status = e.StatusNovo };
            var dataAlteracao = Agora();
            Historicos.Add(new Historico(Historicos.Max(h => h.Id) + 1, anterior, e.StatusNovo, dataAlteracao, e.Observacao, id, UsuarioAtualId()));

            return Ok(new
            {
                id,
                statusAnterior = anterior,
                statusNovo = e.StatusNovo,
                dataAlteracao,
                // ponytail: envio de e-mail (RF-13) ainda não implementado
                emailNotificacaoEnviado = false,
            });
        }
    }

    // Rota 8 — RF-06
    [HttpGet("{id:int}/materiais")]
    public IActionResult ListarMateriais(int id)
    {
        lock (Trava)
        {
            if (!Obras.Any(o => o.Id == id)) return ObraNaoEncontrada(id);
            return Ok(Materiais.Where(m => m.ObraId == id).Select(m => new { m.Id, m.Tipo, m.Quantidade, m.StatusLogistico }));
        }
    }

    // Rota 9 — RF-06
    [HttpPost("{id:int}/materiais")]
    public IActionResult RegistrarMaterial(int id, MaterialEntrada e)
    {
        if (string.IsNullOrWhiteSpace(e.Tipo) || e.Tipo.Trim().Length > 200)
            return Validacao("tipo é obrigatório e deve ter no máximo 200 caracteres.");
        if (e.Quantidade is null or < 0)
            return Validacao("quantidade é obrigatória e não pode ser negativa.");
        if (e.StatusLogistico is not null && !StatusLogistico.Contains(e.StatusLogistico))
            return Erro.Criar(400, "INVALID_STATUS_LOGISTICO",
                $"statusLogistico '{e.StatusLogistico}' inválido. Valores aceitos: {string.Join(", ", StatusLogistico)}.");

        lock (Trava)
        {
            if (!Obras.Any(o => o.Id == id)) return ObraNaoEncontrada(id);
            var m = new Material(Materiais.Max(x => x.Id) + 1, e.Tipo.Trim(), e.Quantidade.Value, e.StatusLogistico, id);
            Materiais.Add(m);
            return Created($"/api/obras/{id}/materiais", new { m.Id, m.Tipo, m.Quantidade, m.StatusLogistico, obraId = m.ObraId });
        }
    }

    // Rota 10 — RF-11 (mais recente primeiro)
    [HttpGet("{id:int}/historico")]
    public IActionResult ListarHistorico(int id)
    {
        lock (Trava)
        {
            if (!Obras.Any(o => o.Id == id)) return ObraNaoEncontrada(id);
            return Ok(Historicos.Where(h => h.ObraId == id).OrderByDescending(h => h.DataAlteracao).Select(h =>
            {
                var u = Usuarios.First(x => x.Id == h.UsuarioId);
                return new
                {
                    h.Id,
                    obraId = h.ObraId,
                    h.StatusAnterior,
                    h.StatusNovo,
                    h.DataAlteracao,
                    h.Observacao,
                    usuario = new { u.Id, u.Nome },
                };
            }).ToList());
        }
    }

    static object Detalhe(Obra o)
    {
        var c = Clientes.First(x => x.Id == o.ClienteId);
        var p = Pagamentos.First(x => x.ObraId == o.Id);
        return new
        {
            o.Id,
            o.Status,
            o.DataInicioEstimada,
            o.DataFimEstimada,
            o.DataInicioReal,
            o.DataFimReal,
            cliente = new { c.Id, c.Nome, c.Cidade },
            pagamento = new { p.Id, p.DataConfirmacao, p.PrazoContratualDias },
        };
    }

    // ponytail: rotas abertas (sem RBAC); sem token o histórico é atribuído ao Administrador (id 1) até a auth real entrar
    int UsuarioAtualId() => UsuarioDoToken(Request.Headers.Authorization)?.Id ?? 1;

    static ObjectResult ObraNaoEncontrada(int id) => Erro.Criar(404, "OBRA_NOT_FOUND", $"Obra {id} não encontrada.");
    static ObjectResult Validacao(string mensagem) => Erro.Criar(400, "VALIDATION_ERROR", mensagem);
    static ObjectResult StatusInvalido(string status) => Erro.Criar(400, "INVALID_STATUS",
        $"Status '{status}' inválido. Valores aceitos: {string.Join(", ", StatusObra)}.");
}
