import axios from "axios";
import { api } from "@/shared/api/api";
import { capturarSessaoOperacional, exigirSessaoOperacional } from "@/shared/lib/sessaoOperacao";
import type {
  CriarProdutoPayload,
  EditarProdutoPayload,
  FiltroProdutosParams,
  Produto,
} from "@/shared/types/produtos";

export function extrairMensagemErroProduto(erro: unknown, fallback: string): string {
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

/** GET /api/produtos — Rota #20a do Contrato */
export function listarProdutos(
  filtros?: FiltroProdutosParams,
  sessao?: number,
  signal?: AbortSignal
): Promise<Produto[]> {
  return executarNaSessao(sessao, async (origem) => {
    const params: Record<string, string | boolean> = {};
    if (filtros?.nome?.trim()) params.nome = filtros.nome.trim();
    if (filtros?.tipo?.trim()) params.tipo = filtros.tipo.trim();
    if (filtros?.incluirInativos) params.incluirInativos = true;

    const { data } = await api.get<Produto[]>("/produtos", {
      params,
      sessao403: origem,
      politica401: "sessao",
      suprimirToast403: true,
      signal,
    });
    return data;
  });
}

/** POST /api/produtos — Rota #20b do Contrato */
export function criarProduto(payload: CriarProdutoPayload, sessao?: number): Promise<Produto> {
  return executarNaSessao(sessao, async (origem) => {
    const { data } = await api.post<Produto>("/produtos", payload, {
      sessao403: origem,
      politica401: "sessao",
      suprimirToast403: true,
    });
    return data;
  });
}

/** PUT /api/produtos/{id} — Rota #20c do Contrato */
export function editarProduto(
  id: number,
  payload: EditarProdutoPayload,
  sessao?: number
): Promise<Produto> {
  return executarNaSessao(sessao, async (origem) => {
    const { data } = await api.put<Produto>(`/produtos/${id}`, payload, {
      sessao403: origem,
      politica401: "sessao",
      suprimirToast403: true,
    });
    return data;
  });
}
