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
