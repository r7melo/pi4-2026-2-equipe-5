import type MockAdapter from "axios-mock-adapter";
import { obterEquipesArmazenadas } from "../dados/equipes";
import { obterProgramacoesArmazenadas, atualizarProgramacaoDataArmazenada, criarProgramacaoArmazenada, deletarProgramacaoArmazenada } from "../dados/programacoes";
import { extrairDados } from "../core/http";
import type { CriarProgramacaoPayload } from "@/types";
import { obterObrasArmazenadas } from "../dados/obras";
import { proximoDiaUtil, normalizarDataMeioDiaUTC, calcularUltimoDiaUtil, formatarDataISO, formatarDataBR, normalizarDataFimInclusiva } from "@/shared/lib/formatters";
import { verificarSobreposicaoPeriodos } from "@/shared/lib/intervalosDiasUteis";

export function registrarConsultasCronograma(mock: MockAdapter): void {
  // --- ROTAS DO GANTT ---
  
  // GET /equipes
  mock.onGet(/\/equipes\/?(\?.*)?$/).reply(() => [200, obterEquipesArmazenadas()]);
  
  // GET /programacoes
  mock.onGet(/\/programacoes\/?(\?.*)?$/).reply(() => [200, obterProgramacoesArmazenadas()]);
  
  // PUT /programacoes/:id/reordenar (Contrato Rota #24 — com programacoesAfetadas)
  mock.onPut(/\/programacoes\/\d+\/reordenar\/?(\?.*)?$/).reply((config) => {
    try {
      const match = config.url?.match(/\/programacoes\/(\d+)\/reordenar/);
      const id = match ? Number(match[1]) : 0;
      const body = extrairDados<{ novaDataInicio?: string; novaDataFim?: string }>(config.data);
      if (!body.novaDataInicio && !body.novaDataFim)
        return [400, { error: { message: "Nenhuma data informada para reordenação" } }];
  
      const resultado = atualizarProgramacaoDataArmazenada(id, body.novaDataInicio, body.novaDataFim);
      if (!resultado) return [404, { error: { message: "Não encontrada" } }];
  
      // Resposta espelhando fielmente o contrato da API (Rota #24)
      return [
        200,
        {
          id,
          novaDataInicio: resultado.principal.dataInicio,
          novaDataFim: resultado.principal.dataFim,
          programacoesAfetadas: resultado.afetadas,
        },
      ];
    } catch {
      return [400, { error: { message: "Erro na reordenação" } }];
    }
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
