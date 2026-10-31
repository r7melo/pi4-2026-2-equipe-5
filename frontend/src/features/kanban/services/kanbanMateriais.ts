import { api } from "@/shared/api/api";
import type { Material, CriarMaterialPayload, StatusLogistico } from "@/types";

/** GET /api/obras/{obraId}/materiais — Rota #15 do Contrato */
export async function listarMateriais(obraId: number): Promise<Material[]> {
  const { data } = await api.get<Material[]>(`/obras/${obraId}/materiais`);
  return data;
}

/** POST /api/obras/{obraId}/materiais — Rota #16 do Contrato */
export async function registrarMaterial(
  obraId: number,
  payload: CriarMaterialPayload | Omit<Material, "id" | "obraId">,
  sessao403?: number
): Promise<Material> {
  const { data } = await api.post<Material>(`/obras/${obraId}/materiais`, payload, { sessao403 });
  return data;
}

/** PATCH /api/materiais/{id} — Rota #17 do Contrato: Alteração de dados cadastrais */
export async function atualizarMaterial(
  id: number,
  payload: Partial<Omit<Material, "id" | "obraId">>,
  sessao403?: number
): Promise<Material> {
  const { data } = await api.patch<Material>(`/materiais/${id}`, payload, { sessao403 });
  return data;
}

/** PATCH /api/materiais/{id} — Rota #17 do Contrato: Alteração rápida de status logístico */
export async function atualizarStatusMaterial(
  id: number,
  statusLogistico: StatusLogistico,
  sessao403?: number
): Promise<Material> {
  return atualizarMaterial(id, { statusLogistico }, sessao403);
}

/** DELETE /api/materiais/{id} — Remoção de insumo da obra */
export async function removerMaterial(
  id: number,
  sessao403?: number
): Promise<void> {
  await api.delete(`/materiais/${id}`, { sessao403 });
}
