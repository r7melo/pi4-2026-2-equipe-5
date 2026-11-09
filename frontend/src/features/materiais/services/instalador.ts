import { api } from "@/shared/api/api";
import type { InstalacaoItemResumo, InstalacaoDetalhe } from "../types/instalador";

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
