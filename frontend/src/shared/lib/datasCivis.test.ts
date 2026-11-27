import fs from "node:fs";
import { afterEach, describe, expect, it } from "vitest";
import * as datasCivis from "@/shared/lib/datasCivis";
import * as formatters from "@/shared/lib/formatters";
import * as instalacao from "@/shared/lib/instalacao";
import * as intervalosDiasUteis from "@/shared/lib/intervalosDiasUteis";

const {
  anteriorDiaUtilCivil,
  dataCivilValida,
  dataFimDiasUteisCivil,
  deslocamentoDiasUteisCivil,
  deslocarDiasUteisCivil,
  diaUtilCivil,
  diasUteisCivis,
  instanteISOValido,
  periodoCivilValido,
  proximoDiaUtilCivil,
  somarDiasCivisUTC,
} = datasCivis;

const {
  adicionarDiasCivis,
  calcularDiasUteisInclusivos,
  calcularUltimoDiaUtil,
  dataFimInclusivaParaDhtmlx,
  dhtmlxFimParaDataInclusiva,
  formatarDataBR,
  formatarDataISO,
  formatarDiasUteis,
  formatarMoeda,
  normalizarDataFimInclusiva,
  normalizarDataMeioDiaUTC,
  obterProximoDiaUtilISO,
  proximoDiaUtil,
} = formatters;

const { avaliarCompletudeInstalacao, dataInstalacaoValida } = instalacao;
const { normalizarIntervaloDiasUteis, verificarSobreposicaoPeriodos } = intervalosDiasUteis;

const FUSOS = ["UTC", "America/Sao_Paulo", "Pacific/Auckland"] as const;

