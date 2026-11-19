// Formatadores de UI e utilitários de calendário do sistema ZL Engenharia
import {
  anteriorDiaUtilCivil,
  dataCivilValida,
  dataFimDiasUteisCivil,
  diasUteisCivis,
  proximoDiaUtilCivil,
} from "@/shared/lib/datasCivis";

const REGEX_DATA_CANONICA = /^([0-9]{4}|[+-][0-9]{6})-([0-9]{2})-([0-9]{2})$/;
const SENTINELA_DATA_INVALIDA = "+000NaN-NaN-NaN";

/** Rastreia instâncias Date ancoradas em UTC por normalizarDataMeioDiaUTC sem perda por heurística de fuso UTC+12. */
const DATAS_CIVIS_UTC = new WeakSet<Date>();

function marcarDataCivilUTC(data: Date): Date {
  DATAS_CIVIS_UTC.add(data);
  return data;
}

function extrairDataCalendarioISO(valor: unknown): string | null {
  if (typeof valor !== "string") return null;
  const prefixo = valor.trim().split(/[T ]/)[0];
  const match = REGEX_DATA_CANONICA.exec(prefixo);
  if (!match) return null;
  const anoStr = match[1];
  if (anoStr.startsWith("+") || anoStr.startsWith("-")) {
    const ano = Number(anoStr);
    if (ano >= 0 && ano <= 9999) return null;
  }
  const verificada = new Date(`${prefixo}T00:00:00.000Z`);
  return Number.isFinite(verificada.getTime()) && verificada.toISOString().split("T")[0] === prefixo
    ? prefixo
    : null;
}

function resolverPrefixoCalendario(entrada: unknown): string | null {
  if (entrada instanceof Date) {
    return Number.isFinite(entrada.getTime()) ? formatarDataISO(entrada) : null;
  }
  return extrairDataCalendarioISO(entrada);
}

/** Evita estreitamento de tipo (`string` -> `never`) em ramificações que tratam anos `0000` ou estendidos. */
function ehDataCivilISO(valor: string): boolean {
  return dataCivilValida(valor);
}

function deslocarDataCalendarioT00(entrada: unknown, dias: number): string {
  if (typeof dias !== "number" || !Number.isFinite(dias)) return SENTINELA_DATA_INVALIDA;
  const iso = resolverPrefixoCalendario(entrada);
  if (!iso) return SENTINELA_DATA_INVALIDA;
  const dt = new Date(`${iso}T00:00:00.000Z`);
  if (!Number.isFinite(dt.getTime())) return SENTINELA_DATA_INVALIDA;
  dt.setUTCDate(dt.getUTCDate() + Math.trunc(dias));
  return Number.isFinite(dt.getTime()) ? dt.toISOString().split("T")[0] : SENTINELA_DATA_INVALIDA;
}

function avancarDiasUteisFallbackO1(dataBase: Date, passosUteis: number, emUTC: boolean): Date {
  const cursor = new Date(dataBase.getTime());
  if (passosUteis <= 0) return cursor;
  const semanas = Math.trunc(passosUteis / 5);
  let restantes = passosUteis - semanas * 5;
  if (semanas > 0) {
    if (emUTC) cursor.setUTCDate(cursor.getUTCDate() + semanas * 7);
    else cursor.setDate(cursor.getDate() + semanas * 7);
  }
  while (restantes > 0 && Number.isFinite(cursor.getTime())) {
    if (emUTC) cursor.setUTCDate(cursor.getUTCDate() + 1);
    else cursor.setDate(cursor.getDate() + 1);
    const dia = emUTC ? cursor.getUTCDay() : cursor.getDay();
    if (dia !== 0 && dia !== 6) restantes--;
  }
  return Number.isFinite(cursor.getTime()) ? cursor : new Date(NaN);
}

/** Formata número de dias úteis com singular/plural correto */
export function formatarDiasUteis(dias?: number): string {
  if (!dias && dias !== 0) return "—";
  return `${dias} ${dias === 1 ? "dia útil" : "dias úteis"}`;
}

/**
 * Formata data civil ISO ou timestamp (AAAA-MM-DD, AAAA-MM-DDTHH:mm:ss ou AAAA-MM-DD HH:mm:ss)
 * para o padrão brasileiro (DD/MM/AAAA), rejeitando rollover de calendário e sentinelas inválidas.
 */
