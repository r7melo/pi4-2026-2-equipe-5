/** Contratos HTTP neutros usados pelo cronograma e pelo transporte mock. */
export interface PeriodoCompartilhado {
  dataInicio: string;
  dataFim: string;
}

export interface FiltrosCronogramaCompartilhado {
  dataInicio?: string;
  dataFim?: string;
}

export interface LinkCronogramaCompartilhado {
  token: string;
  url: string;
  expiraEm: string;
}

export interface ProgramacaoCompartilhada extends PeriodoCompartilhado {
  id: number;
  obraId: number;
  equipeId: number;
  prioridade: number;
  duracaoEstimadaDias?: number;
}
