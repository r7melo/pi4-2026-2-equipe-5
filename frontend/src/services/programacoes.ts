import { api } from "./api";
import type {
  Programacao,
  ReordenarProgramacaoResposta,
  CriarProgramacaoPayload,
} from "@/types";

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
