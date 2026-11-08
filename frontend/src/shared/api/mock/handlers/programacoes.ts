import type MockAdapter from "axios-mock-adapter";
import { obterEquipesArmazenadas } from "../dados/equipes";
import {
  obterProgramacoesArmazenadas,
  atualizarProgramacaoDataArmazenada,
  criarProgramacaoArmazenada,
  deletarProgramacaoArmazenada,
  ConflitoReordenacaoMock,
} from "../dados/programacoes";
import { extrairDados } from "../core/http";
import { resolverUsuarioAutenticadoMock, erroUsuarioMock } from "../core/auth";
import type { CriarProgramacaoPayload } from "@/shared/types/programacoes";
import { dataCivilValida, diaUtilCivil } from "@/shared/lib/datasCivis";
import { obterObrasArmazenadas } from "../dados/obras";
import { proximoDiaUtil, normalizarDataMeioDiaUTC, calcularUltimoDiaUtil, formatarDataISO, formatarDataBR, normalizarDataFimInclusiva } from "@/shared/lib/formatters";
import { verificarSobreposicaoPeriodos } from "@/shared/lib/intervalosDiasUteis";

export function registrarConsultasCronograma(mock: MockAdapter): void {
  // --- ROTAS DO GANTT ---

  // GET /equipes
  mock.onGet(/\/equipes\/?(\?.*)?$/).reply(() => [200, obterEquipesArmazenadas()]);

  // GET /programacoes (Contrato Canônico Rota #28)
  mock.onGet(/\/programacoes\/?(\?.*)?$/).reply(() => [200, obterProgramacoesArmazenadas()]);

  // PUT /programacoes/:id/reordenar (Contrato Canônico Rota #30)
  mock.onPut(/\/programacoes\/(-?\d+)\/reordenar\/?(\?.*)?$/).reply((config) => {
    try {
      const match = config.url?.match(/\/programacoes\/(-?\d+)\/reordenar/);
      const id = match ? Number(match[1]) : NaN;
      if (!Number.isSafeInteger(id) || id < -2147483648 || id > 2147483647) {
        return [404, { error: { code: "ROUTE_NOT_FOUND", message: "Rota não encontrada." } }];
      }

      const operador = resolverUsuarioAutenticadoMock(config.headers?.Authorization);
      if (!operador) {
        return erroUsuarioMock(401, "UNAUTHORIZED", "Sessão ausente ou expirada.");
      }
      if (operador.perfil.nomePerfil !== "Administrador" && operador.perfil.nomePerfil !== "Engenharia") {
        return erroUsuarioMock(403, "ACCESS_DENIED", "Acesso não permitido.");
      }

      if (config.data === undefined || config.data === null || (typeof config.data === "string" && config.data.trim() === "")) {
        return [400, { error: { code: "INVALID_BODY", message: "Corpo da requisição ausente." } }];
      }

      let parsed: unknown;
      if (typeof config.data === "string") {
        try {
          parsed = JSON.parse(config.data);
        } catch {
          return [400, { error: { code: "INVALID_BODY", message: "JSON malformado." } }];
        }
      } else if (typeof config.data === "object") {
        parsed = config.data;
      } else {
        return [400, { error: { code: "INVALID_BODY", message: "Corpo da requisição inválido." } }];
      }

      if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
        return [400, { error: { code: "INVALID_BODY", message: "Corpo da requisição deve ser um objeto JSON." } }];
      }

      const bodyObj = parsed as Record<string, unknown>;

      if (!("novaDataInicio" in bodyObj) || bodyObj.novaDataInicio === undefined || bodyObj.novaDataInicio === null) {
        return [400, { error: { code: "VALIDATION_ERROR", message: "novaDataInicio é obrigatória." } }];
      }

      const { novaDataInicio } = bodyObj;

      if (typeof novaDataInicio !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(novaDataInicio) || !dataCivilValida(novaDataInicio)) {
        return [400, { error: { code: "INVALID_BODY", message: "Formato de data inválido. Esperado: yyyy-MM-dd." } }];
      }

      if (!diaUtilCivil(novaDataInicio)) {
        return [400, { error: { code: "VALIDATION_ERROR", message: "novaDataInicio precisa ser um dia útil (segunda a sexta)." } }];
      }

      const resultado = atualizarProgramacaoDataArmazenada(id, novaDataInicio);
      if (!resultado) {
        return [404, { error: { code: "PROGRAMACAO_NOT_FOUND", message: `Programação ${id} não encontrada.` } }];
      }

      return [
        200,
        {
          id,
          novaDataInicio: resultado.principal.dataInicio,
          novaDataFim: resultado.principal.dataFim,
          programacoesAfetadas: resultado.afetadas,
        },
      ];
    } catch (erro) {
      if (erro instanceof ConflitoReordenacaoMock) {
        return [409, { error: { code: "SCHEDULE_CONFLICT", message: erro.message } }];
      }
      if (erro instanceof RangeError) {
        return [400, { error: { code: "VALIDATION_ERROR", message: erro.message } }];
      }
      return [
        500,
        {
          error: {
            code: "INTERNAL_ERROR",
            message: "Erro interno ao reordenar programação.",
          },
        },
      ];
    }
  });

  // Fallback para IDs não numéricos em /programacoes/:segmento/reordenar (404 sem repassar ao backend)
  mock.onPut(/\/programacoes\/[^/]+\/reordenar\/?(\?.*)?$/).reply(() => {
    return erroUsuarioMock(404, "ROUTE_NOT_FOUND", "Rota não encontrada.");
  });
}

