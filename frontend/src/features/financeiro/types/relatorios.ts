// Tipos do domínio de Relatórios, Balanço de Custos e Compartilhamento Público (RF-15, RF-16, RF-20)
import type { ObraCard } from "@/types";

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

/** Rota #34 do Contrato de API (07-api.md) — GET /api/obras/{id}/dre (RF-20) */
export interface DREObra {
  obraId: number;
  valorObra: number;
  receitaBruta?: number; // Compatibilidade retroativa
  receitaLiquida?: number; // Compatibilidade retroativa
  deducoesImpostos?: number; // Compatibilidade retroativa
  custoMateriais?: number;
  custoMaoObra: number;
  custoInsumos: number;
  custoTotal: number;
  resultado: number;
  lucroLiquido?: number; // Alias para resultado
  margemContribuicao?: number;
  margemPercentual?: number;
  obraConcluida?: boolean;
  precificacaoCompleta?: boolean;
  observacoes?: string;
}

/** Rota #31 do Contrato de API (07-api.md) — GET /api/obras/{id}/custos (RF-14) */
export interface CustosObra {
  obraId: number;
  custoMaoObra: number | null;
  custoInsumos: number | null;
  valorObra: number | null;
  precificacaoCompleta: boolean;
  materiais?: {
    id: number;
    tipo: string;
    quantidade: number;
    custoUnitario?: number | null;
  }[];
}

/** Rota #32 do Contrato de API (07-api.md) — POST /api/obras/{id}/custos (RF-14) */
export interface AtualizarCustosPayload {
  custoMaoObra?: number | null;
  custoInsumos?: number | null;
  valorObra?: number | null;
}

/** Rota #43 do Contrato de API (07-api.md) — GET /api/cronograma/compartilhado/{token} (RF-16) */
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

export interface PedidoExportacaoRelatorio {
  formato: 'pdf' | 'excel';
  filtros?: import('@/shared/types/demonstracao').FiltrosRelatorioDemonstracao;
}
