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
  CategoriaObra,
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

/** POST /api/obras — Rota #7 do Contrato (RF-03) */
export async function criarObra(payload: CriarObraPayload): Promise<ObraCard> {
  // O backend C# rejeita se clienteId e clienteNome forem enviados juntos:
  // "Informe clienteId (cliente existente) ou cliente (cliente novo), não os dois."
  const clienteIdEfetivo = payload.clienteId || 1;
  const corpo = {
    clienteId: clienteIdEfetivo,
    categoria: payload.categoria || "Residencial",
    quantidadePaineis: payload.quantidadePaineis,
    quantidadeInversores: payload.quantidadeInversores ?? 1,
    endereco: payload.endereco || `${payload.cidade || "Campinas"} - Centro`,
    dataInicioEstimada: payload.dataInicioEstimada,
    dataFimEstimada: payload.dataFimEstimada,
    pagamento: {
      prazoContratualDias: payload.pagamento.prazoContratualDias,
      dataConfirmacao:
        payload.pagamento.dataConfirmacao ||
        new Date().toISOString().split("T")[0],
    },
  };

  const { data: resposta } = await api.post<ObraCriadaResposta>("/obras", corpo);
  return {
    id: resposta.id,
    clienteNome: payload.clienteNome || "Cliente Cadastrado",
    status: (resposta.status as StatusObra) || "MaterialComprado",
    categoria: (payload.categoria as CategoriaObra) || "Residencial",
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
