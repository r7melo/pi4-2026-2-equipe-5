// frontend/src/services/programacoes.ts
// Serviço de Programações / Cronograma (Rotas #14, #15, #16 e #22 do contrato)
import { api } from "./api";
import type { CriarProgramacaoPayload } from "@/types";

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

export type { CriarProgramacaoPayload };

/** GET /api/programacoes — Rota #14 */
export async function listarProgramacoes(): Promise<Programacao[]> {
  const { data } = await api.get<Programacao[]>("/programacoes");
  return data;
}

/** POST /api/programacoes — Rota #15 */
export async function criarProgramacao(
  payload: CriarProgramacaoPayload
): Promise<Programacao> {
  const { data } = await api.post<Programacao>("/programacoes", payload);
  return data;
}

/** PUT /api/programacoes/{id}/reordenar — Rota #16 */
export async function reordenarProgramacao(
  id: number,
  payload: { novaDataInicio?: string; novaDataFim?: string }
): Promise<ReordenarProgramacaoResposta> {
  const { data } = await api.put<ReordenarProgramacaoResposta>(
    `/programacoes/${id}/reordenar`,
    payload
  );
  return data;
}

/** DELETE /api/programacoes/{id} — Rota #22 */
export async function deletarProgramacao(id: number): Promise<void> {
  await api.delete(`/programacoes/${id}`);
}