export function formatarDataBR(dataIso?: string | null): string {
  const iso = extrairDataCalendarioISO(dataIso);
  if (!iso) return "—";
  const match = REGEX_DATA_CANONICA.exec(iso);
  return match ? `${match[3]}/${match[2]}/${match[1]}` : "—";
}

/** Formata objeto Date para string YYYY-MM-DD (UTC para instâncias ancoradas; calendário local para Date nativa) */
export function formatarDataISO(data: Date): string {
  if (!(data instanceof Date) || !Number.isFinite(data.getTime())) {
    return SENTINELA_DATA_INVALIDA;
  }
  const marcadoUTC = DATAS_CIVIS_UTC.has(data);
  const anoNumerico = marcadoUTC ? data.getUTCFullYear() : data.getFullYear();
  const ano = anoNumerico >= 0 && anoNumerico <= 9999
    ? String(anoNumerico).padStart(4, "0")
    : (anoNumerico < 0 ? "-" : "+") + String(Math.abs(anoNumerico)).padStart(6, "0");
  const mes = String((marcadoUTC ? data.getUTCMonth() : data.getMonth()) + 1).padStart(2, "0");
  const dia = String(marcadoUTC ? data.getUTCDate() : data.getDate()).padStart(2, "0");
  return `${ano}-${mes}-${dia}`;
}

/** Retorna a própria data se for dia útil, senão avança para a próxima segunda-feira sem laço nem alteração de fuso. */
export function proximoDiaUtil(data: Date): Date {
  const marcadoUTC = data instanceof Date && DATAS_CIVIS_UTC.has(data);
  if (!(data instanceof Date) || !Number.isFinite(data.getTime())) {
    const invalida = new Date(NaN);
    return marcadoUTC ? marcarDataCivilUTC(invalida) : invalida;
  }
  if (marcadoUTC) {
    const iso = formatarDataISO(data);
    if (dataCivilValida(iso)) {
      return normalizarDataMeioDiaUTC(proximoDiaUtilCivil(iso));
    }
    const resultado = new Date(data.getTime());
    const diaSemana = resultado.getUTCDay();
    const avanco = diaSemana === 6 ? 2 : diaSemana === 0 ? 1 : 0;
    if (avanco !== 0) resultado.setUTCDate(resultado.getUTCDate() + avanco);
    return marcarDataCivilUTC(resultado);
  }
  const resultado = new Date(data.getTime());
  const diaSemana = resultado.getDay();
  const avanco = diaSemana === 6 ? 2 : diaSemana === 0 ? 1 : 0;
  if (avanco !== 0) resultado.setDate(resultado.getDate() + avanco);
  return resultado;
}

/**
 * Retorna o último dia útil trabalhado de uma alocação em O(1),
 * começando em dataInicio e durando duracaoDias úteis, sem lançar exceção em fronteiras extremas.
 */
export function calcularUltimoDiaUtil(dataInicio: Date, duracaoDias: number): Date {
  const marcadoUTC = dataInicio instanceof Date && DATAS_CIVIS_UTC.has(dataInicio);
  if (!(dataInicio instanceof Date) || !Number.isFinite(dataInicio.getTime())) {
    const invalida = new Date(NaN);
    return marcadoUTC ? marcarDataCivilUTC(invalida) : invalida;
  }
  const totalDias = typeof duracaoDias === "number" && Number.isFinite(duracaoDias)
    ? Math.max(1, Math.ceil(duracaoDias))
    : 1;
  const inicioUtil = proximoDiaUtil(dataInicio);
  if (!Number.isFinite(inicioUtil.getTime())) {
    return inicioUtil;
  }
  const inicioISO = formatarDataISO(inicioUtil);
  if (dataCivilValida(inicioISO)) {
    try {
      const fimISO = dataFimDiasUteisCivil(inicioISO, totalDias);
      if (marcadoUTC) {
        return normalizarDataMeioDiaUTC(fimISO);
      }
      const [ano, mes, dia] = fimISO.split("-").map(Number);
      const resultado = new Date(inicioUtil.getTime());
      resultado.setFullYear(ano, mes - 1, dia);
      return resultado;
    } catch {
      // Recuo O(1) para estouros acima de 9999-12-31 sem quebrar chamadores em renderização.
    }
  }
  const fallback = avancarDiasUteisFallbackO1(inicioUtil, totalDias - 1, marcadoUTC);
  return marcadoUTC ? marcarDataCivilUTC(fallback) : fallback;
}

