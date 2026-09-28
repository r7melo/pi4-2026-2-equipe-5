// Serviço de Materiais (Rotas #8, #9 do contrato)
import { api } from "./api";

export interface Material {
  id: number;
  obraId: number;
  descricao: string;
  quantidade: number;
  unidade: string;
}

/** GET /api/obras/{obraId}/materiais */
export async function listarMateriais(obraId: number): Promise<Material[]> {
  const { data } = await api.get<Material[]>(`/obras/${obraId}/materiais`);
  return data;
}

/** POST /api/obras/{obraId}/materiais */
export async function registrarMaterial(
  obraId: number,
  payload: Omit<Material, "id" | "obraId">
): Promise<Material> {
  const { data } = await api.post<Material>(`/obras/${obraId}/materiais`, payload);
  return data;
}
