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

export function atualizarMaterialArmazenado(id: number, payload: Partial<Material>): Material | undefined {
  const materiais = obterMateriaisArmazenados();
  const idx = materiais.findIndex(m => m.id === id);
  if (idx === -1) return undefined;
  const atualizado = { ...materiais[idx], ...payload, id };
  materiais[idx] = atualizado;
  armazenamentoCenario.setItem(STORAGE_KEY_MAT, JSON.stringify(materiais));
  return atualizado;
}

export function removerMaterialArmazenado(id: number): boolean {
  const materiais = obterMateriaisArmazenados();
  const novos = materiais.filter(m => m.id !== id);
  if (novos.length === materiais.length) return false;
  armazenamentoCenario.setItem(STORAGE_KEY_MAT, JSON.stringify(novos));
  return true;
}