/** Soma N dias civis de calendário em UTC puro (com truncamento simétrico) e retorna string ISO. */
export function adicionarDiasCivis(dataInput: string | Date, dias: number): string {
  return deslocarDataCalendarioT00(dataInput, dias);
}

/** Normaliza a data final inclusiva (string ISO ou Date): sábado/domingo recuam para a sexta-feira imediatamente anterior. */
export function normalizarDataFimInclusiva(dataFim: string | Date): string {
  const iso = resolverPrefixoCalendario(dataFim);
  if (!iso) return SENTINELA_DATA_INVALIDA;
  if (ehDataCivilISO(iso)) return anteriorDiaUtilCivil(iso);
  const dt = new Date(`${iso}T00:00:00.000Z`);
  if (!Number.isFinite(dt.getTime())) return SENTINELA_DATA_INVALIDA;
  const diaSemana = dt.getUTCDay();
  const recuo = diaSemana === 6 ? -1 : diaSemana === 0 ? -2 : 0;
  if (recuo !== 0) dt.setUTCDate(dt.getUTCDate() + recuo);
  return Number.isFinite(dt.getTime()) ? dt.toISOString().split("T")[0] : SENTINELA_DATA_INVALIDA;
}

/** Retorna a data base (padrão: hoje local) ajustada para o próximo dia útil em formato YYYY-MM-DD */
export function obterProximoDiaUtilISO(dataBase: Date = new Date()): string {
  return formatarDataISO(proximoDiaUtil(dataBase));
}

/**
 * Sanitiza uma entrada de data (string civil/timestamp sem rollover ou Date) para
 * um objeto Date ancorado em UTC ao meio-dia, rastreado contra distorções de fuso horário.
 */
export function normalizarDataMeioDiaUTC(dataEntrada: string | Date): Date {
  const iso = resolverPrefixoCalendario(dataEntrada);
  if (!iso) return marcarDataCivilUTC(new Date(NaN));
  return marcarDataCivilUTC(new Date(`${iso}T12:00:00.000Z`));
}

/** Boundary Adapter de entrada: fim inclusivo civil → ponteiro exclusivo do DHTMLX (+1 dia civil em UTC). */
export function dataFimInclusivaParaDhtmlx(dataIso: string): string {
  return deslocarDataCalendarioT00(dataIso, 1);
}

/** Boundary Adapter de saída: ponteiro de término do DHTMLX → fim inclusivo civil (−1 dia civil em UTC). */
export function dhtmlxFimParaDataInclusiva(dateInput: string | Date): string {
  return deslocarDataCalendarioT00(dateInput, -1);
}

/** Contagem inclusiva de dias úteis em [ini, fim] dentro de 0001..9999 em O(1): 0 se inválido ou fimUtil < iniUtil. */
export function calcularDiasUteisInclusivos(ini: string | Date, fim: string | Date): number {
  const iniIso = resolverPrefixoCalendario(ini);
  const fimIso = resolverPrefixoCalendario(fim);
  if (!dataCivilValida(iniIso) || !dataCivilValida(fimIso)) return 0;
  const inicioUtil = proximoDiaUtilCivil(iniIso);
  const fimUtil = anteriorDiaUtilCivil(fimIso);
  if (fimUtil < inicioUtil) return 0;
  return diasUteisCivis(inicioUtil, fimUtil);
}

/**
 * Formata um valor numérico para o padrão de moeda brasileiro (BRL).
 * Sanitizado contra valores nulos, indefinidos, NaN ou infinitos.
 */
export function formatarMoeda(
  valor?: number | null,
  opcoes?: { semCentavos?: boolean }
): string {
  const valorSeguro = typeof valor === "number" && Number.isFinite(valor) ? valor : 0;
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: opcoes?.semCentavos ? 0 : 2,
    minimumFractionDigits: opcoes?.semCentavos ? 0 : 2,
  }).format(valorSeguro);
}
