// frontend/src/services/cronogramaPublico.ts
// Rota #21 do Contrato de API — GET /api/cronograma/compartilhado/{token} (RF-16)
import { api } from "./api";
import type { ObraCard } from "@/types";
import type { Programacao } from "./programacoes";

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

export interface FiltroCronogramaPublico {
  dataInicio?: string;
  dataFim?: string;
}

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
