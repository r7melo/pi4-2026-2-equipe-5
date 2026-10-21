import { api } from "@/shared/api/api";
import type { MoverStatusResposta } from "@/types";

/** PATCH /api/obras/{id}/status — Rota #7 do Contrato (RF-05 / Movimentação de Raia) */
export async function moverStatusObra(
  id: number,
  statusNovo: string,
  observacao?: string
): Promise<MoverStatusResposta> {
  const { data } = await api.patch<MoverStatusResposta>(`/obras/${id}/status`, {
    statusNovo,
    observacao,
  });
  return data;
}
