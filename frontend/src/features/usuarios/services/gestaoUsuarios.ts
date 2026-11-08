import axios from "axios";
import { api, ApiErro } from "@/shared/api/api";
import { herdarContexto403 } from "@/shared/lib/sessaoOperacao";
import { usuarioItemSchema, usuariosRespostaSchema, erroGestaoSchema, statusRespostaSchema } from "../types/gestaoUsuarios";
import type { FiltrosUsuarios, EditarUsuario, StatusUsuario } from "../types/gestaoUsuarios";
export function mensagemGestao(erro: unknown): string {
  if (erro instanceof ApiErro) return erro.message;
  return "Não foi possível confirmar a operação. Consulte os dados antes de tentar novamente.";
}
async function executar<T>(acao: () => Promise<T>): Promise<T> {
  try { return await acao(); } catch (erro) {
    if (!axios.isAxiosError<unknown>(erro)) throw erro;
    const envelope = erroGestaoSchema.safeParse(erro.response?.data);
    const codigo = envelope.success ? envelope.data.error.code : "UNKNOWN_ERROR";
    const detalhe = ["USER_VERSION_CONFLICT", "EQUIPE_NOT_FOUND", "VALIDATION_ERROR", "USUARIO_NOT_FOUND"].includes(codigo) ? envelope.success ? envelope.data.error.message : undefined : undefined;
    const convertido = new ApiErro(erro.response?.status ?? 0, codigo, detalhe || ([404,405].includes(erro.response?.status ?? 0) ? "Gestão de usuários indisponível no momento." : "Não foi possível confirmar a operação. Consulte os dados antes de tentar novamente."));
    herdarContexto403(erro, convertido); throw convertido;
  }
}
export function listarUsuarios(filtros: FiltrosUsuarios, sessao: number, signal?: AbortSignal) {
  return executar(async () => {
    const resposta = await api.get("/usuarios", { params: filtros, signal, timeout: 15000, sessao403: sessao, politica401: "sessao" });
    const resultado = usuariosRespostaSchema.parse(resposta.data);
    if (resposta.status !== 200 || resultado.page !== filtros.page || resultado.pageSize !== filtros.pageSize || resultado.itens.length > filtros.pageSize || resultado.total < resultado.itens.length || new Set(resultado.itens.map(u => u.id)).size !== resultado.itens.length) throw new ApiErro(0, "UNEXPECTED_RESPONSE", "Não foi possível confirmar a consulta. Tente novamente.");
    return resultado;
  });
}
export function editarUsuario(id: number, dados: EditarUsuario, sessao: number, email: string) {
  return executar(async () => {
    const resposta = await api.put("/usuarios/" + id, dados, { timeout: 15000, sessao403: sessao, politica401: "sessao" });
    const resultado = usuarioItemSchema.parse(resposta.data);
    if (resposta.status !== 200 || resultado.id !== id || resultado.email !== email || resultado.nome !== dados.nome.trim() || resultado.perfil !== dados.perfil || resultado.equipeId !== dados.equipeId) throw new ApiErro(0, "UNEXPECTED_RESPONSE", "Não foi possível confirmar a operação. Consulte os dados antes de tentar novamente.");
    return resultado;
  });
}
export function atualizarStatus(id: number, dados: StatusUsuario, sessao: number) {
  return executar(async () => {
    const resposta = await api.patch<unknown>("/usuarios/" + id + "/status", dados, { timeout: 15000, sessao403: sessao, politica401: "sessao" });
    const resultado = statusRespostaSchema.parse(resposta.data);
    if (resposta.status !== 200 || resultado.id !== id || resultado.ativo !== dados.ativo) throw new ApiErro(0, "UNEXPECTED_RESPONSE", "Não foi possível confirmar a operação. Consulte os dados antes de tentar novamente.");
    return resultado;
  });
}
