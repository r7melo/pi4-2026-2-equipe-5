import { calcularDRE } from "@/shared/lib/dreCalculos";
import type { DREObra } from "@/shared/types/dre";
import type { AtualizarCustosPayload, CustosObra } from "@/shared/types/relatorios";

export const TETO_FINANCEIRO = 9999999999.99;
export const TETO_CENTAVOS = 999999999999;

export const MENSAGEM_ERRO_CONSULTA_DRE =
  "Não foi possível consultar os custos e o demonstrativo desta obra. Tente novamente.";
export const MENSAGEM_ERRO_ENVIO_CUSTOS =
  "Não foi possível atualizar os valores da obra. Tente novamente.";

const REGEX_DECIMAL_ESTRITO = /^\d+(?:[.,]\d{1,2})?$/;

export interface ApuracaoDrePainel extends DREObra {
  obraConcluida: boolean;
  precificacaoCompleta: boolean;
}

export interface BannerParcialDre {
  titulo: string;
  descricao: string;
}

export interface PreviaMargemDre {
  custoTotal: number;
  resultado: number;
  margemPercentual: number;
  textoMargem: string;
}

export type ResultadoValidacaoCustos =
  | { ok: true; payload: AtualizarCustosPayload }
  | { ok: false; erro: string };

export function normalizarZero(valor: number): number {
  return Object.is(valor, -0) || valor === 0 ? 0 : valor;
}

export function sanitizarNaoNegativo(valor: unknown): number {
  if (typeof valor !== "number" || !Number.isFinite(valor) || valor < 0) return 0;
  return normalizarZero(valor);
}

export function round2(valor: number): number {
  if (!Number.isFinite(valor)) return 0;
  return normalizarZero(Number(valor.toFixed(2)));
}

export function emCentavos(valor: number): number {
  if (!Number.isFinite(valor) || valor < 0) return 0;
  return Math.round(valor * 100);
}

export function statusHttpErro(erro: unknown): number | undefined {
  if (!erro || typeof erro !== "object") return undefined;
  const reg = erro as { response?: { status?: unknown }; status?: unknown };
  if (reg.response && typeof reg.response === "object" && typeof reg.response.status === "number") {
    return reg.response.status;
  }
  return typeof reg.status === "number" ? reg.status : undefined;
}

function extrairDeObjetoMensagem(obj: unknown): string | null {
  if (!obj || typeof obj !== "object" || Array.isArray(obj)) return null;
  const reg = obj as { error?: unknown; message?: unknown };
  if (reg.error && typeof reg.error === "object" && !Array.isArray(reg.error)) {
    const interno = reg.error as { message?: unknown };
    if (typeof interno.message === "string" && interno.message.trim() !== "") {
      return interno.message.trim();
    }
  }
  if (typeof reg.message === "string" && reg.message.trim() !== "") {
    return reg.message.trim();
  }
  return null;
}

/** Extrai exclusivamente do envelope JSON da resposta; nunca expõe AxiosError.message cru. */
export function extrairMensagemErroApi(erro: unknown, fallback: string): string {
  if (!erro || typeof erro !== "object") return fallback;
  const reg = erro as { response?: { data?: unknown }; data?: unknown };
  const deResponse = extrairDeObjetoMensagem(reg.response?.data);
  if (deResponse) return deResponse;
  const deData = extrairDeObjetoMensagem(reg.data);
  if (deData) return deData;
  return fallback;
}

export function apurarDrePainel(
  obraId: number,
  statusObra: string,
  dreEfetivo?: DREObra | null,
  custos?: CustosObra | null
): ApuracaoDrePainel {
  const precificacaoCompleta = dreEfetivo
    ? (dreEfetivo.precificacaoCompleta ?? true)
    : Boolean(custos?.precificacaoCompleta);
  const obraConcluida = dreEfetivo
    ? (dreEfetivo.obraConcluida ?? true)
    : statusObra === "Concluido";

  const statusParaCalculo = obraConcluida
    ? "Concluido"
    : statusObra === "Concluido"
      ? "EmAndamento"
      : statusObra;

  const valorObra = sanitizarNaoNegativo(
    dreEfetivo?.valorObra ?? dreEfetivo?.receitaBruta ?? custos?.valorObra
  );
  const custoMaoObra = sanitizarNaoNegativo(dreEfetivo?.custoMaoObra ?? custos?.custoMaoObra);
  const custoInsumos = sanitizarNaoNegativo(dreEfetivo?.custoInsumos ?? custos?.custoInsumos);

  const base = calcularDRE(
    obraId,
    { valorObra, custoMaoObra, custoInsumos },
    statusParaCalculo,
    precificacaoCompleta
  );

  const custoTotalServ = dreEfetivo?.custoTotal;
  const custoTotal =
    custoTotalServ != null && Number.isFinite(custoTotalServ) && custoTotalServ >= 0
      ? normalizarZero(custoTotalServ)
      : normalizarZero(base.custoTotal);

  const resultadoServ = dreEfetivo?.resultado ?? dreEfetivo?.lucroLiquido;
  const resultado =
    resultadoServ != null && Number.isFinite(resultadoServ)
      ? normalizarZero(resultadoServ)
      : round2(normalizarZero(base.valorObra) - custoTotal);

  const margemServ = dreEfetivo?.margemPercentual;
  const margemPercentual =
    margemServ != null && Number.isFinite(margemServ)
      ? normalizarZero(margemServ)
      : base.valorObra > 0
        ? round2((resultado / base.valorObra) * 100)
        : 0;

  return {
    ...base,
    valorObra: normalizarZero(base.valorObra),
    receitaBruta: normalizarZero(base.valorObra),
    custoMaoObra: normalizarZero(base.custoMaoObra),
    custoInsumos: normalizarZero(base.custoInsumos),
    custoMateriais: normalizarZero(base.custoMateriais ?? base.custoInsumos),
    custoTotal,
    resultado,
    margemPercentual,
    obraConcluida,
    precificacaoCompleta,
  };
}

