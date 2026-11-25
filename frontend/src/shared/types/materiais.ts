// Tipos do domínio de Materiais e Logística de Obra (RF-05, RF-06, RF-25, RF-26, RN-08)
export type StatusLogistico = "EmSolicitacao" | "Comprado" | "EmTransito" | "Disponivel" | "Utilizado";

export interface Material {
  id: number;
  obraId?: number;
  produtoId?: number | null;
  produtoNome?: string | null;
  tipo?: string;
  quantidade: number;
  quantidadeUtilizada?: number | null;
  custoUnitario?: number | null;
  statusLogistico?: StatusLogistico | null;
  descricao?: string;
  unidade?: string;
}

export interface CriarMaterialPayload {
  produtoId?: number;
  tipo?: string;
  quantidade: number;
  custoUnitario?: number;
  statusLogistico?: StatusLogistico | null;
}

export interface AtualizarMaterialPayload extends Partial<CriarMaterialPayload> {
  quantidadeUtilizada?: number | null;
}
