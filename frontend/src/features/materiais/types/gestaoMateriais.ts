import type { Material, StatusLogistico } from "@/shared/types/materiais";

// Aumentação local para o atributo HTML padrão focusgroup (toolbar A11y).
declare module "react" {
  interface HTMLAttributes<T> {
    focusgroup?: string;
  }
}

export type AtualizarMaterialPayload = Partial<
  Pick<Material, "tipo" | "quantidade" | "quantidadeUtilizada" | "statusLogistico">
>;

export type AlterarMaterial = {
  id: number;
  obraId?: number;
  payload: AtualizarMaterialPayload;
};

export type AlterarStatusMaterial = {
  id: number;
  statusLogistico?: StatusLogistico;
  quantidadeUtilizada?: number | null;
  obraId: number;
};

export type LoteMateriais = { ids: number[]; obraId: number } & (
  | { acao: "status"; statusLogistico: StatusLogistico }
  | { acao: "excluir" }
);
