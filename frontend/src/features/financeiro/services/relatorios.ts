import type { FiltrosRelatorioDemonstracao } from "@/shared/types/demonstracao";
import { api } from "@/shared/api/api";
import type { RelatorioCusto } from "@/types";

/** GET /api/obras/{obraId}/relatorio-custo */
export async function buscarRelatorioCusto(obraId: number): Promise<RelatorioCusto> {
  const { data } = await api.get<RelatorioCusto>(`/obras/${obraId}/relatorio-custo`);
  return data;
}

/** GET /api/relatorios/export?formato=pdf|xlsx */
export async function exportarRelatorio(formato: "pdf" | "excel", filtros?: FiltrosRelatorioDemonstracao): Promise<Blob> {
  const { data } = await api.get<Blob>(`/relatorios/export`, {
    params: { formato, ...filtros },
    responseType: "blob",
  });
  return data;
}

/** Extensao interna: consumidor habilitado somente quando o mock esta ativo. */
export async function gerarLinkRelatorioDemonstracao(filtros: FiltrosRelatorioDemonstracao): Promise<string> {
  const { data } = await api.post<{ token: string }>("/mock/relatorios/compartilhado", filtros);
  return data.token;
}
