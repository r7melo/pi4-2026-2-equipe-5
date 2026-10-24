import { proximoDiaUtil, normalizarDataMeioDiaUTC, formatarDataISO, normalizarDataFimInclusiva } from "@/shared/lib/formatters";

/**
 * Converte data de início e data de término (sempre inclusivo — último dia útil trabalhado)
 * para o intervalo efetivo de dias úteis trabalhados [inicioUtil, fimUtilInclusivo].
 */
export function normalizarIntervaloDiasUteis(
  dataInicio: string | Date,
  dataFim: string | Date
): { inicio: string; fim: string } | null {
  if (!dataInicio || !dataFim) return null;

  const iniSanitizado = proximoDiaUtil(normalizarDataMeioDiaUTC(dataInicio));
  const iniISO = formatarDataISO(iniSanitizado);
  const fimISO = normalizarDataFimInclusiva(dataFim);

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
