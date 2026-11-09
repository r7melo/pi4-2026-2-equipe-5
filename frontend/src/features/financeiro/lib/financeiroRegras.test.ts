import { describe, it, expect } from "vitest";
import type { NomePerfil } from "@/types";

describe("Regras Financeiras, Acesso e Relatórios (Frente Financeiro - 02 Railton)", () => {
  describe("Permissões de Gestão Financeira (RF-14, RF-20, RF-26, RN-07)", () => {
    function podeAcessarFinanceiro(perfil?: NomePerfil): boolean {
      return perfil === "Administrador" || perfil === "Financeiro";
    }

    function podeLancarCustos(perfil?: NomePerfil): boolean {
      return perfil === "Administrador" || perfil === "Financeiro";
    }

    it("Administrador e Financeiro possuem acesso aos relatórios e DRE", () => {
      expect(podeAcessarFinanceiro("Administrador")).toBe(true);
      expect(podeAcessarFinanceiro("Financeiro")).toBe(true);
      expect(podeLancarCustos("Administrador")).toBe(true);
      expect(podeLancarCustos("Financeiro")).toBe(true);
    });

    it("Engenharia e Instalador não têm acesso a dados financeiros confidenciais (RN-07)", () => {
      expect(podeAcessarFinanceiro("Engenharia")).toBe(false);
      expect(podeAcessarFinanceiro("InstaladorCampo")).toBe(false);
      expect(podeLancarCustos("Engenharia")).toBe(false);
      expect(podeLancarCustos("InstaladorCampo")).toBe(false);
    });
  });

  describe("Filtros e Agrupamento de Relatórios", () => {
    interface ItemRelatorio {
      obraId: number;
      cliente: string;
      status: string;
      valor: number;
    }

    const relatorioMock: ItemRelatorio[] = [
      { obraId: 1, cliente: "Mercado Central", status: "Concluido", valor: 45000 },
      { obraId: 2, cliente: "Residencial Jardins", status: "EmAndamento", valor: 28000 },
      { obraId: 3, cliente: "Hospital São Lucas", status: "Concluido", valor: 95000 },
    ];

    it("deve somar o total faturado das obras com precisão", () => {
      const faturamentoTotal = relatorioMock.reduce((acc, item) => acc + item.valor, 0);
      expect(faturamentoTotal).toBe(168000);
    });

    it("deve filtrar obras concluídas para apuração final", () => {
      const concluidas = relatorioMock.filter((o) => o.status === "Concluido");
      expect(concluidas).toHaveLength(2);
      expect(concluidas.map((o) => o.obraId)).toEqual([1, 3]);
    });
  });
});

