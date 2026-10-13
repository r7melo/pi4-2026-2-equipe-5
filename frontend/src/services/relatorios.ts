import { api } from "./api";
import type { RelatorioCusto } from "@/types";

/** GET /api/obras/{obraId}/relatorio-custo */
export async function buscarRelatorioCusto(obraId: number): Promise<RelatorioCusto> {
  const { data } = await api.get<RelatorioCusto>(`/obras/${obraId}/relatorio-custo`);
  return data;
}

/** GET /api/relatorios/export?formato=pdf|xlsx */
export async function exportarRelatorio(formato: "pdf" | "excel"): Promise<Blob> {
  const { data } = await api.get<Blob>(`/relatorios/export`, {
    params: { formato },
    responseType: "blob",
  });
  return data;
}
