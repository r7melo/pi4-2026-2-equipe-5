import { api } from "@/shared/api/api";
import {
  validarProgramacoes,
  validarRespostaReordenacao,
} from "@/shared/lib/validarProgramacoes";
import type {
  Programacao,
  ReordenarProgramacaoResposta,
  ReordenarProgramacaoPayload,
  CriarProgramacaoPayload,
} from "@/types";

/** GET /api/programacoes — Rota #28 (canônica) */
export async function listarProgramacoes(
  opcoes?: { signal?: AbortSignal; sessao403?: number }
): Promise<Programacao[]> {
  const { data } = await api.get<unknown>("/programacoes", {
    signal: opcoes?.signal,
    sessao403: opcoes?.sessao403,
    politica401: "sessao",
  });
  return validarProgramacoes(data);
}

/** POST /api/programacoes — Rota #29 (canônica) */
export async function criarProgramacao(
  payload: CriarProgramacaoPayload,
  sessao403?: number
): Promise<Programacao> {
  const { data } = await api.post<Programacao>("/programacoes", payload, { sessao403 });
  return data;
}

/** PUT /api/programacoes/{id}/reordenar — Rota #30 (canônica) */
export async function reordenarProgramacao(
  id: number,
  payload: ReordenarProgramacaoPayload,
  sessao403?: number,
  signal?: AbortSignal
): Promise<ReordenarProgramacaoResposta> {
  const corpo = { novaDataInicio: payload.novaDataInicio };
  const { data } = await api.put<unknown>(
    `/programacoes/${id}/reordenar`,
    corpo,
    {
      sessao403,
      signal,
      politica401: "sessao",
    }
  );
  return validarRespostaReordenacao(data);
}

/** Dívida técnica restrita ao mock: não existe rota DELETE /api/programacoes/{id} no contrato canônico */
export async function deletarProgramacao(id: number, sessao403?: number): Promise<void> {
  await api.delete(`/programacoes/${id}`, { sessao403 });
}

