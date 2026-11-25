import axios from "axios";
import { api } from "@/shared/api/api";
import { capturarSessaoOperacional, exigirSessaoOperacional } from "@/shared/lib/sessaoOperacao";
import type {
  Cliente,
  CriarClientePayload,
  EditarClientePayload,
  FiltroClientesParams,
  ListaClientesResposta,
} from "@/shared/types/clientes";

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
    exigirSessaoOperacional(origem);
    throw erro;
  }
}

export function extrairMensagemErroCliente(erro: unknown, fallback: string): string {
  if (axios.isAxiosError(erro)) {
    const corpo = erro.response?.data as
      | { error?: { message?: string }; message?: string }
      | undefined;
    const msg = corpo?.error?.message || corpo?.message;
    if (typeof msg === "string" && msg.trim()) return msg;
  }
  if (erro instanceof Error && erro.message.trim()) return erro.message;
  return fallback;
}

/** GET /api/clientes — Rota #10 do Contrato Oficial */
export function listarClientesPaginado(
  filtros?: FiltroClientesParams,
  sessao?: number,
  signal?: AbortSignal
): Promise<ListaClientesResposta> {
  return executarNaSessao(sessao, async (origem) => {
    const params: Record<string, string | number> = {};
    if (filtros?.nome?.trim()) params.nome = filtros.nome.trim();
    if (filtros?.page) params.page = filtros.page;
    if (filtros?.pageSize) params.pageSize = filtros.pageSize;

    const { data } = await api.get<ListaClientesResposta>("/clientes", {
      params,
      sessao403: origem,
      politica401: "sessao",
      suprimirToast403: true,
      signal,
    });
    return data;
  });
}

/** POST /api/clientes — Rota #11 do Contrato Oficial */
export function criarCliente(
  payload: CriarClientePayload,
  sessao?: number
): Promise<Cliente> {
  return executarNaSessao(sessao, async (origem) => {
    const { data } = await api.post<Cliente>("/clientes", payload, {
      sessao403: origem,
      politica401: "sessao",
      suprimirToast403: true,
    });
    return data;
  });
}

/** PUT /api/clientes/{id} — Rota #10a do Contrato Oficial */
export function editarCliente(
  id: number,
  payload: EditarClientePayload,
  sessao?: number
): Promise<Cliente> {
  return executarNaSessao(sessao, async (origem) => {
    const { data } = await api.put<Cliente>(`/clientes/${id}`, payload, {
      sessao403: origem,
      politica401: "sessao",
      suprimirToast403: true,
    });
    return data;
  });
}

/** DELETE /api/clientes/{id} — Rota #10b do Contrato Oficial */
export function excluirCliente(id: number, sessao?: number): Promise<void> {
  return executarNaSessao(sessao, async (origem) => {
    await api.delete(`/clientes/${id}`, {
      sessao403: origem,
      politica401: "sessao",
      suprimirToast403: true,
    });
  });
}
