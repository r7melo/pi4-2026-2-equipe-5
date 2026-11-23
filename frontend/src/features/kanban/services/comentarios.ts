import axios from "axios";
import { api, ApiErro } from "@/shared/api/api";
import { herdarContexto403 } from "@/shared/lib/sessaoOperacao";
import { comentarioSchema, erroComentarioSchema, type AlteracaoComentario, type TipoComentario } from "../types/comentarios";

export async function listarComentariosKanban(obraId: number, sessao403: number, signal?: AbortSignal, tipo?: TipoComentario) {
  const { data } = await api.get<unknown>(`/obras/${obraId}/comentarios`, {
    params: { tipo }, signal, sessao403, politica401: "sessao",
  });
  return comentarioSchema.array().parse(data);
}

export async function alterarComentario(obraId: number, alteracao: AlteracaoComentario, sessao403: number) {
  const config = { sessao403, politica401: "sessao" as const, timeout: 15000 };
  if (alteracao.acao === "excluir") {
    const resposta = await api.delete(`/comentarios/${alteracao.id}`, config);
    if (resposta.status !== 204) throw new ApiErro(resposta.status, "UNEXPECTED_RESPONSE", "Não foi possível confirmar a exclusão. Consulte os comentários.");
    return;
  }
  const resposta = alteracao.acao === "criar"
    ? await api.post<unknown>(`/obras/${obraId}/comentarios`, { tipo: alteracao.tipo, descricao: alteracao.descricao.trim() }, config)
    : await api.put<unknown>(`/comentarios/${alteracao.id}`, { descricao: alteracao.descricao.trim() }, config);
  if (resposta.status !== (alteracao.acao === "criar" ? 201 : 200)) throw new ApiErro(resposta.status, "UNEXPECTED_RESPONSE", "Não foi possível confirmar a alteração. Consulte os comentários.");
  const comentario = comentarioSchema.parse(resposta.data);
  if ((alteracao.acao === "editar" && comentario.id !== alteracao.id) || comentario.descricao !== alteracao.descricao.trim()) {
    throw new ApiErro(0, "UNEXPECTED_RESPONSE", "A resposta não confirmou o comentário enviado. Consulte os dados.");
  }
  return comentario;
}

export function erroComentario(erro: unknown): Error {
  if (!axios.isAxiosError<unknown>(erro)) return erro instanceof Error ? erro : new Error("Não foi possível confirmar a operação.");
  const envelope = erroComentarioSchema.safeParse(erro.response?.data);
  const convertido = new ApiErro(erro.response?.status ?? 0, envelope.success ? envelope.data.error.code : "UNKNOWN_ERROR",
    envelope.success ? envelope.data.error.message : "Não foi possível confirmar a operação. Consulte os comentários antes de repetir.");
  herdarContexto403(erro, convertido);
  return convertido;
}
