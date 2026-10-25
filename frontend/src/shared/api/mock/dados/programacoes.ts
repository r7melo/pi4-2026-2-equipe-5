import type { Programacao, CriarProgramacaoPayload } from "@/types";
import { proximoDiaUtil, normalizarDataMeioDiaUTC, formatarDataISO, normalizarDataFimInclusiva, calcularDiasUteisInclusivos, calcularUltimoDiaUtil, adicionarDiasCivis } from "@/shared/lib/formatters";
import { obterObrasArmazenadas } from "./obras";

/** 10 Programações sincronizadas estritamente com database/02_seed.sql e QA (com términos normalizados para sexta-feira) */
export const MOCK_PROGRAMACOES_FIXTURE: Programacao[] = [
  { id: 601, obraId: 301, equipeId: 1, dataInicio: "2026-10-01", dataFim: "2026-10-02", prioridade: 1, duracaoEstimadaDias: 2 },
  { id: 602, obraId: 302, equipeId: 1, dataInicio: "2026-10-06", dataFim: "2026-10-09", prioridade: 2, duracaoEstimadaDias: 4 },
  { id: 603, obraId: 303, equipeId: 2, dataInicio: "2026-10-02", dataFim: "2026-10-06", prioridade: 1, duracaoEstimadaDias: 2 },
  { id: 604, obraId: 305, equipeId: 2, dataInicio: "2026-10-07", dataFim: "2026-10-09", prioridade: 2, duracaoEstimadaDias: 3 },
  { id: 605, obraId: 304, equipeId: 3, dataInicio: "2026-10-01", dataFim: "2026-10-07", prioridade: 1, duracaoEstimadaDias: 4 },
  { id: 606, obraId: 306, equipeId: 3, dataInicio: "2026-10-08", dataFim: "2026-10-09", prioridade: 2, duracaoEstimadaDias: 2 },
  { id: 607, obraId: 309, equipeId: 1, dataInicio: "2026-10-13", dataFim: "2026-10-16", prioridade: 3, duracaoEstimadaDias: 4.5 },
  { id: 608, obraId: 310, equipeId: 2, dataInicio: "2026-10-20", dataFim: "2026-11-06", prioridade: 3, duracaoEstimadaDias: 14.0 },
  { id: 609, obraId: 308, equipeId: 7, dataInicio: "2026-10-09", dataFim: "2026-10-09", prioridade: 1, duracaoEstimadaDias: 1.0 },
  { id: 610, obraId: 302, equipeId: 4, dataInicio: "2026-10-14", dataFim: "2026-10-16", prioridade: 3, duracaoEstimadaDias: 3.5 },
];

export const STORAGE_KEY_PROG = "mock_programacoes_v4";

export function obterProgramacoesArmazenadas(): Programacao[] {
  if (typeof window === "undefined") return MOCK_PROGRAMACOES_FIXTURE;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY_PROG);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {
    // Silencia erro de leitura no storage
  }
  sessionStorage.setItem(STORAGE_KEY_PROG, JSON.stringify(MOCK_PROGRAMACOES_FIXTURE));
  return MOCK_PROGRAMACOES_FIXTURE;
}

export interface ResultadoReordenacaoMock {
  principal: Programacao;
  afetadas: { id: number; novaDataInicio: string; novaDataFim: string }[];
}

