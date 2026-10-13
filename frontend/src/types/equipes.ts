// Tipos do domínio de Equipes e Membros (RF-08, RF-10)
export interface MembroEquipe {
  id: number;
  nome: string;
  email?: string;
}

export interface Equipe {
  id: number;
  nome: string;
  especialidade?: string;
  responsavelId?: number;
  responsavelNome?: string;
  membros?: MembroEquipe[];
}

export interface CriarEquipePayload {
  nome: string;
  especialidade?: string;
  instaladorIds: number[];
  responsavelId: number;
}
