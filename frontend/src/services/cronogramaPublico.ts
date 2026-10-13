import { api } from "./api";
import type {
  RelatorioPublicoDados,
  FiltroCronogramaPublico,
  Programacao,
} from "@/types";

/**
 * GET /api/cronograma/compartilhado/{token}
 * RF-16: Busca dados do relatório/cronograma público sem exigência de login
 */
export async function buscarRelatorioPublico(token: string): Promise<RelatorioPublicoDados> {
  const { data } = await api.get<RelatorioPublicoDados>(`/cronograma/compartilhado/${token}`);
  return data;
}

export async function obterCronogramaCompartilhado(
  token: string,
  filtro?: FiltroCronogramaPublico
): Promise<Programacao[]> {
  const { data } = await api.get<Programacao[]>(
    `/cronograma/compartilhado/${encodeURIComponent(token)}`,
    { params: filtro }
  );
  return data;
}
