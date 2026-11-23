import { cadeiaTemporal } from "./equipeTemporal";
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
    if (alvo.equipe || p.equipeId === alvo.equipeId) {
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
    ...(alvo.equipe ? { equipe: deslocarEquipe(alvo, novaDataInicio, novoFimAlvo, delta) } : {}),
  };

  const seguintes = (alvo.equipe ? cadeiaTemporal(programacoes, alvo.id).slice(1) : programacoes
    .filter((p) => p.equipeId === alvo.equipeId && p.id !== alvo.id && p.dataInicio >= alvo.dataInicio))
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
      ...(p.equipe ? { equipe: deslocarEquipe(p, novoInicio, novoFim, delta) } : {}),
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
    (p) => !idsMovidas.has(p.id) && (alvo.equipe || p.equipeId === alvo.equipeId),
  );

  let conflito = false;
  for (const movida of alteradas) {
    // Normalizar parciais em fins de semana pode aproximar duas movidas entre si.
    for (const fixa of [...fixasMesmaEquipe, ...alteradas]) {
      if (movida.id === fixa.id) continue;
      const sobrepoe = movida.equipe && fixa.equipe
        ? movida.equipe.integrantes.some(a => fixa.equipe!.integrantes.some(b => a.usuarioId === b.usuarioId && a.dataEntrada <= b.dataSaida && a.dataSaida >= b.dataEntrada))
        : movida.dataInicio <= fixa.dataFim && movida.dataFim >= fixa.dataInicio;
      if (sobrepoe) {
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

function deslocarEquipe(p: Programacao, inicio: string, fim: string, delta: number) {
  const limitar = (data: string) => data < inicio ? inicio : data > fim ? fim : data;
  const equipe = {
    ...p.equipe!, integrantes: p.equipe!.integrantes.map(i => {
      const integral = i.dataEntrada === p.dataInicio && i.dataSaida === p.dataFim;
      const dataEntrada = integral ? inicio : limitar(deslocarDiasUteisCivil(i.dataEntrada, delta));
      const dataSaida = integral ? fim : limitar(deslocarDiasUteisCivil(i.dataSaida, delta));
      return Object.assign({}, i, { dataEntrada, dataSaida: dataSaida < dataEntrada ? dataEntrada : dataSaida });
    }),
  };
  equipe.pessoaDia = equipe.integrantes.reduce((soma, integrante) => soma + diasUteisCivis(integrante.dataEntrada, integrante.dataSaida), 0);
  return equipe;
}
