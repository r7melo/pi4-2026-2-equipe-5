import { api } from "@/shared/api/api";
import { capturarSessaoOperacional, exigirSessaoOperacional } from "@/shared/lib/sessaoOperacao";
import type { Material, CriarMaterialPayload, StatusLogistico } from "@/shared/types/materiais";
import type { AtualizarMaterialPayload } from "../types/gestaoMateriais";

async function executarNaSessao<T>(
  sessao: number | undefined,
  acao: (origem: number) => Promise<T>
): Promise<T> {
  const origem = sessao ?? capturarSessaoOperacional();
  exigirSessaoOperacional(origem);
  try {
    const data = await acao(origem);
    exigirSessaoOperacional(origem);
    return data;
  } catch (erro) {
    // Descartar respostas antigas (400/500/403) se a sessão mudou durante a requisição.
    exigirSessaoOperacional(origem);
    throw erro;
  }
}

/** GET /api/obras/{obraId} — Consulta contextual simplificada para cabeçalhos sem acoplar fatias */
export function buscarContextoObra(
  obraId: number,
  sessao?: number,
  signal?: AbortSignal
): Promise<{ id: number; cliente?: { nome: string } }> {
  return executarNaSessao(sessao, async (origem) => {
    const { data } = await api.get<{ id: number; cliente?: { nome: string } }>(
      `/obras/${obraId}`,
      { sessao403: origem, politica401: "sessao", suprimirToast403: true, signal }
    );
    return data;
  });
}

/** GET /api/obras/{obraId}/materiais — Rota #18 do Contrato */
export function listarMateriais(
  obraId: number,
  sessao?: number,
  signal?: AbortSignal
): Promise<Material[]> {
  return executarNaSessao(sessao, async (origem) => {
    const { data } = await api.get<Material[]>(`/obras/${obraId}/materiais`, {
      sessao403: origem,
      politica401: "sessao",
      suprimirToast403: true,
      signal,
    });
    return data;
  });
}

/** POST /api/obras/{obraId}/materiais — Rota #19 do Contrato */
export function registrarMaterial(
  obraId: number,
  payload: CriarMaterialPayload,
  sessao?: number
): Promise<Material> {
  return executarNaSessao(sessao, async (origem) => {
    const { data } = await api.post<Material>(`/obras/${obraId}/materiais`, payload, {
      sessao403: origem,
      politica401: "sessao",
      suprimirToast403: true,
    });
    return data;
  });
}

/** PATCH /api/materiais/{id} — Rota #20 para status; edição cadastral de tipo/quantidade é extensão local */
export function atualizarMaterial(
  id: number,
  payload: AtualizarMaterialPayload,
  sessao?: number
): Promise<Material> {
  return executarNaSessao(sessao, async (origem) => {
    const { data } = await api.patch<Material>(`/materiais/${id}`, payload, {
      sessao403: origem,
      politica401: "sessao",
      suprimirToast403: true,
    });
    return data;
  });
}

/** PATCH /api/materiais/{id} — Rota #20 do Contrato (atualização de status logístico) */
export function atualizarStatusMaterial(
  id: number,
  statusLogistico: StatusLogistico,
  sessao?: number
): Promise<Material> {
  return atualizarMaterial(id, { statusLogistico }, sessao);
}

/** PATCH /api/materiais/{id} — Atualização de dados cadastrais preservada para compatibilidade do modal */
export function atualizarDadosMaterial(
  id: number,
  payload: AtualizarMaterialPayload,
  sessao?: number
): Promise<Material> {
  return atualizarMaterial(id, payload, sessao);
}

/** DELETE /api/materiais/{id} — Remoção de insumo da obra (extensão local) */
export function excluirMaterial(id: number, sessao?: number): Promise<void> {
  return executarNaSessao(sessao, async (origem) => {
    await api.delete(`/materiais/${id}`, {
      sessao403: origem,
      politica401: "sessao",
      suprimirToast403: true,
    });
  });
}
