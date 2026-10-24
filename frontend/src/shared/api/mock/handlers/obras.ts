import type MockAdapter from "axios-mock-adapter";
import { extrairQueryParams, extrairDados } from "../core/http";
import { obterObrasArmazenadas, adicionarObraArmazenada, atualizarStatusObraArmazenada, salvarObrasArmazenadas } from "../dados/obras";
import type { StatusObra } from "@/shared/constants/kanbanStatus";
import { TRANSICOES_VALIDAS, COLUNAS_KANBAN } from "@/shared/constants/kanbanStatus";
import { adicionarHistoricoArmazenado } from "../dados/registros";
import type { EditarObraPayload, ObraCard } from "@/types";
import { obterProgramacoesArmazenadas } from "../dados/programacoes";
import { excluirObraArmazenada } from "../dados/operacoesObras";

export function registrarObras(mock: MockAdapter): void {
  // --- ROTAS DE OBRAS ---
  
  // GET /obras (com suporte a filtros por status, clienteNome e paginação)
  mock.onGet(/\/obras\/?(\?.*)?$/).reply((config) => {
    const params = extrairQueryParams(config);
    let itens = obterObrasArmazenadas();
  
    if (params.status) {
      itens = itens.filter((o) => o.status === params.status);
    }
  
    if (params.clienteNome) {
      const termo = params.clienteNome.toLowerCase().trim();
      itens = itens.filter((o) => o.clienteNome.toLowerCase().includes(termo));
    }
  
    const page = Number(params.page) || 1;
    const pageSize = Number(params.pageSize) || 200;
  
    return [
      200,
      {
        page,
        pageSize,
        total: itens.length,
        itens,
      },
    ];
  });
  
  // POST /obras (cadastra e persiste no sessionStorage)
  mock.onPost(/\/obras\/?(\?.*)?$/).reply((config) => {
    try {
      const payload = extrairDados<{
        clienteId?: number;
        cliente?: { nome: string; cidade?: string };
        clienteNome?: string;
        cidade?: string;
        quantidadePaineis: number;
        dataInicioEstimada: string;
        dataFimEstimada: string;
      }>(config.data);
  
      const nomeCliente =
        payload.cliente?.nome ||
        payload.clienteNome ||
        (payload.clienteId ? `Cliente #${payload.clienteId}` : "Cliente Cadastrado");
  
      const novaObra = adicionarObraArmazenada({
        ...payload,
        clienteNome: nomeCliente,
        cidade: payload.cliente?.cidade || payload.cidade,
      });
  
      return [
        201,
        {
          id: novaObra.id,
          status: novaObra.status,
          clienteId: payload.clienteId || 1,
          dataInicioEstimada: payload.dataInicioEstimada,
          dataFimEstimada: payload.dataFimEstimada,
          dataInicioReal: null,
          dataFimReal: null,
          criadoEm: new Date().toISOString(),
        },
      ];
    } catch {
      return [400, { error: { code: "INVALID_PAYLOAD", message: "Erro ao cadastrar obra mockada" } }];
    }
  });
  
  // PATCH /obras/:id/status (atualiza status e persiste no sessionStorage)
  mock.onPatch(/\/obras\/\d+\/status\/?(\?.*)?$/).reply((config) => {
    try {
      const match = config.url?.match(/\/obras\/(\d+)\/status/);
      const id = match ? Number(match[1]) : 0;
      const { statusNovo, observacao } = extrairDados<{ statusNovo?: StatusObra; observacao?: string }>(config.data);
  
      if (!statusNovo) {
        return [400, { error: { code: "MISSING_STATUS", message: "Novo status não informado" } }];
      }
  
      const obrasAntes = obterObrasArmazenadas();
      const obraAntes = obrasAntes.find((o) => Number(o.id) === id);
  
      if (!obraAntes) {
        return [404, { error: { code: "OBRA_NOT_FOUND", message: `Obra ${id} não encontrada` } }];
      }
  
      const statusAnterior = obraAntes.status;
  
      // Validação canônica estrita das transições permitidas (04-regras-negocio.md / Seção 2)
      const permitidos = TRANSICOES_VALIDAS[statusAnterior] || [];
      if (!permitidos.includes(statusNovo)) {
        const getLabel = (s: StatusObra) => COLUNAS_KANBAN.find((c) => c.id === s)?.label || s;
        const permitidosLabels = permitidos.map(getLabel).join(", ") || "Nenhum";
        return [
          400,
          {
            error: {
              code: "INVALID_STATUS_TRANSITION",
              message: `Transição não permitida: de "${getLabel(statusAnterior)}" para "${getLabel(statusNovo)}". Próximos status válidos: ${permitidosLabels}.`,
            },
          },
        ];
      }
  
      const obraAtualizada = atualizarStatusObraArmazenada(id, statusNovo);
  
      if (!obraAtualizada) {
        return [404, { error: { code: "OBRA_NOT_FOUND", message: `Obra ${id} não encontrada` } }];
      }
  
      // Registra evento formal de histórico (paridade com Rota #7 / Rota #10)
      adicionarHistoricoArmazenado(
        id,
        statusAnterior,
        statusNovo,
        observacao || `Status alterado de ${statusAnterior} para ${statusNovo}.`,
        { id: 1, nome: "Carlos Administrador" }
      );
  
      return [
        200,
        {
          id,
          statusAnterior,
          statusNovo,
          dataAlteracao: new Date().toISOString(),
          emailNotificacaoEnviado: statusNovo === "Concluido",
        },
      ];
    } catch {
      return [400, { error: { code: "INVALID_BODY", message: "Erro ao processar movimentação de status" } }];
    }
  });
  
  // GET /obras/:id (detalhe de obra específica)
  mock.onGet(/\/obras\/\d+\/?(\?.*)?$/).reply((config) => {
    const match = config.url?.match(/\/obras\/(\d+)/);
    const id = match ? Number(match[1]) : 0;
    const obras = obterObrasArmazenadas();
    const obra = obras.find((o) => Number(o.id) === id);
  
    if (!obra) {
      return [404, { error: { code: "OBRA_NOT_FOUND", message: `Obra ${id} não encontrada` } }];
    }
  
    return [
      200,
      {
        id: obra.id,
        status: obra.status,
        dataInicioEstimada: "2026-10-01",
        dataFimEstimada: obra.dataFimEstimada,
        dataInicioReal: null,
        dataFimReal: null,
        cliente: {
          id: 1,
          nome: obra.clienteNome,
          cidade: obra.cidade || "Campinas",
        },
        pagamento: {
          id: 88,
          dataConfirmacao: "2026-09-15",
          prazoContratualDias: 45,
        },
        categoria: obra.categoria || "Residencial",
        quantidadePaineis: obra.quantidadePaineis,
        endereco: obra.endereco ?? "",
        descricao: obra.observacoes ?? "",
      },
    ];
  });
  
  // PUT /obras/:id (edição de dados cadastrais da obra - UC-17 / Rota #9)
  mock.onPut(/\/obras\/\d+\/?$/).reply((config) => {
    try {
      const match = config.url?.match(/\/obras\/(\d+)/);
      const id = match ? Number(match[1]) : 0;
      const payload = extrairDados<EditarObraPayload>(config.data);
  
      const obras = obterObrasArmazenadas();
      const index = obras.findIndex((o) => Number(o.id) === id);
  
      if (index === -1) {
        return [404, { error: { code: "OBRA_NOT_FOUND", message: `Obra ${id} não encontrada` } }];
      }
  
      const obraExistente = obras[index];
  
      const obraAtualizada: ObraCard = {
        ...obraExistente,
        endereco: payload.endereco ?? obraExistente.endereco,
        cidade: payload.cidade ?? obraExistente.cidade,
        categoria: payload.categoria ?? obraExistente.categoria,
        quantidadePaineis: payload.quantidadePaineis ?? obraExistente.quantidadePaineis,
        dataFimEstimada: payload.dataFimEstimada ?? obraExistente.dataFimEstimada,
        observacoes: payload.descricao ?? obraExistente.observacoes,
      };
  
      obras[index] = obraAtualizada;
      salvarObrasArmazenadas(obras);
  
      // Resposta compatível com ObraDetalhe (Contrato) e ObraCard
      const respostaDetalhe = {
        ...obraAtualizada,
        id: obraAtualizada.id,
        status: obraAtualizada.status,
        dataInicioEstimada: "2026-10-01",
        dataFimEstimada: obraAtualizada.dataFimEstimada,
        dataInicioReal: null,
        dataFimReal: null,
        cliente: {
          id: 1,
          nome: obraAtualizada.clienteNome,
          cidade: obraAtualizada.cidade || "Campinas",
        },
        pagamento: {
          id: 88,
          dataConfirmacao: "2026-09-15",
          prazoContratualDias: obraAtualizada.prazoContratualDias || 45,
        },
        categoria: obraAtualizada.categoria || "Residencial",
        quantidadePaineis: obraAtualizada.quantidadePaineis,
        endereco: obraAtualizada.endereco ?? "",
        descricao: payload.descricao ?? obraAtualizada.observacoes ?? "",
      };
  
      return [200, respostaDetalhe];
    } catch {
      return [400, { error: { code: "INVALID_BODY", message: "Erro ao atualizar dados da obra" } }];
    }
  });
}

