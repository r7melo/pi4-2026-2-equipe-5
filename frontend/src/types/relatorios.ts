// Tipos do domínio de Relatórios, Balanço de Custos e Compartilhamento Público (RF-15, RF-16)
import type { ObraCard } from "./obras";

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

/** Rota #21 do Contrato de API — GET /api/cronograma/compartilhado/{token} (RF-16) */
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