describe("Demanda #106 — Datas Civis, Formatadores, Instalação e Intervalos", () => {
  const tzOriginal = process.env.TZ;

  afterEach(() => {
    if (tzOriginal === undefined) {
      delete process.env.TZ;
    } else {
      process.env.TZ = tzOriginal;
    }
  });

  it("CA-106-01: preserva assinaturas/quantidades de exports e valida anteriorDiaUtilCivil + primitivas civis", () => {
    expect(Object.keys(datasCivis).sort()).toEqual([
      "anteriorDiaUtilCivil",
      "dataCivilValida",
      "dataFimDiasUteisCivil",
      "deslocamentoDiasUteisCivil",
      "deslocarDiasUteisCivil",
      "diaUtilCivil",
      "diasUteisCivis",
      "hojeCivilSaoPaulo",
      "instanteISOValido",
      "periodoCivilValido",
      "proximoDiaUtilCivil",
      "somarDiasCivisUTC",
    ]);
    expect(Object.keys(formatters).sort()).toEqual([
      "adicionarDiasCivis",
      "calcularDiasUteisInclusivos",
      "calcularUltimoDiaUtil",
      "dataFimInclusivaParaDhtmlx",
      "dhtmlxFimParaDataInclusiva",
      "formatarDataBR",
      "formatarDataISO",
      "formatarDiasUteis",
      "formatarMoeda",
      "normalizarDataFimInclusiva",
      "normalizarDataMeioDiaUTC",
      "obterProximoDiaUtilISO",
      "proximoDiaUtil",
    ]);
    expect(Object.keys(instalacao).sort()).toEqual([
      "avaliarCompletudeInstalacao",
      "dataInstalacaoValida",
      "descreverFaltanteInstalacao",
      "normalizarTextoInstalacao",
    ]);
    expect(Object.keys(intervalosDiasUteis).sort()).toEqual([
      "normalizarIntervaloDiasUteis",
      "verificarSobreposicaoPeriodos",
    ]);

    expect(anteriorDiaUtilCivil("2026-10-02")).toBe("2026-10-02");
    expect(anteriorDiaUtilCivil("2026-10-03")).toBe("2026-10-02");
    expect(anteriorDiaUtilCivil("2026-10-04")).toBe("2026-10-02");
    expect(anteriorDiaUtilCivil("2026-10-05")).toBe("2026-10-05");
    expect(anteriorDiaUtilCivil("0001-01-01")).toBe("0001-01-01");
    expect(anteriorDiaUtilCivil("0001-01-06")).toBe("0001-01-05");
    expect(anteriorDiaUtilCivil("0001-01-07")).toBe("0001-01-05");
    expect(anteriorDiaUtilCivil("9999-12-31")).toBe("9999-12-31");
    expect(anteriorDiaUtilCivil("2000-02-29")).toBe("2000-02-29");
    expect(anteriorDiaUtilCivil("2024-02-29")).toBe("2024-02-29");

    for (const invalida of ["1900-02-29", "2026-02-29", "0000-01-01", "2026-02-31", "2026-10-02T00:00:00Z", ""]) {
      expect(() => anteriorDiaUtilCivil(invalida)).toThrow(RangeError);
    }

    expect(dataCivilValida("2026-10-02")).toBe(true);
    expect(periodoCivilValido("2026-10-02", "2026-10-05")).toBe(true);
    expect(somarDiasCivisUTC("2026-10-02", 3)).toBe("2026-10-05");
    expect(diaUtilCivil("2026-10-03")).toBe(false);
    expect(proximoDiaUtilCivil("2026-10-03")).toBe("2026-10-05");
    expect(deslocamentoDiasUteisCivil("2026-10-02", "2026-10-05")).toBe(1);
    expect(deslocarDiasUteisCivil("2026-10-02", 1)).toBe("2026-10-05");
    expect(dataFimDiasUteisCivil("2026-10-02", 2)).toBe("2026-10-05");
    expect(diasUteisCivis("2026-10-02", "2026-10-05")).toBe(2);
    expect(instanteISOValido("2026-10-02T12:00:00Z")).toBe(true);
  });

  it("CA-106-02: garante invariância UTC em matriz de fusos, T00 vs T12, reentrância WeakSet, anti-rollover e ausência de exceções", () => {
    for (const tz of FUSOS) {
      process.env.TZ = tz;

      expect(adicionarDiasCivis("2026-10-02", 1)).toBe("2026-10-03");
      expect(adicionarDiasCivis("2026-10-02T23:30:00Z", 1)).toBe("2026-10-03");
      expect(adicionarDiasCivis("2026-10-02 23:30:00", -1)).toBe("2026-10-01");
      expect(adicionarDiasCivis("2026-10-02", 1.5)).toBe("2026-10-03");
      expect(adicionarDiasCivis("2026-10-02", -1.5)).toBe("2026-10-01");
      expect(adicionarDiasCivis("2026-12-31", 1)).toBe("2027-01-01");
      expect(adicionarDiasCivis("0001-01-01", -1)).toBe("0000-12-31");
      expect(adicionarDiasCivis("-000001-12-31", 1)).toBe("0000-01-01");
      expect(adicionarDiasCivis("+275760-09-12", 1)).toBe("+275760-09-13");
      expect(adicionarDiasCivis("+275760-09-13", 1)).toBe("+000NaN-NaN-NaN");

      expect(normalizarDataFimInclusiva("2026-10-03")).toBe("2026-10-02");
      expect(normalizarDataFimInclusiva("2026-10-04")).toBe("2026-10-02");
      expect(normalizarDataFimInclusiva("2026-10-02T23:59:59Z")).toBe("2026-10-02");
      expect(normalizarDataFimInclusiva("0000-12-31")).toBe("0000-12-29");
      expect(normalizarDataFimInclusiva("+010000-01-01")).toBe("9999-12-31");
      expect(normalizarDataFimInclusiva("+275760-09-13")).toBe("+275760-09-12");
      expect(normalizarDataFimInclusiva("-271821-04-20")).toBe("-271821-04-20");

      expect(dataFimInclusivaParaDhtmlx("0099-12-31")).toBe("0100-01-01");
      expect(dataFimInclusivaParaDhtmlx("9999-12-31")).toBe("+010000-01-01");
      expect(dataFimInclusivaParaDhtmlx("+275760-09-12")).toBe("+275760-09-13");
      expect(dhtmlxFimParaDataInclusiva("+010000-01-01")).toBe("9999-12-31");
      expect(dhtmlxFimParaDataInclusiva("+275760-09-13")).toBe("+275760-09-12");
      expect(dhtmlxFimParaDataInclusiva("0001-01-01")).toBe("0000-12-31");

      expect(calcularDiasUteisInclusivos("2026-10-02", "2026-10-05")).toBe(2);
      expect(calcularDiasUteisInclusivos("2026-10-03T18:00:00Z", "2026-10-04 09:00:00")).toBe(0);
      expect(calcularDiasUteisInclusivos("0000-01-01", "0001-01-01")).toBe(0);

      const dtSab = normalizarDataMeioDiaUTC("2026-10-03");
      expect(formatarDataISO(dtSab)).toBe("2026-10-03");
      expect(formatarDataISO(normalizarDataMeioDiaUTC(dtSab))).toBe("2026-10-03");
      expect(obterProximoDiaUtilISO(dtSab)).toBe("2026-10-05");
      expect(formatarDataISO(calcularUltimoDiaUtil(proximoDiaUtil(normalizarDataMeioDiaUTC("2026-10-02")), 3))).toBe("2026-10-06");
      expect(formatarDataISO(calcularUltimoDiaUtil(proximoDiaUtil(normalizarDataMeioDiaUTC("2026-10-03")), 2))).toBe("2026-10-06");

      const tetoMeioDia = normalizarDataMeioDiaUTC("+275760-09-13");
      expect(Number.isNaN(tetoMeioDia.getTime())).toBe(true);
      expect(formatarDataISO(tetoMeioDia)).toBe("+000NaN-NaN-NaN");
      expect(Number.isNaN(normalizarDataMeioDiaUTC(tetoMeioDia).getTime())).toBe(true);
      expect(formatarDataISO(proximoDiaUtil(tetoMeioDia))).toBe("+000NaN-NaN-NaN");

      expect(formatarDataBR("2026-10-02")).toBe("02/10/2026");
      expect(formatarDataBR(" 2026-10-02T15:30:00Z ")).toBe("02/10/2026");
      expect(formatarDataBR("2026-10-02 15:30:00")).toBe("02/10/2026");
      expect(formatarDataBR("0000-02-29")).toBe("29/02/0000");
      expect(formatarDataBR("-000001-12-31")).toBe("31/12/-000001");
      expect(formatarDataBR("+275760-09-13")).toBe("13/09/+275760");

      for (const rolloverOuInvalida of [
        "2026-02-29",
        "2026-02-30",
        "2026-02-31",
        "0000-02-30",
        "0100-02-29",
        "+000001-01-01",
        "-000000-01-01",
        "+000NaN-NaN-NaN",
        "invalida",
        "",
        "   ",
      ]) {
        expect(formatarDataBR(rolloverOuInvalida)).toBe("—");
        expect(adicionarDiasCivis(rolloverOuInvalida, 1)).toBe("+000NaN-NaN-NaN");
        expect(normalizarDataFimInclusiva(rolloverOuInvalida)).toBe("+000NaN-NaN-NaN");
        expect(dataFimInclusivaParaDhtmlx(rolloverOuInvalida)).toBe("+000NaN-NaN-NaN");
        expect(dhtmlxFimParaDataInclusiva(rolloverOuInvalida)).toBe("+000NaN-NaN-NaN");
        expect(calcularDiasUteisInclusivos(rolloverOuInvalida, "2026-10-05")).toBe(0);
        expect(Number.isNaN(normalizarDataMeioDiaUTC(rolloverOuInvalida).getTime())).toBe(true);
      }

      const nulo = null as unknown as string;
      const indef = undefined as unknown as string;
      expect(formatarDataBR(nulo)).toBe("—");
      expect(formatarDataBR(indef)).toBe("—");
      expect(adicionarDiasCivis("2026-10-02", Number.NaN)).toBe("+000NaN-NaN-NaN");
      expect(adicionarDiasCivis("2026-10-02", Number.POSITIVE_INFINITY)).toBe("+000NaN-NaN-NaN");
      expect(adicionarDiasCivis(nulo, 1)).toBe("+000NaN-NaN-NaN");
      expect(normalizarDataFimInclusiva(indef)).toBe("+000NaN-NaN-NaN");
      expect(calcularDiasUteisInclusivos(nulo, "2026-10-05")).toBe(0);
      expect(Number.isNaN(normalizarDataMeioDiaUTC(nulo).getTime())).toBe(true);
      expect(Number.isNaN(proximoDiaUtil(new Date(Number.NaN)).getTime())).toBe(true);
      expect(Number.isNaN(calcularUltimoDiaUtil(new Date(Number.NaN), 3).getTime())).toBe(true);
      expect(formatarDataISO(new Date(Number.NaN))).toBe("+000NaN-NaN-NaN");
    }

    expect(formatarDiasUteis(1)).toBe("1 dia útil");
    expect(formatarDiasUteis(2)).toBe("2 dias úteis");
    expect(formatarDiasUteis()).toBe("—");
    expect(formatarMoeda(1234.5)).toContain("1.234,50");
  });

  it("CA-106-03: preserva calendário local de instâncias Date nativas nos três fusos, inclusive 0000..0099 e DST", () => {
    for (const tz of FUSOS) {
      process.env.TZ = tz;

      const meiaNoiteLocal = new Date(2026, 9, 1);
      expect(formatarDataISO(meiaNoiteLocal)).toBe("2026-10-01");

      const sabadoLocal = new Date(2026, 9, 3, 14, 25, 0, 0);
      const ajustadaLocal = proximoDiaUtil(sabadoLocal);
      expect(formatarDataISO(ajustadaLocal)).toBe("2026-10-05");
      expect(ajustadaLocal.getHours()).toBe(14);
      expect(ajustadaLocal.getMinutes()).toBe(25);
      expect(obterProximoDiaUtilISO(sabadoLocal)).toBe("2026-10-05");

      // Cruzamento de DST na Nova Zelândia (2026-09-27)
      const vesperaDst = new Date(2026, 8, 26, 0, 0, 0, 0);
      const posDst = proximoDiaUtil(vesperaDst);
      expect(formatarDataISO(posDst)).toBe("2026-09-28");
      expect(posDst.getHours()).toBe(0);

      // Sentinela DHTMLX para 9999-12-31 em calendário local (em Auckland = 9999-12-31T11:00:00Z)
      const sentinelaDhtmlx = new Date(10000, 0, 1, 0, 0, 0, 0);
      expect(dhtmlxFimParaDataInclusiva(sentinelaDhtmlx)).toBe("9999-12-31");

      // Anos 0000..0099 com setFullYear preservados sem mapeamento para 1900..1999
      const anoZero = new Date(0);
      anoZero.setFullYear(0, 11, 29); // 0000-12-29 sexta
      anoZero.setHours(9, 15, 0, 0);
      expect(formatarDataISO(anoZero)).toBe("0000-12-29");
      const fimSobreVirada = calcularUltimoDiaUtil(anoZero, 2);
      expect(formatarDataISO(fimSobreVirada)).toBe("0001-01-01");
      expect(fimSobreVirada.getHours()).toBe(9);

      const anoCinquenta = new Date(0);
      anoCinquenta.setFullYear(50, 0, 1); // 0050-01-01 sábado
      anoCinquenta.setHours(0, 0, 0, 0);
      expect(formatarDataISO(proximoDiaUtil(anoCinquenta))).toBe("0050-01-03");
      expect(formatarDataISO(calcularUltimoDiaUtil(anoCinquenta, 2))).toBe("0050-01-04");
    }
  });

  it("CA-106-04: executa fronteiras estendidas e intervalos multisseculares em O(1) sem exceção", () => {
    for (const tz of FUSOS) {
      process.env.TZ = tz;

      expect(formatarDataISO(proximoDiaUtil(normalizarDataMeioDiaUTC("+010000-01-01")))).toBe("+010000-01-03");
      expect(normalizarDataFimInclusiva("+010000-01-01")).toBe("9999-12-31");
      expect(normalizarDataFimInclusiva("+275760-09-13")).toBe("+275760-09-12");

      const inicio = performance.now();
      const totalUteisSeculos = calcularDiasUteisInclusivos("0001-01-01", "9999-12-31");
      const ultimoDiaSeculos = calcularUltimoDiaUtil(normalizarDataMeioDiaUTC("0001-01-01"), totalUteisSeculos);
      const estouroSuperior = calcularUltimoDiaUtil(normalizarDataMeioDiaUTC("9999-12-31"), 2);
      const decorridoMs = performance.now() - inicio;

      expect(totalUteisSeculos).toBe(diasUteisCivis("0001-01-01", "9999-12-31"));
      expect(formatarDataISO(ultimoDiaSeculos)).toBe("9999-12-31");
      expect(formatarDataISO(estouroSuperior)).toBe("+010000-01-03");
      expect(decorridoMs).toBeLessThan(100);
      expect(calcularDiasUteisInclusivos("2026-10-10", "2026-10-05")).toBe(0);
      expect(calcularDiasUteisInclusivos("0000-01-01", "+010000-01-01")).toBe(0);
    }
  });

  it("CA-106-05: delega validação de instalação a datasCivis.ts e rejeita ano 0000 e rollover", () => {
    expect(dataInstalacaoValida("2026-10-02")).toBe(true);
    expect(dataInstalacaoValida("0001-01-01")).toBe(true);
    expect(dataInstalacaoValida("9999-12-31")).toBe(true);
    expect(dataInstalacaoValida("0000-01-01")).toBe(false);
    expect(dataInstalacaoValida("2026-02-29")).toBe(false);
    expect(dataInstalacaoValida("2026-02-31")).toBe(false);
    expect(dataInstalacaoValida("2026-13-01")).toBe(false);
    expect(dataInstalacaoValida("2026-10-25T00:00:00Z")).toBe(false);
    expect(dataInstalacaoValida("")).toBe(false);
    expect(dataInstalacaoValida(null)).toBe(false);

    const baseDados = {
      obraId: 1,
      tituloObra: "Obra Teste",
      clienteNome: "Cliente Teste",
      endereco: "Rua Central, 100",
      observacoesTecnicas: "Telhado cerâmico",
      materiais: [{ id: 1, nome: "Módulo", quantidade: 10, unidade: "un" }],
      programacoes: [
        { id: 1, equipeId: 1, nomeEquipe: "Equipe 1", dataInicio: "2026-10-05", dataFim: "2026-10-05" },
      ],
    };
    expect(avaliarCompletudeInstalacao(baseDados)).toEqual([]);
    expect(
      avaliarCompletudeInstalacao({
        ...baseDados,
        programacoes: [
          { id: 2, equipeId: 1, nomeEquipe: "Equipe 1", dataInicio: "2026-10-06", dataFim: "2026-10-05" },
        ],
      })
    ).toEqual([{ grupo: "periodos", programacaoId: 2 }]);
    expect(
      avaliarCompletudeInstalacao({
        ...baseDados,
        programacoes: [
          { id: 3, equipeId: 1, nomeEquipe: "Equipe 1", dataInicio: "0000-01-01", dataFim: "2026-10-05" },
        ],
      })
    ).toEqual([{ grupo: "periodos", programacaoId: 3 }]);
  });

  it("CA-106-06: valida intervalosDiasUteis.ts sem imports de @/features/ e rejeitando inválidas sem NaN", () => {
    const fonte = fs.readFileSync(new URL("./intervalosDiasUteis.ts", import.meta.url), "utf8");
    expect(fonte).not.toContain("@/features/");

    expect(normalizarIntervaloDiasUteis("2026-10-03", "2026-10-04")).toEqual({
      inicio: "2026-10-05",
      fim: "2026-10-05",
    });
    expect(normalizarIntervaloDiasUteis("2026-10-03T18:00:00Z", "2026-10-07 08:00:00")).toEqual({
      inicio: "2026-10-05",
      fim: "2026-10-07",
    });
    expect(normalizarIntervaloDiasUteis("2026-10-09", "2026-10-05")).toEqual({
      inicio: "2026-10-09",
      fim: "2026-10-09",
    });
    expect(
      normalizarIntervaloDiasUteis(normalizarDataMeioDiaUTC("2026-10-02"), new Date(2026, 9, 5))
    ).toEqual({
      inicio: "2026-10-02",
      fim: "2026-10-05",
    });

    expect(verificarSobreposicaoPeriodos("2026-10-05", "2026-10-07", "2026-10-07", "2026-10-09")).toBe(true);
    expect(verificarSobreposicaoPeriodos("2026-10-05", "2026-10-06", "2026-10-07", "2026-10-09")).toBe(false);

    const nulo = null as unknown as string;
    for (const bad of ["", "invalida", "2026-02-29", "2026-02-31", "0000-01-01", "+010000-01-01", nulo]) {
      expect(normalizarIntervaloDiasUteis(bad, "2026-10-05")).toBeNull();
      expect(verificarSobreposicaoPeriodos(bad, "2026-10-05", "2026-10-05", "2026-10-06")).toBe(false);
    }
    expect(normalizarIntervaloDiasUteis(new Date(Number.NaN), "2026-10-05")).toBeNull();
  });

  it("calcula hojeCivilSaoPaulo no fuso America/Sao_Paulo independente do fuso UTC/local", () => {
    expect(datasCivis.hojeCivilSaoPaulo(new Date("2026-12-02T01:30:00Z"))).toBe("2026-12-01");
    expect(datasCivis.hojeCivilSaoPaulo(new Date("2026-12-02T03:00:00Z"))).toBe("2026-12-02");
  });
});
