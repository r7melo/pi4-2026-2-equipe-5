import type { Programacao, Equipe } from "@/types";
import { formatarDataBR } from "@/lib/formatters";

export interface ConflitoEquipe {
  programacao: Programacao;
  periodoFormatado: string;
}

export interface EquipeDisponibilidadeStatus {
  equipe: Equipe;
  estaOcupada: boolean;
  conflitos: ConflitoEquipe[];
}

export function verificarSobreposicaoPeriodos(
  inicioA: string | Date,
  fimA: string | Date,
  inicioB: string | Date,
  fimB: string | Date,
  inclusive = false,
  _ignorar?: boolean
): boolean {
  const iA = new Date(inicioA).getTime();
  const fA = new Date(fimA).getTime();
  const iB = new Date(inicioB).getTime();
  const fB = new Date(fimB).getTime();

  if (inclusive) {
    return iA <= fB && fA >= iB;
  }
  return iA < fB && fA > iB;
}

export function obterConflitosEquipe(
  equipeId: number,
  dataInicio: string | Date,
  dataFim: string | Date,
  programacoes: Programacao[] = [],
  ignorarProgramacaoId?: number,
  inclusive = false
): ConflitoEquipe[] {
  return programacoes
    .filter((p) => {
      if (p.equipeId !== equipeId) return false;
      if (ignorarProgramacaoId !== undefined && p.id === ignorarProgramacaoId) return false;
      return verificarSobreposicaoPeriodos(dataInicio, dataFim, p.dataInicio, p.dataFim, inclusive);
    })
    .map((p) => ({
      programacao: p,
      periodoFormatado: `${formatarDataBR(p.dataInicio)} a ${formatarDataBR(p.dataFim)}`,
    }));
}

export function mapearDisponibilidadeEquipes(
  equipes: Equipe[] = [],
  programacoes: Programacao[] = [],
  dataInicio: string | Date,
  dataFim: string | Date,
  inclusive = true
): EquipeDisponibilidadeStatus[] {
  return equipes.map((eq) => {
    const conflitos = obterConflitosEquipe(eq.id, dataInicio, dataFim, programacoes, undefined, inclusive);
    return {
      equipe: eq,
      estaOcupada: conflitos.length > 0,
      conflitos,
    };
  });
}
