// Tipos do domínio de Catálogo de Produtos e Preços (RF-25, RF-26, RN-07)
export interface Produto {
  id: number;
  nome: string;
  tipo: string;
  unidade: string;
  precoUnitario?: number;
  ativo: boolean;
}

export interface CriarProdutoPayload {
  nome: string;
  tipo: string;
  unidade: string;
  precoUnitario: number;
  ativo?: boolean;
}

export type EditarProdutoPayload = Partial<CriarProdutoPayload>;

export interface FiltroProdutosParams {
  nome?: string;
  tipo?: string;
  incluirInativos?: boolean;
}
