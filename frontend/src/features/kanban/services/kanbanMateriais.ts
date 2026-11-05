import { api } from "@/shared/api/api";
import { capturarSessaoOperacional, exigirSessaoOperacional } from "@/shared/lib/sessaoOperacao";
import type { Material, CriarMaterialPayload, StatusLogistico } from "@/types";
import type { AtualizarMaterialPayload } from "../types/gestaoMateriais";

async function executarNaSessao<T>(sessao: number | undefined, acao: (origem: number) => Promise<T>): Promise<T> {
  const origem = sessao ?? capturarSessaoOperacional();
  exigirSessaoOperacional(origem);
  try {
    const data = await acao(origem);
    exigirSessaoOperacional(origem);
    return data;
  } catch (erro) {
    // Também descartar 400/500 antigos antes dos callbacks de erro dos hooks.
    exigirSessaoOperacional(origem);
    throw erro;
  }
}

/** GET /api/obras/{obraId}/materiais — Rota #18. */
export function listarMateriais(obraId: number, sessao?: number, signal?: AbortSignal): Promise<Material[]> {
  return executarNaSessao(sessao, async origem => {
    const { data } = await api.get<Material[]>(`/obras/${obraId}/materiais`, { sessao403: origem, politica401: "sessao", suprimirToast403: true, signal });
    return data;
  });
}

/** POST /api/obras/{obraId}/materiais — Rota #19. */
export function registrarMaterial(obraId: number, payload: CriarMaterialPayload, sessao?: number): Promise<Material> {
  return executarNaSessao(sessao, async origem => {
    const { data } = await api.post<Material>(`/obras/${obraId}/materiais`, payload, { sessao403: origem, politica401: "sessao", suprimirToast403: true });
    return data;
  });
}

/** PATCH /api/materiais/{id} — Rota #20 para status; tipo/quantidade são extensão proposta, backend pendente. */
export function atualizarMaterial(id: number, payload: AtualizarMaterialPayload, sessao?: number): Promise<Material> {
  return executarNaSessao(sessao, async origem => {
    const { data } = await api.patch<Material>(`/materiais/${id}`, payload, { sessao403: origem, politica401: "sessao", suprimirToast403: true });
    return data;
  });
}

export function atualizarStatusMaterial(id: number, statusLogistico: StatusLogistico, sessao?: number): Promise<Material> {
  return atualizarMaterial(id, { statusLogistico }, sessao);
}

/** DELETE /api/materiais/{id} — Extensão proposta, backend pendente. */
export function removerMaterial(id: number, sessao?: number): Promise<void> {
  return executarNaSessao(sessao, async origem => {
    await api.delete(`/materiais/${id}`, { sessao403: origem, politica401: "sessao", suprimirToast403: true });
  });
}
