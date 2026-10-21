// Tipos do domínio de Relatórios, Balanço de Custos e Compartilhamento Público (RF-15, RF-16)
import type { ObraCard } from "@/features/obras/types/obras";

export interface BalancoMaterial {
  tipo: string;
  unidade: string;
  quantidadeComprada: number;
  quantidadeUtilizada: number;
}

export interface RelatorioCusto {
  obraId: number;
  custoTotal: number;
  receita: number;
  lucro: number;
  itens: { descricao: string; valor: number }[];
  balancoMateriais?: BalancoMaterial[];
}

/** Rota #37 do Contrato de API (07-api.md) — GET /api/cronograma/compartilhado/{token} (RF-16) */
export interface RelatorioPublicoDados {
  periodoInicio: string;
  periodoFim: string;
  clienteFiltro: string;
  obras: ObraCard[];
  totalObras: number;
  obrasConcluidas: number;
  totalPaineis: number;
}

export interface FiltroCronogramaPublico {
  dataInicio?: string;
  dataFim?: string;
}