export function registrarExclusaoObra(mock: MockAdapter): void {
  // DELETE /obras/:id — UC-11 / UC-16 com bloqueio severo UC-11 RN2 / FA2
  mock.onDelete(/\/obras\/\d+\/?(\?.*)?$/).reply((config) => {
    const match = config.url?.match(/\/obras\/(\d+)/);
    const id = match ? Number(match[1]) : NaN;
    if (isNaN(id)) {
      return [400, { error: { code: "INVALID_PARAMETER", message: "ID de obra inválido" } }];
    }
  
    const obras = obterObrasArmazenadas();
    const obra = obras.find((o) => Number(o.id) === id);
    if (!obra) {
      return [404, { error: { code: "OBRA_NOT_FOUND", message: `Obra ${id} não encontrada` } }];
    }
  
    // Regra de Negócio: Obra em execução não pode ser apagada
    if (obra.status === "EmAndamento") {
      return [
        400,
        {
          error: {
            code: "OBRA_EM_EXECUCAO",
            message: "Obras com status Em Andamento não podem ser apagadas.",
          },
        },
      ];
    }
  
    // Regra de Negócio: Obra com alocação no Gantt não pode ser apagada
    const programacoes = obterProgramacoesArmazenadas();
    const temAlocacao = programacoes.some((p) => Number(p.obraId) === id);
    if (temAlocacao) {
      return [
        400,
        {
          error: {
            code: "OBRA_ALOCADA",
            message: "Esta obra possui equipe e cronograma agendado no Gantt. É necessário desalocá-la antes da exclusão.",
          },
        },
      ];
    }
  
    const sucesso = excluirObraArmazenada(id);
    if (!sucesso) {
      return [404, { error: { code: "OBRA_NOT_FOUND", message: "Erro ao excluir obra mockada" } }];
    }
  
    return [204];
  });
}
