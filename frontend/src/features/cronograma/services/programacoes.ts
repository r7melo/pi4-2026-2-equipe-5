import { api } from "@/shared/api/api";
import type {
  Programacao,
  ReordenarProgramacaoResposta,
  CriarProgramacaoPayload,
} from "@/types";

/** GET /api/programacoes — Rota #22 */
export async function listarProgramacoes(): Promise<Programacao[]> {
  const { data } = await api.get<Programacao[]>("/programacoes");
  return data;
}

/** POST /api/programacoes — Rota #23 */
export async function criarProgramacao(
  payload: CriarProgramacaoPayload,
  sessao403?: number
): Promise<Programacao> {
  const { data } = await api.post<Programacao>("/programacoes", payload, { sessao403 });
  return data;
}

/** PUT /api/programacoes/{id}/reordenar — Rota #24 */
export async function reordenarProgramacao(
  id: number,
  payload: { novaDataInicio?: string; novaDataFim?: string },
  sessao403?: number
): Promise<ReordenarProgramacaoResposta> {
  const { data } = await api.put<ReordenarProgramacaoResposta>(
    `/programacoes/${id}/reordenar`,
    payload,
    { sessao403 }
  );
  return data;
}

/** Dívida técnica restrita ao mock: não existe rota DELETE /api/programacoes/{id} no contrato canônico */
export async function deletarProgramacao(id: number, sessao403?: number): Promise<void> {
  await api.delete(`/programacoes/${id}`, { sessao403 });
}

