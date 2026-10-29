/** Projeções de exportação do mock; não redefinem as entidades persistidas. */
export interface ObraFinanceiraEntrada {
  id: number; clienteNome: string; status: string; quantidadePaineis: number;
  dataFimReal?: string; dataFimEstimada: string;
}
export interface ApuracaoFinanceiraEntrada {
  obraId: number; receita: number; custoTotal: number; lucro: number;
  itens: { descricao: string; valor: number }[];
}
export interface ContextoFinanceiro {
  periodoInicio?: string; periodoFim?: string; clienteFiltro?: string; emissao?: string;
}
export interface DocumentoFinanceiro {
  inicio?: string; fim?: string; cliente: string; emissao: string;
  obras: { id: number; clienteNome: string; status: string; quantidadePaineis: number; termino: string;
    relatorio: ApuracaoFinanceiraEntrada | null }[];
  totais: { apuradas: number; receita: number | null; custo: number | null; resultado: number | null };
}
