import axios from "axios";
import { api } from "@/shared/api/api";
import { capturarSessaoOperacional, exigirSessaoOperacional } from "@/shared/lib/sessaoOperacao";
import type {
  ComentarioManutencaoResposta,
  ConcluirManutencaoPayload,
  CriarComentarioManutencaoPayload,
  InstalacaoDetalhe,
  InstalacaoItemResumo,
  ManutencaoConcluidaResposta,
  ManutencaoInstalador,
  StatusManutencao,
} from "../types/instalador";

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

export function extrairMensagemErroInstalador(erro: unknown, fallback: string): string {
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

/** GET /api/instalador/instalacoes — Rota #37 do Contrato Oficial */
export async function listarInstalacoes(): Promise<InstalacaoItemResumo[]> {
  const { data } = await api.get<InstalacaoItemResumo[]>("/instalador/instalacoes");
  return data;
}

/** GET /api/instalador/instalacoes/{obraId} — Rota #38 do Contrato Oficial */
export async function obterDetalhesInstalacao(obraId: number): Promise<InstalacaoDetalhe> {
  const { data } = await api.get<InstalacaoDetalhe>(`/instalador/instalacoes/${obraId}`);
  return data;
}

/** GET /api/instalador/manutencoes — Rota #39 do Contrato Oficial */
export function listarManutencoesInstalador(
  status?: StatusManutencao,
  sessao?: number,
  signal?: AbortSignal
): Promise<ManutencaoInstalador[]> {
  return executarNaSessao(sessao, async (origem) => {
    const { data } = await api.get<ManutencaoInstalador[]>("/instalador/manutencoes", {
      params: status ? { status } : undefined,
      sessao403: origem,
      politica401: "sessao",
      suprimirToast403: true,
      signal,
    });
    return data;
  });
}

/** PATCH /api/manutencoes/{id}/concluir — Rota #40 do Contrato Oficial */
export function concluirManutencao(
  id: number,
  payload: ConcluirManutencaoPayload,
  sessao?: number
): Promise<ManutencaoConcluidaResposta> {
  return executarNaSessao(sessao, async (origem) => {
    const { data } = await api.patch<ManutencaoConcluidaResposta>(
      `/manutencoes/${id}/concluir`,
      payload,
      {
        sessao403: origem,
        politica401: "sessao",
        suprimirToast403: true,
      }
    );
    return data;
  });
}

/** POST /api/manutencoes/{id}/comentarios — Rota #41 do Contrato Oficial */
export function comentarManutencao(
  id: number,
  payload: CriarComentarioManutencaoPayload,
  sessao?: number
): Promise<ComentarioManutencaoResposta> {
  return executarNaSessao(sessao, async (origem) => {
    const { data } = await api.post<ComentarioManutencaoResposta>(
      `/manutencoes/${id}/comentarios`,
      payload,
      {
        sessao403: origem,
        politica401: "sessao",
        suprimirToast403: true,
      }
    );
    return data;
  });
}
