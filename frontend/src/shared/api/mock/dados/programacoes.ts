import { obterEquipesArmazenadas } from "./equipes";
import { armazenamentoCenario } from "../core/estadoCenario";
import { lerDadosCenario } from "../core/estadoCenario";
import type { Programacao, CriarProgramacaoPayload } from "@/types";
import { proximoDiaUtil, normalizarDataMeioDiaUTC, formatarDataISO, normalizarDataFimInclusiva, calcularDiasUteisInclusivos, calcularUltimoDiaUtil, adicionarDiasCivis } from "@/shared/lib/formatters";
import { obterObrasArmazenadas } from "./obras";

export const STORAGE_KEY_PROG = "mock_programacoes_v4";

export function obterProgramacoesArmazenadas(): Programacao[] { return lerDadosCenario<Programacao[]>("mock_programacoes_v4"); }

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
    armazenamentoCenario.setItem(STORAGE_KEY_PROG, JSON.stringify(atualizadas));
  }

  const principalFinal = mapaEquipe.get(id) || progAtualizada;
  return { principal: principalFinal, afetadas };
}

/** Cria uma nova programação no mock com cálculo de dias úteis e persistência */
export function criarProgramacaoArmazenada(payload: CriarProgramacaoPayload): Programacao {
  const progs = obterProgramacoesArmazenadas();
  const obras = obterObrasArmazenadas();
  const obra = obras.find((o) => Number(o.id) === Number(payload.obraId));
  if (!obra) throw new Error("Obra não encontrada.");
  if (!obterEquipesArmazenadas().some(e => e.id === Number(payload.equipeId))) throw new Error("Equipe não encontrada.");

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
    const paineis = obra.quantidadePaineis;
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
    armazenamentoCenario.setItem(STORAGE_KEY_PROG, JSON.stringify(progs));
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
    armazenamentoCenario.setItem(STORAGE_KEY_PROG, JSON.stringify(progs));
  }
  return true;
}
