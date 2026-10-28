import type MockAdapter from "axios-mock-adapter";
import { obterMateriaisArmazenados, adicionarMaterialArmazenado } from "../dados/materiais";
import { extrairDados } from "../core/http";
import type { Material } from "@/types";

export function registrarMateriais(mock: MockAdapter): void {
  // ─── MATERIAIS ───
  // GET /obras/:id/materiais
  mock.onGet(/\/obras\/\d+\/materiais\/?(\?.*)?$/).reply((config) => {
    const match = config.url?.match(/\/obras\/(\d+)\/materiais/);
    const obraId = match ? Number(match[1]) : 0;
    const itens = obterMateriaisArmazenados().filter(m => m.obraId === obraId);
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
      return [400, { error: { message: "Erro ao adicionar material" } }];
    }
  });
}
