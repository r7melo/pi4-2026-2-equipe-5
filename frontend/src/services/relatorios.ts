// Serviço de Relatórios (Rotas #18, #19 do contrato)
import { api } from "./api";

export interface BalancoMaterial {
  tipo: string;
  unidade: string;
  quantidadeComprada: number;
  quantidadeUtilizada: number;
}

export interface RelatorioCusto {
  obraId: number;
  custoTotal: number;
  receita: number;
  lucro: number;
  itens: { descricao: string; valor: number }[];
  balancoMateriais?: BalancoMaterial[];
}

/** GET /api/obras/{obraId}/relatorio-custo */
export async function buscarRelatorioCusto(obraId: number): Promise<RelatorioCusto> {
  const { data } = await api.get<RelatorioCusto>(`/obras/${obraId}/relatorio-custo`);
  return data;
}

/** GET /api/relatorios/export?formato=pdf|xlsx */
export async function exportarRelatorio(formato: "pdf" | "excel"): Promise<Blob> {
  const { data } = await api.get(`/relatorios/export`, {
    params: { formato },
    responseType: "blob",
  });
  return data as Blob;
}
