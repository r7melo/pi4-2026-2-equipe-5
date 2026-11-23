// Contratos compartilhados de Manutenções do Instalador de Campo (RF-05, RF-19, RN-04, RF-26)
export type StatusManutencao = "Pendente" | "Concluida";

export interface ManutencaoInstalador {
  id: number;
  obraId: number;
  clienteNome: string;
  endereco: string;
  descricao: string;
  status: StatusManutencao;
  dataConclusao?: string | null;
}

export interface ConcluirManutencaoPayload {
  servicoExecutado: string;
}

export interface ManutencaoConcluidaResposta {
  id: number;
  status: "Concluida";
  dataConclusao: string;
}

export interface CriarComentarioManutencaoPayload {
  descricao: string;
}

export interface ComentarioManutencaoResposta {
  id: number;
  obraId?: number;
  manutencaoId?: number;
  descricao: string;
  tipo: "Manutencao";
  autorNome?: string;
  dataRegistro: string;
}