export function atualizarProgramacaoDataArmazenada(
  id: number,
  novaDataInicio?: string,
  novaDataFim?: string
): ResultadoReordenacaoMock | null {
  const progs = obterProgramacoesArmazenadas();
  const progOriginal = progs.find((p) => Number(p.id) === id);
  if (!progOriginal) return null;

  let novaDataInicioStr = progOriginal.dataInicio;
  let novaDataFimStr = progOriginal.dataFim;
  let duracao = progOriginal.duracaoEstimadaDias || 1;

  if (novaDataInicio && novaDataFim) {
    const ini = proximoDiaUtil(normalizarDataMeioDiaUTC(novaDataInicio));
    const iniISO = formatarDataISO(ini);
    let fim = normalizarDataFimInclusiva(novaDataFim);
    if (fim < iniISO) fim = iniISO;
    duracao = Math.max(1, calcularDiasUteisInclusivos(ini, fim));
    novaDataInicioStr = iniISO;
    novaDataFimStr = fim;
  } else if (novaDataInicio) {
    const ini = proximoDiaUtil(normalizarDataMeioDiaUTC(novaDataInicio));
    const duracaoOriginal = Math.max(
      1,
      calcularDiasUteisInclusivos(
        progOriginal.dataInicio,
        normalizarDataFimInclusiva(progOriginal.dataFim)
      )
    );
    duracao = duracaoOriginal;
    novaDataInicioStr = formatarDataISO(ini);
    novaDataFimStr = formatarDataISO(calcularUltimoDiaUtil(ini, duracaoOriginal));
  } else if (novaDataFim) {
    const inicioOriginal = proximoDiaUtil(normalizarDataMeioDiaUTC(progOriginal.dataInicio));
    const inicioOriginalISO = formatarDataISO(inicioOriginal);
    let fim = normalizarDataFimInclusiva(novaDataFim);
    if (fim < inicioOriginalISO) fim = inicioOriginalISO;
    duracao = Math.max(1, calcularDiasUteisInclusivos(inicioOriginal, fim));
    novaDataInicioStr = inicioOriginalISO;
    novaDataFimStr = fim;
  }

  const progAtualizada: Programacao = {
    ...progOriginal,
    dataInicio: novaDataInicioStr,
    dataFim: novaDataFimStr,
    duracaoEstimadaDias: duracao,
  };

  // Coleta todas as tarefas da mesma equipe
  const equipeProgs = progs
    .filter((p) => p.equipeId === progOriginal.equipeId)
    .map((p) => (p.id === id ? progAtualizada : Object.assign({}, p)));

  // Ordena cronologicamente pela data de início; a tarefa recém-movida tem prioridade em empate
  equipeProgs.sort((a, b) => {
    if (a.dataInicio === b.dataInicio) {
      if (a.id === id) return -1;
      if (b.id === id) return 1;
      return a.prioridade - b.prioridade;
    }
    return a.dataInicio.localeCompare(b.dataInicio);
  });

  const afetadas: { id: number; novaDataInicio: string; novaDataFim: string }[] = [];
  let cursorFim = "";

  for (let i = 0; i < equipeProgs.length; i++) {
    const item = equipeProgs[i];
    item.prioridade = i + 1; // Sincroniza prioridade sequencial

    if (cursorFim && item.dataInicio <= cursorFim) {
      // Conflito/sobreposição: encadeia o início exatamente no próximo dia útil após o término inclusivo da anterior
      const dataInicioAjustada = proximoDiaUtil(
        normalizarDataMeioDiaUTC(adicionarDiasCivis(cursorFim, 1))
      );
      const durItem = Math.max(
        1,
        calcularDiasUteisInclusivos(item.dataInicio, normalizarDataFimInclusiva(item.dataFim))
      );
      const dataFimAjustada = calcularUltimoDiaUtil(dataInicioAjustada, durItem);

      const novoIniStr = formatarDataISO(dataInicioAjustada);
      const novoFimStr = formatarDataISO(dataFimAjustada);

      item.dataInicio = novoIniStr;
      item.dataFim = novoFimStr;
      item.duracaoEstimadaDias = durItem;

      if (item.id !== id) {
        afetadas.push({ id: item.id, novaDataInicio: novoIniStr, novaDataFim: novoFimStr });
      }
    }

    cursorFim = item.dataFim;
  }

  // Atualiza o array geral de programações
  const mapaEquipe = new Map(equipeProgs.map((p) => [p.id, p]));
  const atualizadas = progs.map((p) => mapaEquipe.get(p.id) || p);

  if (typeof window !== "undefined") {
    sessionStorage.setItem(STORAGE_KEY_PROG, JSON.stringify(atualizadas));
  }

  const principalFinal = mapaEquipe.get(id) || progAtualizada;
  return { principal: principalFinal, afetadas };
}

/** Cria uma nova programação no mock com cálculo de dias úteis e persistência */
export function criarProgramacaoArmazenada(payload: CriarProgramacaoPayload): Programacao {
  const progs = obterProgramacoesArmazenadas();
  const obras = obterObrasArmazenadas();
  const obra = obras.find((o) => Number(o.id) === Number(payload.obraId));

  const novoInicio = proximoDiaUtil(normalizarDataMeioDiaUTC(payload.dataInicio));
  const novoInicioISO = formatarDataISO(novoInicio);
  let duracaoDias: number;
  let novoFimISO: string;

  if (payload.dataFim) {
    let fim = normalizarDataFimInclusiva(payload.dataFim);
    if (fim < novoInicioISO) {
      fim = novoInicioISO;
    }
    duracaoDias = Math.max(1, calcularDiasUteisInclusivos(novoInicio, fim));
    novoFimISO = fim;
  } else {
    const paineis = obra?.quantidadePaineis || 9;
    duracaoDias = Math.max(1, Math.ceil(paineis / 9));
    novoFimISO = formatarDataISO(calcularUltimoDiaUtil(novoInicio, duracaoDias));
  }

  const novaProg: Programacao = {
    id: progs.length > 0 ? Math.max(...progs.map((p) => Number(p.id) || 0)) + 1 : 601,
    obraId: Number(payload.obraId),
    equipeId: Number(payload.equipeId),
    dataInicio: novoInicioISO,
    dataFim: novoFimISO,
    prioridade:
      payload.prioridade ||
      progs.filter((p) => p.equipeId === Number(payload.equipeId)).length + 1,
    duracaoEstimadaDias: duracaoDias,
  };

  progs.push(novaProg);
  if (typeof window !== "undefined") {
    sessionStorage.setItem(STORAGE_KEY_PROG, JSON.stringify(progs));
  }
  return novaProg;
}

/** Remove uma programação do mock com persistência */
export function deletarProgramacaoArmazenada(id: number): boolean {
  const progs = obterProgramacoesArmazenadas();
  const index = progs.findIndex((p) => Number(p.id) === Number(id));
  if (index === -1) return false;

  progs.splice(index, 1);
  if (typeof window !== "undefined") {
    sessionStorage.setItem(STORAGE_KEY_PROG, JSON.stringify(progs));
  }
  return true;
}

export function obterCronogramaCompartilhadoFixture(
  token: string,
  filtro?: { dataInicio?: string; dataFim?: string }
): Programacao[] {
  if (!token || token.trim() === "") return [];

  let progs = obterProgramacoesArmazenadas();

  if (filtro?.dataInicio) {
    progs = progs.filter(
      (p) => normalizarDataFimInclusiva(p.dataFim) >= filtro.dataInicio!
    );
  }
  if (filtro?.dataFim) {
    progs = progs.filter((p) => p.dataInicio <= filtro.dataFim!);
  }

  // Anonimização de segurança: garante ausência de campos confidenciais
  return progs.map((p) => ({
    id: p.id,
    obraId: p.obraId,
    equipeId: p.equipeId,
    dataInicio: p.dataInicio,
    dataFim: p.dataFim,
    prioridade: p.prioridade,
    duracaoEstimadaDias: p.duracaoEstimadaDias,
  }));
}
