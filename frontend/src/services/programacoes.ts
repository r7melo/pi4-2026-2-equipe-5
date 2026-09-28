// Serviço de Programações / Cronograma (Rotas #14, #15, #16 do contrato)
import { api } from "./api";

export interface Programacao {
  id: number;
  obraId: number;
  equipeId: number;
  dataInicio: string; // ISO (yyyy-MM-dd)
  dataFim: string;    // ISO (yyyy-MM-dd)
  prioridade: number;
  duracaoEstimadaDias?: number;
}

/** Item afetado pela propagação em cadeia (RF-09) */
export interface ProgramacaoAfetada {
  id: number;
  novaDataInicio: string;
  novaDataFim: string;
}

/** Resposta do PUT /api/programacoes/{id}/reordenar — Contrato Rota #16 */
export interface ReordenarProgramacaoResposta {
  id: number;
  novaDataInicio: string;
  novaDataFim: string;
  programacoesAfetadas: ProgramacaoAfetada[];
}

/** GET /api/programacoes */
export async function listarProgramacoes(): Promise<Programacao[]> {
  const { data } = await api.get<Programacao[]>("/programacoes");
  return data;
}

/** POST /api/programacoes */
export async function criarProgramacao(
  payload: Omit<Programacao, "id">
): Promise<Programacao> {
  const { data } = await api.post<Programacao>("/programacoes", payload);
  return data;
}

/** PUT /api/programacoes/{id}/reordenar — Retorno conforme Contrato Rota #16 */
export async function reordenarProgramacao(
  id: number,
  payload: { novaDataInicio: string }
): Promise<ReordenarProgramacaoResposta> {
  const { data } = await api.put<ReordenarProgramacaoResposta>(
    `/programacoes/${id}/reordenar`,
    payload
  );
  return data;
}
