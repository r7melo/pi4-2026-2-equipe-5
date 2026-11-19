// Tipos do domínio de Relatórios, Balanço de Custos e Compartilhamento Público (RF-15, RF-16, RF-20)

export type {
  BalancoMaterial,
  RelatorioCusto,
  CustosObra,
  AtualizarCustosPayload,
} from "@/shared/types/relatorios";

export interface ObraResumoFinanceiro {
  id: number;
  status: string;
  clienteNome: string;
  quantidadePaineis: number;
  dataFimEstimada: string;
  dataFimReal?: string;
  nome?: string;
  categoria?: string;
  cidade?: string;
  valorTotal?: number;
}

export interface ListaObrasFinanceiro {
  page?: number;
  pageSize?: number;
  total?: number;
  itens: ObraResumoFinanceiro[];
}

export interface ObraRelatorioPublico {
  id: number;
  status: string;
  clienteNome: string;
  cidade?: string;
  uf?: string;
  quantidadePaineis: number;
  nome?: string;
  progressoGeral?: number | null;
}

/** Rota #43 do Contrato de API (07-api.md) — GET /api/cronograma/compartilhado/{token} (RF-16) */
export interface RelatorioPublicoDados {
  periodoInicio: string;
  periodoFim: string;
  clienteFiltro: string;
  obras: ObraRelatorioPublico[];
  totalObras: number;
  obrasConcluidas: number;
  totalPaineis: number;
}


export interface PedidoExportacaoRelatorio {
  formato: 'pdf' | 'excel';
  filtros?: import('@/shared/types/demonstracao').FiltrosRelatorioDemonstracao;
}
