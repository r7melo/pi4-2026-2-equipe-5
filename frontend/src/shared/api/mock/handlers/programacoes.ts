import type MockAdapter from "axios-mock-adapter";
import { obterEquipesArmazenadas } from "../dados/equipes";
import { obterObrasArmazenadas } from "../dados/obras";
import {
  obterProgramacoesArmazenadas,
  atualizarProgramacaoDataArmazenada,
  deletarProgramacaoArmazenada,
  ConflitoReordenacaoMock,
} from "../dados/programacoes";
import { extrairQueryParams } from "../core/http";
import { resolverUsuarioAutenticadoMock, erroUsuarioMock } from "../core/auth";
import { dataCivilValida, diaUtilCivil } from "@/shared/lib/datasCivis";

export function registrarConsultasCronograma(mock: MockAdapter): void {
  // --- ROTAS DO GANTT ---

  // GET /equipes
  mock.onGet(/\/equipes\/?(\?.*)?$/).reply(() => [200, obterEquipesArmazenadas()]);

  // GET /programacoes (Contrato Canônico Rota #28)
  mock.onGet(/\/programacoes\/?(\?.*)?$/).reply(config => {
    const u = resolverUsuarioAutenticadoMock(config.headers?.Authorization);
    if (!u) return erroUsuarioMock(401, "UNAUTHORIZED", "Sessão ausente ou expirada.");
    const q = extrairQueryParams(config);
    const instaladorId = u.perfil.nomePerfil === "InstaladorCampo" ? u.id : q.instaladorId ? Number(q.instaladorId) : undefined;
    const obrasAtivas = new Set(obterObrasArmazenadas().map(o => Number(o.id)));
    const filtradas = obterProgramacoesArmazenadas()
      .filter(p =>
        obrasAtivas.has(Number(p.obraId)) &&
        (!q.dataInicio || p.dataFim >= q.dataInicio) &&
        (!q.dataFim || p.dataInicio <= q.dataFim) &&
        (!instaladorId || p.equipe?.integrantes.some(i => i.usuarioId === instaladorId)),
      )
      .sort((a, b) => a.dataInicio.localeCompare(b.dataInicio) || a.prioridade - b.prioridade || a.id - b.id);

    const saida = [];
    for (const p of filtradas) {
      const { equipeId: _legado, equipe, ...resto } = p;
      const equipeOrdenada = equipe
        ? Object.assign({}, equipe, {
            integrantes: [...equipe.integrantes].sort(
              (a, b) => a.dataEntrada.localeCompare(b.dataEntrada) || a.nome.localeCompare(b.nome) || a.usuarioId - b.usuarioId,
            ),
          })
        : undefined;
      saida.push(equipeOrdenada ? Object.assign({}, resto, { equipe: equipeOrdenada }) : resto);
    }
    return [200, saida];
  });

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
