import { obterObrasArmazenadas } from "./obras";
import { armazenamentoCenario } from "../core/estadoCenario";
import { lerDadosCenario } from "../core/estadoCenario";
import type { Material } from "@/types";

// ─── MATERIAIS (RF-06) ───
const STORAGE_KEY_MAT = "mock_materiais";

export function obterMateriaisArmazenados(): Material[] { return lerDadosCenario<Material[]>("mock_materiais"); }

export function adicionarMaterialArmazenado(obraId: number, payload: Omit<Material, "id" | "obraId">): Material | undefined {
  if (!obterObrasArmazenadas().some(o => o.id === obraId)) return undefined;
  const materiais = obterMateriaisArmazenados();
  const novoId = materiais.reduce((acc, curr) => Math.max(acc, curr.id), 500) + 1;
  const novo: Material = { ...payload, id: novoId, obraId };
  const atualizados = [...materiais, novo];
  armazenamentoCenario.setItem(STORAGE_KEY_MAT, JSON.stringify(atualizados));
  return novo;
}
