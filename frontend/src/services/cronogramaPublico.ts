import { api } from "./api";
import type { ObraCard } from "@/types";

export interface RelatorioPublicoDados {
  periodoInicio: string;
  periodoFim: string;
  clienteFiltro: string;
  obras: ObraCard[];
  totalObras: number;
  obrasConcluidas: number;
  totalPaineis: number;
  potenciaTotalKwp: number;
}

/**
 * GET /api/cronograma/compartilhado/{token}
 * RF-16: Busca dados do relatório/cronograma público sem exigência de login
 */
export async function buscarRelatorioPublico(token: string): Promise<RelatorioPublicoDados> {
  const { data } = await api.get<RelatorioPublicoDados>(`/cronograma/compartilhado/${token}`);
  return data;
}
