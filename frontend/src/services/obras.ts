import { apiFetch } from "./api";
import type {
  CriarObraPayload,
  ListaObras,
  MoverStatusResposta,
  ObraCard,
  ObraCriadaResposta,
  DadosHomologacao,
} from "@/types";
import type { StatusObra } from "@/constants/kanbanStatus";

export type { CriarObraPayload };

// Mock para desenvolvimento local caso a API backend esteja offline
export const MOCK_OBRAS_INICIAIS: ObraCard[] = [
  {
    id: 1,
    clienteNome: "Obra — João Silva",
    status: "MaterialComprado",
    categoria: "material ok",
    quantidadePaineis: 24,
    dataFimEstimada: "2026-10-15",
  },
  {
    id: 2,
    clienteNome: "Obra — Cond. Vista Alegre",
    status: "MaterialComprado",
    categoria: "material ok",
    quantidadePaineis: 48,
    dataFimEstimada: "2026-10-20",
  },
  {
    id: 3,
    clienteNome: "Obra — Maria Souza",
    status: "NoDeposito",
    categoria: "material ok",
    quantidadePaineis: 18,
    dataFimEstimada: "2026-10-12",
  },
  {
    id: 4,
    clienteNome: "Obra — Fazenda Boa Vista",
    status: "Separado",
    categoria: "atenção",
    quantidadePaineis: 60,
    dataFimEstimada: "2026-10-05",
  },
  {
    id: 5,
    clienteNome: "Obra — Carlos Lima",
    status: "EmAndamento",
    categoria: "em obra",
    quantidadePaineis: 32,
    dataFimEstimada: "2026-09-30",
  },
  {
    id: 6,
    clienteNome: "Obra — Ana Ramos",
    status: "EmAndamento",
    categoria: "em obra",
    quantidadePaineis: 16,
    dataFimEstimada: "2026-10-02",
  },
  {
    id: 7,
    clienteNome: "Obra — Pedro Alves",
    status: "Concluido",
    categoria: "concluído",
    quantidadePaineis: 20,
    dataFimEstimada: "2026-09-15",
  },
  {
    id: 8,
    clienteNome: "Assistência — Obra Silva",
    status: "Assistencia",
    categoria: "manutenção",
    quantidadePaineis: 24,
    dataFimEstimada: "2026-10-10",
  },
];

export async function listarObras(params?: {
  status?: string;
  clienteNome?: string;
  page?: number;
  pageSize?: number;
}): Promise<ListaObras> {
  const query = new URLSearchParams();
  if (params?.status) query.set("status", params.status);
  if (params?.clienteNome) query.set("clienteNome", params.clienteNome);
  if (params?.page) query.set("page", String(params.page));
  if (params?.pageSize) query.set("pageSize", String(params.pageSize));

  const qs = query.toString();
  try {
    return await apiFetch<ListaObras>(`/obras${qs ? `?${qs}` : ""}`);
  } catch (error) {
    // Se o backend ainda não estiver em execução ou não houver conexão, usa mock inicial para garantir funcionamento do frontend
    console.warn("Backend não acessível, carregando dados locais mockados:", error);
    return {
      page: 1,
      pageSize: 200,
      total: MOCK_OBRAS_INICIAIS.length,
      itens: MOCK_OBRAS_INICIAIS,
    };
  }
}

export async function moverStatusObra(
  id: number,
  statusNovo: string,
  observacao?: string
): Promise<MoverStatusResposta> {
  try {
    return await apiFetch<MoverStatusResposta>(`/obras/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ statusNovo, observacao }),
    });
  } catch (error) {
    // Se for erro de rede/backend offline, simula sucesso para permitir teste visual do DnD
    if (error instanceof TypeError && error.message.includes("fetch")) {
      console.warn(`[DEV MOCK] Status da obra ${id} atualizado para ${statusNovo}`);
      return {
        id,
        statusAnterior: "",
        statusNovo,
        dataAlteracao: new Date().toISOString(),
        emailNotificacaoEnviado: statusNovo === "Concluido",
      };
    }
    throw error;
  }
}

export async function criarObra(payload: CriarObraPayload): Promise<ObraCard> {
  try {
    const resposta = await apiFetch<ObraCriadaResposta>("/obras", {
      method: "POST",
      body: JSON.stringify(payload),
    });

    return {
      id: resposta.id,
      clienteNome: payload.clienteNome,
      status: (resposta.status as StatusObra) || "MaterialComprado",
      categoria: "material ok",
      quantidadePaineis: payload.quantidadePaineis,
      dataFimEstimada: resposta.dataFimEstimada || payload.dataFimEstimada,
    };
  } catch (error) {
    // Se for erro de rede/backend offline, simula criação mockada para permitir teste visual e fluxo completo
    if (
      (error instanceof TypeError && error.message.includes("fetch")) ||
      (error instanceof Error && error.message.includes("Failed to fetch"))
    ) {
      const idSimulado = Math.floor(Date.now() / 1000);
      console.warn(`[DEV MOCK] Backend offline. Obra criada localmente com id ${idSimulado}:`, payload);
      return {
        id: idSimulado,
        clienteNome: payload.clienteNome,
        status: "MaterialComprado",
        categoria: "material ok",
        quantidadePaineis: payload.quantidadePaineis,
        dataFimEstimada: payload.dataFimEstimada,
      };
    }
    throw error;
  }
}

/** GET /api/obras/{id}/homologacao — Contrato Rota #17 */
export async function obterHomologacaoObra(obraId: number): Promise<DadosHomologacao> {
  try {
    return await apiFetch<DadosHomologacao>(`/obras/${obraId}/homologacao`);
  } catch {
    return {
      obraId,
      parecerAcesso: "Pendente",
    };
  }
}
