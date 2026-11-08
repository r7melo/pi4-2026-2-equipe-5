import { verificarSobreposicaoPeriodos } from "@/shared/lib/intervalosDiasUteis";
export { normalizarIntervaloDiasUteis, verificarSobreposicaoPeriodos } from "@/shared/lib/intervalosDiasUteis";
import type { Programacao, Equipe } from "@/types";
import {
  normalizarDataFimInclusiva,
  formatarDataBR,
} from "@/shared/lib/formatters";

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
