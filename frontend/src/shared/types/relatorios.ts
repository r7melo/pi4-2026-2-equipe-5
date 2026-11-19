// Contratos neutros de Relatórios e Custos de Obra
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
