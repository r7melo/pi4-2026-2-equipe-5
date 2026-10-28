import axios, { type AxiosRequestConfig } from "axios";
import { api, ApiErro } from "@/shared/api/api";
import { herdarContexto403 } from "@/shared/lib/sessaoOperacao";
import type { SolicitarSenhaEntrada, RedefinirSenhaEntrada, AlterarSenhaEntrada, ContextoPedidoSenha, MensagemSenha, Usuario } from "@/types";
import { MENSAGEM_RECUPERACAO, MENSAGEM_TROCA_INCERTA } from "../lib/politicaSenha";
import { buscarUsuarioLogado } from "./auth";

function falhaSegura(error: unknown): Error {
  if (!axios.isAxiosError(error)) return new Error(MENSAGEM_TROCA_INCERTA);
  const status = error.response?.status ?? 0;
  const data: unknown = error.response?.data;
  const envelope = data && typeof data === "object" && "error" in data ? data.error : undefined;
  const codigo = envelope && typeof envelope === "object" && "code" in envelope && typeof envelope.code === "string" ? envelope.code : "INTERNAL_ERROR";
  const texto = envelope && typeof envelope === "object" && "message" in envelope && typeof envelope.message === "string" ? envelope.message : "";
  let mensagem = MENSAGEM_TROCA_INCERTA;
  if (status === 400 && codigo === "INVALID_BODY") mensagem = "Confira os dados informados.";
  if (status === 400 && codigo === "VALIDATION_ERROR") {
    mensagem = /link/i.test(texto) ? "Link inválido ou expirado" :
      /senha atual incorreta/i.test(texto) ? "Senha atual incorreta" :
      /igual/i.test(texto) ? "A nova senha não pode ser igual à senha atual" : "A senha não atende aos requisitos mínimos de segurança";
  }
  if (status === 401) mensagem = codigo === "INVALID_CREDENTIALS" ? "Senha atual incorreta" : "Sua sessão expirou. Faça login novamente.";
  if (status === 403) mensagem = "Você não possui permissão para realizar esta ação.";
  const seguro = new ApiErro(status, codigo, mensagem);
  herdarContexto403(error, seguro);
  if (error.config) error.config.data = undefined;
  return seguro;
}

async function pedir(config: AxiosRequestConfig, recuperacao = false): Promise<MensagemSenha> {
  try {
    const resposta = await api.request<unknown>({ ...config, timeout: 20000 });
    resposta.config.data = undefined;
    if (!resposta.data || typeof resposta.data !== "object" || !("mensagem" in resposta.data) || typeof resposta.data.mensagem !== "string" ||
        (!recuperacao && (!("sucesso" in resposta.data) || resposta.data.sucesso !== true))) {
      throw new Error("Resposta de troca não confirmada.");
    }
    return { mensagem: recuperacao ? MENSAGEM_RECUPERACAO : "Senha atualizada com sucesso", sucesso: true };
  } catch (error) {
    throw falhaSegura(error);
  } finally {
    config.data = undefined;
  }
}
export function solicitarRecuperacaoSenha(dados: SolicitarSenhaEntrada, ctx: ContextoPedidoSenha) {
  return pedir({ method: "post", url: "/auth/esqueci-senha", data: { email: dados.email.trim().toLowerCase() }, signal: ctx.signal, semAutenticacao: true }, true);
}
export function redefinirSenha(dados: RedefinirSenhaEntrada, ctx: ContextoPedidoSenha) {
  return pedir({ method: "post", url: "/auth/redefinir-senha", data: dados, signal: ctx.signal, semAutenticacao: true });
}
export function alterarSenha(dados: AlterarSenhaEntrada, ctx: ContextoPedidoSenha) {
  return pedir({ method: "put", url: "/auth/alterar-senha", data: dados, signal: ctx.signal, sessao403: ctx.sessao, politica401: "credencial", suprimirToast403: true });
}
export async function revalidarSessaoSenha(ctx: ContextoPedidoSenha): Promise<Usuario | null> {
  try {
    return await buscarUsuarioLogado({ signal: ctx.signal, sessao403: ctx.sessao, politica401: "manual", timeout: 20000 });
  } catch (error) { throw falhaSegura(error); }
}