export function registrarAlocacoes(mock: MockAdapter): void {
  // POST /programacoes (Rota #23 do Contrato Canônico)
  mock.onPost(/\/programacoes\/?(\?.*)?$/).reply((config) => {
    try {
      const body = extrairDados<CriarProgramacaoPayload>(config.data);
      if (!body.obraId || !body.equipeId || !body.dataInicio) {
        return [400, { error: { code: "VALIDATION_ERROR", message: "Campos obrigatórios ausentes" } }];
      }
  
      const progs = obterProgramacoesArmazenadas();
      const equipes = obterEquipesArmazenadas();
      const obra = obterObrasArmazenadas().find(o => o.id === Number(body.obraId));
      if (!obra) return [404, { error: { code: "OBRA_NOT_FOUND", message: "Obra não encontrada." } }];
      const equipe = equipes.find(e => e.id === Number(body.equipeId));
      if (!equipe) return [404, { error: { code: "EQUIPE_NOT_FOUND", message: "Equipe não encontrada." } }];
  
      // 1. Identificar se há colisão temporal para a mesma equipe
      const novaDataInicio = body.dataInicio;
      let novaDataFim = body.dataFim;
  
      if (!novaDataFim && body.obraId) {
        const paineis = obra.quantidadePaineis;
        const duracaoDias = Math.max(1, Math.ceil(paineis / 9));
        const iniSanitizado = proximoDiaUtil(normalizarDataMeioDiaUTC(novaDataInicio));
        const fimCalculado = calcularUltimoDiaUtil(iniSanitizado, duracaoDias);
        novaDataFim = formatarDataISO(fimCalculado);
      }
  
      if (body.equipeId && novaDataInicio && novaDataFim) {
        const colidente = progs.find((p) => {
          if (Number(p.equipeId) !== Number(body.equipeId)) return false;
          return verificarSobreposicaoPeriodos(
            novaDataInicio,
            novaDataFim,
            p.dataInicio,
            p.dataFim
          );
        });
  
        if (colidente) {
          const nomeEquipe = equipe.nome;
          const fimFormatado = formatarDataBR(normalizarDataFimInclusiva(colidente.dataFim));
          const iniFormatado = formatarDataBR(colidente.dataInicio);
  
          return [
            409,
            {
              error: {
                code: "SCHEDULE_CONFLICT",
                message: `A ${nomeEquipe} já possui a Obra #${colidente.obraId} agendada de ${iniFormatado} a ${fimFormatado} neste período.`,
              },
            },
          ];
        }
      }
  
      const criada = criarProgramacaoArmazenada(body);
      return [201, criada];
    } catch {
      return [400, { error: { code: "BAD_REQUEST", message: "Erro ao criar alocação mockada" } }];
    }
  });
  
  // DELETE /programacoes/:id (dívida restrita ao mock (sem rota no contrato canônico))
  mock.onDelete(/\/programacoes\/\d+\/?(\?.*)?$/).reply((config) => {
    const match = config.url?.match(/\/programacoes\/(\d+)/);
    if (!match) return [400, { error: { code: "BAD_REQUEST", message: "ID inválido" } }];
    const id = Number(match[1]);
    const sucesso = deletarProgramacaoArmazenada(id);
    if (!sucesso) return [404, { error: { code: "NOT_FOUND", message: "Alocação não encontrada" } }];
    return [204];
  });
}
