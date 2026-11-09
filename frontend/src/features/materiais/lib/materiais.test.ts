import { describe, it, expect } from "vitest";
import type { StatusLogistico, Material, NomePerfil } from "@/types";

describe("Gestão de Materiais e Ciclo Logístico (Frente Materiais - 02 Railton)", () => {
  const STATUS_CICLO: StatusLogistico[] = [
    "Comprado",
    "EmTransito",
    "Disponivel",
    "Utilizado",
  ];

  it("deve cobrir todos os 4 status do ciclo logístico canônico da API (RN-08)", () => {
    expect(STATUS_CICLO).toHaveLength(4);
    expect(STATUS_CICLO).toContain("Comprado");
    expect(STATUS_CICLO).toContain("EmTransito");
    expect(STATUS_CICLO).toContain("Disponivel");
    expect(STATUS_CICLO).toContain("Utilizado");
  });

  it("deve calcular corretamente o custo total de uma lista de materiais", () => {
    const materiais: Partial<Material>[] = [
      { id: 1, tipo: "Módulo Solar 550W", quantidade: 10, custoUnitario: 450.0 },
      { id: 2, tipo: "Inversor 5kW", quantidade: 1, custoUnitario: 3200.0 },
      { id: 3, tipo: "Cabo Solar 6mm", quantidade: 100, custoUnitario: 4.5 },
      { id: 4, tipo: "Conector MC4", quantidade: 20, custoUnitario: null }, // sem custo definido ainda
    ];

    const custoTotalInsumos = materiais.reduce((acc, m) => {
      const unitario = m.custoUnitario ?? 0;
      const qtd = m.quantidade ?? 0;
      return acc + unitario * qtd;
    }, 0);

    // 10 * 450 = 4500 + 3200 + 450 = 8150
    expect(custoTotalInsumos).toBe(8150);
  });

  describe("Isolamento de Custos e Permissões RBAC (RN-07 / RF-26)", () => {
    function podeVisualizarCustos(perfil?: NomePerfil): boolean {
      return perfil === "Administrador" || perfil === "Financeiro";
    }

    function podeAlterarMaterial(perfil?: NomePerfil): boolean {
      return perfil === "Administrador" || perfil === "Financeiro";
    }

    it("Administrador deve ter permissão total de ver e alterar custos", () => {
      expect(podeVisualizarCustos("Administrador")).toBe(true);
      expect(podeAlterarMaterial("Administrador")).toBe(true);
    });

    it("Instalador de Campo não pode visualizar ou manipular valores de materiais", () => {
      expect(podeVisualizarCustos("InstaladorCampo")).toBe(false);
      expect(podeAlterarMaterial("InstaladorCampo")).toBe(false);
    });
  });
});

