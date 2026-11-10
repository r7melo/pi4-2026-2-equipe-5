import { describe, it, expect } from "vitest";
import { calcularDRE } from "@/shared/lib/dreCalculos";

describe("Cálculos de DRE e Regras Financeiras (RF-20 / RN-03)", () => {
  it("Cenário 1: Cálculo oficial (Resultado = Valor da Obra (30.000) - Custo Total (14.500) = 15.500)", () => {
    const dre = calcularDRE(
      101,
      {
        valorObra: 30000,
        custoMaoObra: 4500,
        custoInsumos: 10000,
      },
      "Concluido",
      true
    );

    expect(dre.valorObra).toBe(30000);
    expect(dre.custoTotal).toBe(14500);
    expect(dre.resultado).toBe(15500);
    expect(dre.margemPercentual).toBe(51.67);
    expect(dre.obraConcluida).toBe(true);
    expect(dre.precificacaoCompleta).toBe(true);
  });

  it("Cenário 2: Obra concluída com custos superiores ao valor da obra (Prejuízo)", () => {
    const dre = calcularDRE(
      102,
      {
        valorObra: 20000,
        custoMaoObra: 12000,
        custoInsumos: 15000,
      },
      "Concluido",
      true
    );

    expect(dre.custoTotal).toBe(27000);
    expect(dre.resultado).toBe(-7000);
    expect(dre.margemPercentual).toBe(-35.0);
  });

  it("Cenário 3: Restrição RN-03 — Obra não concluída (Em Andamento)", () => {
    const dre = calcularDRE(
      103,
      {
        valorObra: 40000,
        custoMaoObra: 5000,
        custoInsumos: 10000,
      },
      "EmAndamento",
      true
    );

    expect(dre.obraConcluida).toBe(false);
    expect(dre.observacoes).toContain("exige a conclusão");
  });

  it("Cenário 4: Restrição RN-03 — Obra concluída com precificação incompleta", () => {
    const dre = calcularDRE(
      104,
      {
        valorObra: null,
        custoMaoObra: 5000,
        custoInsumos: null,
      },
      "Concluido",
      false
    );

    expect(dre.precificacaoCompleta).toBe(false);
    expect(dre.observacoes).toContain("incompleta");
  });

  it("Cenário 5: Robustez contra valores negativos e nulos", () => {
    const dre = calcularDRE(
      105,
      {
        valorObra: -500,
        custoMaoObra: -200,
        custoInsumos: 0,
      },
      "Concluido",
      true
    );

    expect(dre.receitaBruta).toBe(0);
    expect(dre.custoMaoObra).toBe(0);
    expect(dre.margemPercentual).toBe(0);
  });
});
