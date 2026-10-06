import { api } from "./api";

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

/** GET /api/equipes */
export async function listarEquipes(): Promise<Equipe[]> {
  const { data } = await api.get<Equipe[]>("/equipes");
  return data;
}

/** POST /api/equipes */
export async function criarEquipe(payload: CriarEquipePayload): Promise<Equipe> {
  const { data } = await api.post<Equipe>("/equipes", payload);
  return data;
}

/** GET /api/instaladores (Instaladores aptos para formação de equipe) */
export async function listarInstaladores(): Promise<MembroEquipe[]> {
  const { data } = await api.get<MembroEquipe[]>("/instaladores");
  return data;
}


