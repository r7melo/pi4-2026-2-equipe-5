// Tipos do domínio de Materiais e Logística de Obra (RF-05, RF-06)
export interface Material {
  id: number;
  obraId: number;
  descricao: string;
  quantidade: number;
  unidade: string;
  tipo?: string;
  statusLogistico?: string;
}
