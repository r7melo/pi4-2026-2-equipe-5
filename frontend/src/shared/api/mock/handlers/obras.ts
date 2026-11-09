import { cadastrarObraCenario, detalheCenario, editarDetalheCenario, registrarDatasReais } from "../dados/detalhes";
import { resolverUsuarioAutenticadoMock } from "../core/auth";
import type MockAdapter from "axios-mock-adapter";
import { extrairQueryParams, extrairDados } from "../core/http";
import { obterObrasArmazenadas, atualizarStatusObraArmazenada } from "../dados/obras";
import type { StatusObra } from "@/shared/constants/kanbanStatus";
import { TRANSICOES_VALIDAS, COLUNAS_KANBAN } from "@/shared/constants/kanbanStatus";
import { adicionarHistoricoArmazenado } from "../dados/registros";
import type { EditarObraPayload } from "@/types";
import { obterProgramacoesArmazenadas } from "../dados/programacoes";
import { excluirObraArmazenada } from "../dados/operacoesObras";

export function registrarObras(mock: MockAdapter): void {
  // --- ROTAS DE OBRAS ---
  
  // GET /obras — Rota #12 (Admin, Engenharia e Financeiro. Instalador: 403)
  mock.onGet(/\/obras\/?(\?.*)?$/).reply((config) => {
    const auth = resolverUsuarioAutenticadoMock(config.headers?.Authorization);
    if (auth && auth.perfil.nomePerfil === "InstaladorCampo") {
      return [403, { error: { code: "ACCESS_DENIED", message: "Instalador não possui acesso à lista geral de obras." } }];
    }

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
  
  // POST /obras — Rota #13 (Admin e Engenharia)
  mock.onPost(/\/obras\/?(\?.*)?$/).reply(config => {
    const operador = resolverUsuarioAutenticadoMock(config.headers?.Authorization);
    if (!operador) return [401];
    if (!["Administrador", "Engenharia"].includes(operador.perfil.nomePerfil)) {
      return [403, { error: { code: "ACCESS_DENIED", message: "Você não possui permissão para cadastrar obras." } }];
    }
    try {
      const detalhe = cadastrarObraCenario(extrairDados<unknown>(config.data), operador);
      return [201, { ...detalhe, clienteId: detalhe.cliente.id, criadoEm: new Date().toISOString() }];
    } catch (erro) {
      return [400, { error: { code: "INVALID_BODY", message: erro instanceof Error ? erro.message : "Confira os dados da obra." } }];
    }
  });

  // PATCH /obras/:id/status — Rota #17 (Admin e Engenharia)
  mock.onPatch(/\/obras\/\d+\/status\/?(\?.*)?$/).reply((config) => {
    try {
      const operador = resolverUsuarioAutenticadoMock(config.headers?.Authorization);
      if (!operador) return [401];
      if (!["Administrador", "Engenharia"].includes(operador.perfil.nomePerfil)) {
        return [403, { error: { code: "ACCESS_DENIED", message: "Você não possui permissão para mover cartões no Kanban." } }];
      }

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
  
      const obraAtualizada = atualizarStatusObraArmazenada(id, statusNovo, operador.nome);
      registrarDatasReais(id, statusNovo);
  
      if (!obraAtualizada) {
        return [404, { error: { code: "OBRA_NOT_FOUND", message: `Obra ${id} não encontrada` } }];
      }
  
      // Registra evento formal de histórico (paridade com Rota #7 / Rota #10)
      adicionarHistoricoArmazenado(
        id,
        statusAnterior,
        statusNovo,
        observacao || `Status alterado de ${statusAnterior} para ${statusNovo}.`,
        { id: operador.id, nome: operador.nome }
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
  
  // GET /obras/:id — Rota #14
  mock.onGet(/\/obras\/\d+\/?(\?.*)?$/).reply(config => {
    const id = Number(config.url?.match(/\/obras\/(\d+)/)?.[1]);
    const detalhe = detalheCenario(id);
    return detalhe ? [200, detalhe] : [404, { error: { code: "OBRA_NOT_FOUND", message: "Obra não encontrada." } }];
  });

  // PUT /obras/:id — Rota #15 (Admin e Engenharia)
  mock.onPut(/\/obras\/\d+\/?$/).reply(config => {
    const operador = resolverUsuarioAutenticadoMock(config.headers?.Authorization);
    if (!operador) return [401];
    if (!["Administrador", "Engenharia"].includes(operador.perfil.nomePerfil)) {
      return [403, { error: { code: "ACCESS_DENIED", message: "Você não possui permissão para editar obras." } }];
    }
    const id = Number(config.url?.match(/\/obras\/(\d+)/)?.[1]);
    try {
      const detalhe = editarDetalheCenario(id, extrairDados<EditarObraPayload>(config.data));
      return detalhe ? [200, detalhe] : [404, { error: { code: "OBRA_NOT_FOUND", message: "Obra não encontrada." } }];
    } catch { return [400, { error: { code: "INVALID_BODY", message: "Confira os dados da obra." } }]; }
  });
}

export function registrarExclusaoObra(mock: MockAdapter): void {
  // DELETE /obras/:id — Rota #16 (Admin e Engenharia)
  mock.onDelete(/\/obras\/\d+\/?(\?.*)?$/).reply((config) => {
    const operador = resolverUsuarioAutenticadoMock(config.headers?.Authorization);
    if (!operador) return [401];
    if (!["Administrador", "Engenharia"].includes(operador.perfil.nomePerfil)) {
      return [403, { error: { code: "ACCESS_DENIED", message: "Você não possui permissão para excluir obras." } }];
    }

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
