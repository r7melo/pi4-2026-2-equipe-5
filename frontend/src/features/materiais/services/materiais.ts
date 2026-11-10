import { api } from "@/shared/api/api";
import type { Material, CriarMaterialPayload, StatusLogistico, AtualizarMaterialPayload } from "@/types";

/** GET /api/obras/{obraId} — Consulta contextual simplificada para cabeçalhos sem acoplar fatias */
export async function buscarContextoObra(obraId: number): Promise<{ id: number; cliente?: { nome: string } }> {
  const { data } = await api.get<{ id: number; cliente?: { nome: string } }>(`/obras/${obraId}`);
  return data;
}

/** GET /api/obras/{obraId}/materiais — Rota #18 do Contrato */
export async function listarMateriais(obraId: number): Promise<Material[]> {
  const { data } = await api.get<Material[]>(`/obras/${obraId}/materiais`);
  return data;
}

/** POST /api/obras/{obraId}/materiais — Rota #19 do Contrato */
export async function registrarMaterial(
  obraId: number,
  payload: CriarMaterialPayload | Omit<Material, "id" | "obraId">,
  sessao403?: number
): Promise<Material> {
  const { data } = await api.post<Material>(`/obras/${obraId}/materiais`, payload, { sessao403 });
  return data;
}

/** PATCH /api/materiais/{id} — Rota #20 do Contrato (atualização de status logístico) */
export async function atualizarStatusMaterial(
  id: number,
  statusLogistico: StatusLogistico,
  sessao403?: number
): Promise<Material> {
  const { data } = await api.patch<Material>(`/materiais/${id}`, { statusLogistico }, { sessao403 });
  return data;
}

/** PATCH /api/materiais/{id} — Atualização de dados cadastrais (tipo, quantidade, custo) */
export async function atualizarDadosMaterial(
  id: number,
  payload: AtualizarMaterialPayload,
  sessao403?: number
): Promise<Material> {
  const { data } = await api.patch<Material>(`/materiais/${id}`, payload, { sessao403 });
  return data;
}

/** DELETE /api/materiais/{id} — Remoção de insumo da obra */
export async function excluirMaterial(id: number, sessao403?: number): Promise<void> {
  await api.delete(`/materiais/${id}`, { sessao403 });
}
