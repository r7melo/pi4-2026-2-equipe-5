import type { Programacao, Equipe } from "@/types";
import {
  normalizarDataMeioDiaUTC,
  proximoDiaUtil,
  normalizarDataFimInclusiva,
  formatarDataBR,
  formatarDataISO,
} from "@/shared/lib/formatters";

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

export interface ConflitoEquipeDetalhe {
  programacao: Programacao;
  periodoFormatado: string;
}

/**
 * Retorna as alocações da equipe que entram em colisão temporal com o intervalo informado.
 */
export function obterConflitosEquipe(
  equipeId: number,
  dataInicio: string,
  dataFim: string,
  programacoes: Programacao[],
  ignorarProgramacaoId?: number
): ConflitoEquipeDetalhe[] {
  if (!equipeId || !dataInicio || !dataFim || !programacoes) return [];

  const progsEquipe = programacoes.filter(
    (p) =>
      Number(p.equipeId) === Number(equipeId) &&
      (ignorarProgramacaoId === undefined || Number(p.id) !== Number(ignorarProgramacaoId))
  );

  const conflitos: ConflitoEquipeDetalhe[] = [];

  for (const prog of progsEquipe) {
    const colide = verificarSobreposicaoPeriodos(
      dataInicio,
      dataFim,
      prog.dataInicio,
      prog.dataFim
    );

    if (colide) {
      const fimExibicao = normalizarDataFimInclusiva(prog.dataFim);
      conflitos.push({
        programacao: prog,
        periodoFormatado: `${formatarDataBR(prog.dataInicio)} a ${formatarDataBR(fimExibicao)}`,
      });
    }
  }

  return conflitos;
}

export interface EquipeDisponibilidadeStatus {
  equipe: Equipe;
  estaOcupada: boolean;
  conflitos: ConflitoEquipeDetalhe[];
}

/**
 * Mapeia o status de disponibilidade de todas as equipes para o intervalo solicitado.
 */
export function mapearDisponibilidadeEquipes(
  equipes: Equipe[],
  programacoes: Programacao[],
  dataInicio: string,
  dataFim: string
): EquipeDisponibilidadeStatus[] {
  return equipes.map((eq) => {
    const conflitos = obterConflitosEquipe(
      eq.id,
      dataInicio,
      dataFim,
      programacoes,
      undefined
    );
    return {
      equipe: eq,
      estaOcupada: conflitos.length > 0,
      conflitos,
    };
  });
}

