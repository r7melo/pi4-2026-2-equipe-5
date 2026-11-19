import { anteriorDiaUtilCivil, dataCivilValida, proximoDiaUtilCivil } from "@/shared/lib/datasCivis";
import { formatarDataISO } from "@/shared/lib/formatters";

function extrairDataCivil(entrada: string | Date): string | null {
  if (entrada instanceof Date) {
    if (!Number.isFinite(entrada.getTime())) return null;
    const iso = formatarDataISO(entrada);
    return dataCivilValida(iso) ? iso : null;
  }
  if (typeof entrada !== "string") return null;
  const limpa = entrada.trim().split(/[T ]/)[0];
  return dataCivilValida(limpa) ? limpa : null;
}

/**
 * Converte data de início e data de término (sempre inclusivo — último dia útil trabalhado)
 * para o intervalo efetivo de dias úteis trabalhados [inicioUtil, fimUtilInclusivo].
 */
export function normalizarIntervaloDiasUteis(
  dataInicio: string | Date,
  dataFim: string | Date
): { inicio: string; fim: string } | null {
  const iniCivil = extrairDataCivil(dataInicio);
  const fimCivil = extrairDataCivil(dataFim);
  if (!iniCivil || !fimCivil) return null;

  const iniISO = proximoDiaUtilCivil(iniCivil);
  const fimISO = anteriorDiaUtilCivil(fimCivil);

  if (fimISO < iniISO) {
    return { inicio: iniISO, fim: iniISO };
  }

  return { inicio: iniISO, fim: fimISO };
}

/**
 * Determina se dois intervalos de trabalho colidem em dias úteis.
 * Dois períodos [I_A, U_A] e [I_B, U_B] colidem se, e somente se:
 * max(I_A, I_B) <= min(U_A, U_B)
 */
export function verificarSobreposicaoPeriodos(
  iniA: string | Date,
  fimA: string | Date,
  iniB: string | Date,
  fimB: string | Date
): boolean {
  const intervaloA = normalizarIntervaloDiasUteis(iniA, fimA);
  const intervaloB = normalizarIntervaloDiasUteis(iniB, fimB);

  if (!intervaloA || !intervaloB) return false;

  const maxInicio = intervaloA.inicio > intervaloB.inicio ? intervaloA.inicio : intervaloB.inicio;
  const minFim = intervaloA.fim < intervaloB.fim ? intervaloA.fim : intervaloB.fim;

  return maxInicio <= minFim;
}
