import { api } from "@/shared/api/api";
import type {
  FiltrosCronogramaCompartilhado,
  ProgramacaoCompartilhada,
  PeriodoCompartilhado,
  LinkCronogramaCompartilhado,
} from "@/shared/types/compartilhamentoCronograma";

/**
 * GET /api/cronograma/compartilhado/{token}
 * RF-16: Busca dados do cronograma público sem exigência de login
 */
export async function obterCronogramaCompartilhado(
  token: string,
  filtro?: FiltrosCronogramaCompartilhado
): Promise<ProgramacaoCompartilhada[]> {
  const { data } = await api.get<ProgramacaoCompartilhada[]>(
    `/cronograma/compartilhado/${encodeURIComponent(token)}`,
    { params: filtro }
  );
  return data;
}

/** POST privado; a sessão é capturada antes do envio, sem estado ou toast no service. */
export async function gerarLinkCompartilhado(
  periodo: PeriodoCompartilhado,
  sessao: number,
): Promise<LinkCronogramaCompartilhado> {
  const { data } = await api.post<LinkCronogramaCompartilhado>(
    "/cronograma/compartilhado", periodo, { sessao403: sessao, timeout: 20000 },
  );
  return data;
}
