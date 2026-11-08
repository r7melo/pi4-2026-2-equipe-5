import type { Programacao, ProgramacaoAfetada } from "@/shared/types/programacoes";
import {
  dataCivilValida,
  periodoCivilValido,
  diasUteisCivis,
  deslocamentoDiasUteisCivil,
  deslocarDiasUteisCivil,
  dataFimDiasUteisCivil,
} from "./datasCivis";

export interface ProjecaoReordenacao {
  principal: Programacao;
  alteradas: Programacao[];
  afetadas: ProgramacaoAfetada[];
  conflito: boolean;
}

/**
 * Projeta o reagendamento de uma alocação no cronograma e a propagação em cascata (RF-09).
 * Função pura e neutra, sem efeitos colaterais nem persistência.
 */
export function projetarReordenacao(
  programacoes: readonly Programacao[],
  id: number,
  novaDataInicio: string,
): ProjecaoReordenacao | null {
  if (typeof id !== "number" || !Number.isInteger(id)) {
    return null;
  }

  if (!dataCivilValida(novaDataInicio) || diasUteisCivis(novaDataInicio, novaDataInicio) !== 1) {
    throw new RangeError(
      `Nova data inicial deve ser uma data civil válida em dia útil (segunda a sexta): ${String(novaDataInicio)}`,
    );
  }

  let alvo: Programacao | null = null;
  const idsVistos = new Set<number>();

  for (const p of programacoes) {
    if (idsVistos.has(p.id)) {
      throw new RangeError(`ID duplicado na lista de programações: ${p.id}`);
    }
    idsVistos.add(p.id);
    if (p.id === id) {
      alvo = p;
    }
  }

  if (!alvo) {
    return null;
  }

  for (const p of programacoes) {
    if (p.equipeId === alvo.equipeId) {
      if (!periodoCivilValido(p.dataInicio, p.dataFim) || diasUteisCivis(p.dataInicio, p.dataFim) < 1) {
        throw new RangeError(
          `Programação ${p.id} possui período inválido ou sem dias úteis: ${p.dataInicio} a ${p.dataFim}`,
        );
      }
    }
  }

  if (alvo.dataInicio === novaDataInicio) {
    const principal: Programacao = { ...alvo };
    return {
      principal,
      alteradas: [principal],
      afetadas: [],
      conflito: false,
    };
  }

  const delta = deslocamentoDiasUteisCivil(alvo.dataInicio, novaDataInicio);
  if (delta === 0) {
    const principal: Programacao = { ...alvo };
    return {
      principal,
      alteradas: [principal],
      afetadas: [],
      conflito: false,
    };
  }

  const diasUteisAlvo = diasUteisCivis(alvo.dataInicio, alvo.dataFim);
  const novoFimAlvo = dataFimDiasUteisCivil(novaDataInicio, diasUteisAlvo);
  const principal: Programacao = {
    ...alvo,
    dataInicio: novaDataInicio,
    dataFim: novoFimAlvo,
  };

  const seguintes = programacoes
    .filter((p) => p.equipeId === alvo.equipeId && p.id !== alvo.id && p.dataInicio >= alvo.dataInicio)
    .slice()
    .sort(
      (a, b) =>
        a.dataInicio.localeCompare(b.dataInicio) ||
        (a.prioridade ?? 1) - (b.prioridade ?? 1) ||
        a.id - b.id,
    );

  const outrasAlteradas: Programacao[] = seguintes.map((p) => {
    const diasUteis = diasUteisCivis(p.dataInicio, p.dataFim);
    const novoInicio = deslocarDiasUteisCivil(p.dataInicio, delta);
    const novoFim = dataFimDiasUteisCivil(novoInicio, diasUteis);
    return Object.assign({}, p, {
      dataInicio: novoInicio,
      dataFim: novoFim,
    });
  });

  const alteradas: Programacao[] = [principal, ...outrasAlteradas];

  const afetadas: ProgramacaoAfetada[] = outrasAlteradas.map((p) => ({
    id: p.id,
    novaDataInicio: p.dataInicio,
    novaDataFim: p.dataFim,
  }));

  const idsMovidas = new Set<number>(alteradas.map((p) => p.id));
  const fixasMesmaEquipe = programacoes.filter(
    (p) => p.equipeId === alvo.equipeId && !idsMovidas.has(p.id),
  );

  let conflito = false;
  for (const movida of alteradas) {
    for (const fixa of fixasMesmaEquipe) {
      if (movida.dataInicio <= fixa.dataFim && movida.dataFim >= fixa.dataInicio) {
        conflito = true;
        break;
      }
    }
    if (conflito) {
      break;
    }
  }

  return {
    principal,
    alteradas,
    afetadas,
    conflito,
  };
}
