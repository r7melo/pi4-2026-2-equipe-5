import type MockAdapter from "axios-mock-adapter";
import {
  obterMateriaisArmazenados,
  adicionarMaterialArmazenado,
  atualizarMaterialArmazenado,
  removerMaterialArmazenado,
} from "../dados/materiais";
import { extrairDados } from "../core/http";
import type { Material } from "@/types";

export function registrarMateriais(mock: MockAdapter): void {
  // ─── MATERIAIS ───
  // GET /obras/:id/materiais
  mock.onGet(/\/obras\/\d+\/materiais\/?(\?.*)?$/).reply((config) => {
    const match = config.url?.match(/\/obras\/(\d+)\/materiais/);
    const obraId = match ? Number(match[1]) : 0;
    const itens = obterMateriaisArmazenados().filter((m) => m.obraId === obraId);
    return [200, itens];
  });

  // POST /obras/:id/materiais
  mock.onPost(/\/obras\/\d+\/materiais\/?$/).reply((config) => {
    const match = config.url?.match(/\/obras\/(\d+)\/materiais/);
    const obraId = match ? Number(match[1]) : 0;
    try {
      const body = extrairDados<Omit<Material, "id" | "obraId">>(config.data);
      const novo = adicionarMaterialArmazenado(obraId, body);
      if (!novo) return [404, { error: { code: "OBRA_NOT_FOUND", message: "Obra não encontrada." } }];
      return [201, novo];
    } catch {
      return [400, { error: { code: "VALIDATION_ERROR", message: "Erro ao adicionar material." } }];
    }
  });

  // PATCH /materiais/:id — Rota #17
  mock.onPatch(/\/materiais\/\d+\/?$/).reply((config) => {
    const match = config.url?.match(/\/materiais\/(\d+)/);
    const id = match ? Number(match[1]) : 0;
    try {
      const payload = extrairDados<Partial<Material>>(config.data);

      // Pre-validação de domínio para prevenir falsos 500 no Zod parse:
      if (
        payload.statusLogistico &&
        !["Comprado", "EmTransito", "Disponivel", "Utilizado"].includes(payload.statusLogistico)
      ) {
        return [400, { error: { code: "VALIDATION_ERROR", message: "Status logístico inválido." } }];
      }
      if (
        payload.quantidade !== undefined &&
        (typeof payload.quantidade !== "number" || payload.quantidade < 0 || isNaN(payload.quantidade))
      ) {
        return [400, { error: { code: "VALIDATION_ERROR", message: "Quantidade deve ser um número não negativo." } }];
      }

      const atualizado = atualizarMaterialArmazenado(id, payload);
      if (!atualizado) {
        return [404, { error: { code: "MATERIAL_NOT_FOUND", message: "Material não encontrado." } }];
      }
      return [200, atualizado];
    } catch {
      return [400, { error: { code: "VALIDATION_ERROR", message: "Erro ao atualizar material." } }];
    }
  });

  // DELETE /materiais/:id
  mock.onDelete(/\/materiais\/\d+\/?$/).reply((config) => {
    const match = config.url?.match(/\/materiais\/(\d+)/);
    const id = match ? Number(match[1]) : 0;
    const removido = removerMaterialArmazenado(id);
    if (!removido) {
      return [404, { error: { code: "MATERIAL_NOT_FOUND", message: "Material não encontrado." } }];
    }
    return [204, undefined];
  });
}
