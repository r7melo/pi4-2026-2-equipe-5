import { api } from "./api";
import type { Equipe, MembroEquipe, CriarEquipePayload } from "@/types";

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
