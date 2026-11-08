import type { Material, StatusLogistico } from "@/types";

export type AtualizarMaterialPayload = Partial<Pick<Material, "tipo" | "quantidade" | "statusLogistico">>;
export type AlterarMaterial = { id: number; payload: AtualizarMaterialPayload };
export type AlterarStatusMaterial = { id: number; statusLogistico: StatusLogistico; obraId: number };
export type ExcluirMaterial = { id: number; obraId: number };
export type LoteMateriais = { ids: number[]; obraId: number } & (
  { acao: "status"; statusLogistico: StatusLogistico } | { acao: "excluir" }
);
