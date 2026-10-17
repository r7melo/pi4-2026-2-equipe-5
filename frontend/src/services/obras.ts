import { api } from "./api";
import type {
  CriarObraPayload,
  ListaObras,
  MoverStatusResposta,
  ObraCard,
  ObraCriadaResposta,
  DadosHomologacao,
  ObraDetalhe,
  HistoricoObra,
  ComentarioObra,
  EditarObraPayload,
} from "@/types";
import type { StatusObra } from "@/constants/kanbanStatus";

/** GET /api/obras — Rota #4 do Contrato */
export async function listarObras(params?: {
  status?: string;
  clienteNome?: string;
  page?: number;
  pageSize?: number;
}): Promise<ListaObras> {
  const { data } = await api.get<ListaObras>("/obras", { params });
  return data;
}

/** PATCH /api/obras/{id}/status — Rota #7 do Contrato */
export async function moverStatusObra(
  id: number,
  statusNovo: string,
  observacao?: string
): Promise<MoverStatusResposta> {
  const { data } = await api.patch<MoverStatusResposta>(`/obras/${id}/status`, {
    statusNovo,
    observacao,
  });
  return data;
}

/** POST /api/obras — Rota #3 do Contrato (Retorna ObraCard para preservar CadastrarObra.tsx) */
export async function criarObra(payload: CriarObraPayload): Promise<ObraCard> {
  const { data: resposta } = await api.post<ObraCriadaResposta>("/obras", payload);
  return {
    id: resposta.id,
    clienteNome: payload.clienteNome,
    status: (resposta.status as StatusObra) || "MaterialComprado",
    categoria: "Residencial",
    quantidadePaineis: payload.quantidadePaineis,
    dataFimEstimada: resposta.dataFimEstimada || payload.dataFimEstimada,
  };
}

/** GET /api/obras/{id} — Rota #5 do Contrato */
export async function buscarObra(id: number): Promise<ObraDetalhe> {
  const { data } = await api.get<ObraDetalhe>(`/obras/${id}`);
  return data;
}

/** PUT /api/obras/{id} — Rota #9 do Contrato (UC-17) */
export async function atualizarObra(id: number, payload: EditarObraPayload): Promise<ObraDetalhe> {
  const { data } = await api.put<ObraDetalhe>(`/obras/${id}`, payload);
  return data;
}

/** GET /api/obras/{id}/historico — Rota #10 do Contrato */
export async function listarHistorico(obraId: number): Promise<HistoricoObra[]> {
  const { data } = await api.get<HistoricoObra[]>(`/obras/${obraId}/historico`);
  return data;
}

/** GET /api/obras/{id}/comentarios — Rota #12 do Contrato */
export async function listarComentarios(obraId: number): Promise<ComentarioObra[]> {
  const { data } = await api.get<ComentarioObra[]>(`/obras/${obraId}/comentarios`);
  return data;
}

/** POST /api/obras/{id}/comentarios — Rota #13 do Contrato */
export async function adicionarComentario(obraId: number, descricao: string): Promise<ComentarioObra> {
  const { data } = await api.post<ComentarioObra>(`/obras/${obraId}/comentarios`, { descricao });
  return data;
}

/** GET /api/obras/{id}/homologacao — Rota #17 do Contrato */
export async function obterHomologacaoObra(obraId: number): Promise<DadosHomologacao> {
  const { data } = await api.get<DadosHomologacao>(`/obras/${obraId}/homologacao`);
  return data;
}

/** DELETE /api/obras/{id} — Rota #11 do Contrato */
export async function excluirObra(id: number): Promise<void> {
  await api.delete(`/obras/${id}`);
}
