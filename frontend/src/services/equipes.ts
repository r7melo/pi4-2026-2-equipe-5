// Serviço de Equipes (Rotas #13 do contrato — GET/POST /api/equipes)
import { api } from "./api";

export interface Equipe {
  id: number;
  nome: string;
  especialidade?: string;
  membros?: { id: number; nome: string }[];
}

/** GET /api/equipes */
export async function listarEquipes(): Promise<Equipe[]> {
  const { data } = await api.get<Equipe[]>("/equipes");
  return data;
}

/** POST /api/equipes */
export async function criarEquipe(payload: { nome: string }): Promise<Equipe> {
  const { data } = await api.post<Equipe>("/equipes", payload);
  return data;
}

