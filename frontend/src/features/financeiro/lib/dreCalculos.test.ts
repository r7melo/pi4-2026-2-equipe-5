import { describe, it, expect } from "vitest";
import { calcularDRE } from "@/shared/lib/dreCalculos";
import {
  MENSAGEM_ERRO_CONSULTA_DRE,
  MENSAGEM_ERRO_ENVIO_CUSTOS,
  apurarDrePainel,
  bannerParcialDre,
  calcularPreviaMargem,
  extrairMensagemErroApi,
  validarEConstruirPayloadCustos,
} from "./apuracaoDre";

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

describe("Unificação de apuração do DRE no painel (apuracaoDre)", () => {
  it("DTO #34 sem margemPercentual/obraConcluida/precificacaoCompleta assume obra concluída e calcula em cascata", () => {
    const res = apurarDrePainel(
      201,
      "EmAndamento",
      {
        obraId: 201,
        valorObra: 1000,
        custoMaoObra: 200,
        custoInsumos: 300,
        custoTotal: 500,
        resultado: 500,
      },
      null
    );

    expect(res.obraConcluida).toBe(true);
    expect(res.precificacaoCompleta).toBe(true);
    expect(res.custoTotal).toBe(500);
    expect(res.resultado).toBe(500);
    expect(res.margemPercentual).toBe(50);
  });

  it("Cascata usa round2 idêntico a Number(n.toFixed(2)) em empates .xx5 e rejeita custoTotal negativo", () => {
    const res = apurarDrePainel(
      202,
      "Concluido",
      {
        obraId: 202,
        valorObra: 200,
        custoMaoObra: 50,
        custoInsumos: 25,
        custoTotal: -10,
        resultado: Number.NaN,
      },
      null
    );

    expect(res.custoTotal).toBe(75);
    expect(res.resultado).toBe(125);
    expect(res.margemPercentual).toBe(62.5);

    const empate = apurarDrePainel(
      203,
      "Concluido",
      {
        obraId: 203,
        valorObra: 800,
        custoMaoObra: 100,
        custoInsumos: 100,
        custoTotal: 190.04,
        resultado: 609.96,
      },
      null
    );
    expect(empate.margemPercentual).toBe(Number(((609.96 / 800) * 100).toFixed(2)));
  });

  it("Normaliza -0 para 0 em todos os campos e retorna mensagens coerentes nos 3 banners parciais", () => {
    const zeroNeg = apurarDrePainel(
      204,
      "Concluido",
      null,
      {
        obraId: 204,
        valorObra: -0,
        custoMaoObra: -0,
        custoInsumos: 0,
        precificacaoCompleta: true,
      }
    );

    expect(Object.is(zeroNeg.valorObra, -0)).toBe(false);
    expect(Object.is(zeroNeg.resultado, -0)).toBe(false);
    expect(Object.is(zeroNeg.margemPercentual, -0)).toBe(false);

    const serverZeroNeg = apurarDrePainel(
      209,
      "Concluido",
      {
        obraId: 209,
        valorObra: 0,
        custoMaoObra: -0,
        custoInsumos: 0,
        custoTotal: -0,
        resultado: -0,
        margemPercentual: -0,
      },
      null
    );
    expect(Object.is(serverZeroNeg.custoTotal, -0)).toBe(false);
    expect(Object.is(serverZeroNeg.resultado, -0)).toBe(false);
    expect(Object.is(serverZeroNeg.margemPercentual, -0)).toBe(false);

    expect(bannerParcialDre(false, true, true)?.titulo).toBe("Obra em Execução (Demonstrativo Parcial)");
    expect(bannerParcialDre(true, false, true)?.titulo).toBe("Precificação Incompleta (Demonstrativo Parcial)");
    expect(bannerParcialDre(true, true, true)?.titulo).toBe("Apuração Oficial Pendente (Demonstrativo Parcial)");
    expect(bannerParcialDre(true, true, false)).toBeNull();
  });

  it("Extrai mensagem exclusivamente do envelope JSON da API e ignora AxiosError.message cru", () => {
    const axiosLike = {
      message: "Request failed with status code 500",
      response: { status: 500, data: { error: { message: "  Falha no servidor financeiro.  " } } },
    };
    expect(extrairMensagemErroApi(axiosLike, MENSAGEM_ERRO_CONSULTA_DRE)).toBe(
      "Falha no servidor financeiro."
    );

    const semEnvelope = new Error("Network Error");
    expect(extrairMensagemErroApi(semEnvelope, MENSAGEM_ERRO_ENVIO_CUSTOS)).toBe(
      MENSAGEM_ERRO_ENVIO_CUSTOS
    );

    const msgVazia = { response: { status: 500, data: { error: { message: "   " }, message: " " } } };
    expect(extrairMensagemErroApi(msgVazia, MENSAGEM_ERRO_CONSULTA_DRE)).toBe(
      MENSAGEM_ERRO_CONSULTA_DRE
    );
  });

  it("Prévia protege contra entradas extremas pós-calcularDRE e normaliza -0.0%", () => {
    const extrema = calcularPreviaMargem(205, {
      valorObra: "0.01",
      custoMaoObra: "1e307",
      custoInsumos: "",
    });
    expect(extrema.textoMargem).toBe("Aguardando valores");

    const zero = calcularPreviaMargem(206, {
      valorObra: "1000000",
      custoMaoObra: "1000000.01",
      custoInsumos: "0",
    });
    expect(zero.textoMargem).toBe("0.0% de margem");

    const virgula = calcularPreviaMargem(207, {
      valorObra: "1500,50",
      custoMaoObra: "500,25",
      custoInsumos: "250,25",
    });
    expect(virgula.custoTotal).toBe(750.5);
    expect(virgula.resultado).toBe(750);
    expect(virgula.textoMargem).toBe("50.0% de margem");
  });

  it("Validação estrita rejeita formatos inválidos/apagar campo gravado e valida teto em centavos inteiros", () => {
    for (const ruim of ["-1", "-0", "10,100", "1.500", "10,", "0x10", "1e2", "1e309", "10000000000"]) {
      const r = validarEConstruirPayloadCustos(
        { valorObra: ruim, custoMaoObra: "10", custoInsumos: "10" },
        null
      );
      expect(r.ok).toBe(false);
    }

    const todosVazios = validarEConstruirPayloadCustos(
      { valorObra: "", custoMaoObra: "", custoInsumos: "" },
      null
    );
    expect(todosVazios.ok).toBe(false);

    const apagarGravado = validarEConstruirPayloadCustos(
      { valorObra: "", custoMaoObra: "10", custoInsumos: "10" },
      { obraId: 208, valorObra: 500, custoMaoObra: 10, custoInsumos: 10, precificacaoCompleta: true }
    );
    expect(apagarGravado.ok).toBe(false);

    // Soma exata na fronteira em centavos (IEEE-754 binário resulta > 9999999999.99)
    const fronteiraOk = validarEConstruirPayloadCustos(
      { valorObra: "9999999999.99", custoMaoObra: "5000000000.02", custoInsumos: "4999999999.97" },
      null
    );
    expect(fronteiraOk).toEqual({
      ok: true,
      payload: {
        valorObra: 9999999999.99,
        custoMaoObra: 5000000000.02,
        custoInsumos: 4999999999.97,
      },
    });

    const acimaTeto = validarEConstruirPayloadCustos(
      { valorObra: "9999999999.99", custoMaoObra: "5000000000.03", custoInsumos: "4999999999.97" },
      null
    );
    expect(acimaTeto.ok).toBe(false);
  });
});
