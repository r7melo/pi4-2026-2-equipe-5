// Tipos do domínio de Materiais e Logística de Obra (RF-05, RF-06)
export type StatusLogistico = "Comprado" | "EmTransito" | "Disponivel" | "Utilizado";

export interface Material {
  id: number;
  obraId?: number;
  tipo?: string;
  quantidade: number;
  quantidadeUtilizada?: number | null;
  custoUnitario?: number | null;
  statusLogistico?: StatusLogistico;
  descricao?: string;
  unidade?: string;
}

export interface CriarMaterialPayload {
  tipo: string;
  quantidade: number;
  custoUnitario?: number;
  statusLogistico?: StatusLogistico;
}