export function bannerParcialDre(
  obraConcluida: boolean,
  precificacaoCompleta: boolean,
  erroDre400: boolean
): BannerParcialDre | null {
  if (!obraConcluida) {
    return {
      titulo: "Obra em Execução (Demonstrativo Parcial)",
      descricao:
        "O Demonstrativo de Resultado do Exercício consolidado oficial é apurado após a conclusão da obra. Os valores abaixo exibem a estimativa parcial pelos custos lançados.",
    };
  }
  if (!precificacaoCompleta) {
    return {
      titulo: "Precificação Incompleta (Demonstrativo Parcial)",
      descricao:
        "A obra está concluída, porém faltam o valor contratual ou os custos completos para apuração oficial. Os valores abaixo refletem os lançamentos disponíveis.",
    };
  }
  if (erroDre400) {
    return {
      titulo: "Apuração Oficial Pendente (Demonstrativo Parcial)",
      descricao:
        "O servidor ainda não consolidou o demonstrativo oficial desta obra. Os valores abaixo exibem a estimativa baseada nos custos registrados.",
    };
  }
  return null;
}

export function parsearPreviaDecimal(texto?: string | null): number {
  const limpo = (texto ?? "").trim().replace(",", ".");
  if (limpo === "") return 0;
  const num = Number(limpo);
  if (!Number.isFinite(num) || num < 0) return 0;
  return normalizarZero(num);
}

export function calcularPreviaMargem(
  obraId: number,
  entrada: { valorObra?: string; custoMaoObra?: string; custoInsumos?: string }
): PreviaMargemDre {
  const dre = calcularDRE(
    obraId,
    {
      valorObra: parsearPreviaDecimal(entrada.valorObra),
      custoMaoObra: parsearPreviaDecimal(entrada.custoMaoObra),
      custoInsumos: parsearPreviaDecimal(entrada.custoInsumos),
    },
    "Concluido",
    true
  );

  const valorObra = Number.isFinite(dre.valorObra) ? normalizarZero(dre.valorObra) : 0;
  const custoTotal = Number.isFinite(dre.custoTotal) ? normalizarZero(dre.custoTotal) : 0;
  const resultado = Number.isFinite(dre.resultado) ? normalizarZero(dre.resultado) : 0;
  const margemBruta = dre.margemPercentual;
  const margemValida =
    valorObra > 0 && typeof margemBruta === "number" && Number.isFinite(margemBruta);
  const margemPercentual = margemValida ? normalizarZero(margemBruta) : 0;

  let textoMargem = "Aguardando valores";
  if (margemValida) {
    const formatada = margemPercentual.toFixed(1);
    const limpa = formatada === "-0.0" ? "0.0" : formatada;
    textoMargem = `${limpa}% de margem`;
  }

  return {
    custoTotal,
    resultado,
    margemPercentual,
    textoMargem,
  };
}

export function validarEConstruirPayloadCustos(
  dados: { valorObra: string; custoMaoObra: string; custoInsumos: string },
  custosAtuais?: CustosObra | null
): ResultadoValidacaoCustos {
  const campos = [
    ["Valor da Obra", "valorObra"],
    ["Custo de Mão de Obra", "custoMaoObra"],
    ["Custo de Insumos", "custoInsumos"],
  ] as const;

  const extraidos: Record<"valorObra" | "custoMaoObra" | "custoInsumos", number | null> = {
    valorObra: null,
    custoMaoObra: null,
    custoInsumos: null,
  };

  for (const [rotulo, chave] of campos) {
    const texto = dados[chave].trim();
    if (texto === "") {
      if (custosAtuais?.[chave] != null) {
        return {
          ok: false,
          erro: `O campo ${rotulo} já possui valor gravado; informe 0 ou um valor numérico válido sem deixá-lo vazio.`,
        };
      }
      extraidos[chave] = null;
      continue;
    }

    if (!REGEX_DECIMAL_ESTRITO.test(texto)) {
      return {
        ok: false,
        erro: `O campo ${rotulo} deve ser um valor numérico não negativo com até 2 casas decimais.`,
      };
    }

    const num = Number(texto.replace(",", "."));
    if (!Number.isFinite(num) || num > TETO_FINANCEIRO) {
      return {
        ok: false,
        erro: `O campo ${rotulo} deve ser menor ou igual a R$ 9.999.999.999,99.`,
      };
    }

    extraidos[chave] = normalizarZero(num);
  }

  if (
    extraidos.valorObra === null &&
    extraidos.custoMaoObra === null &&
    extraidos.custoInsumos === null
  ) {
    return {
      ok: false,
      erro: "Informe ao menos um campo financeiro válido antes de salvar.",
    };
  }

  const maoEfetiva = extraidos.custoMaoObra ?? sanitizarNaoNegativo(custosAtuais?.custoMaoObra);
  const insumosEfetivo =
    extraidos.custoInsumos ?? sanitizarNaoNegativo(custosAtuais?.custoInsumos);

  if (emCentavos(maoEfetiva) + emCentavos(insumosEfetivo) > TETO_CENTAVOS) {
    return {
      ok: false,
      erro: "A soma de Mão de Obra e Insumos excede o teto máximo permitido de R$ 9.999.999.999,99.",
    };
  }

  return {
    ok: true,
    payload: {
      valorObra: extraidos.valorObra,
      custoMaoObra: extraidos.custoMaoObra,
      custoInsumos: extraidos.custoInsumos,
    },
  };
}
