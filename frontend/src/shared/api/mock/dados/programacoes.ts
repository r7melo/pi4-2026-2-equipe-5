import { obterEquipesArmazenadas } from "./equipes";
import { armazenamentoCenario, lerDadosCenario, salvarDadosCenario } from "../core/estadoCenario";
import type { Programacao, ProgramacaoAfetada, CriarProgramacaoPayload } from "@/shared/types/programacoes";
import { projetarReordenacao } from "@/shared/lib/reordenarProgramacoes";
import { proximoDiaUtil, normalizarDataMeioDiaUTC, formatarDataISO, normalizarDataFimInclusiva, calcularDiasUteisInclusivos, calcularUltimoDiaUtil } from "@/shared/lib/formatters";
import { obterObrasArmazenadas } from "./obras";

export const STORAGE_KEY_PROG = "mock_programacoes_v4";

export function obterProgramacoesArmazenadas(): Programacao[] { return lerDadosCenario<Programacao[]>("mock_programacoes_v4"); }

export class ConflitoReordenacaoMock extends Error {
  constructor(message = "Conflito de agenda da equipe no período solicitado.") {
    super(message);
    this.name = "ConflitoReordenacaoMock";
  }
}

export interface ResultadoReordenacaoMock {
  principal: Programacao;
  afetadas: ProgramacaoAfetada[];
}

export function atualizarProgramacaoDataArmazenada(
  id: number,
  novaDataInicio: string,
): ResultadoReordenacaoMock | null {
  const progs = obterProgramacoesArmazenadas();
  const projecao = projetarReordenacao(progs, id, novaDataInicio);
  if (!projecao) return null;

  if (projecao.conflito) {
    throw new ConflitoReordenacaoMock();
  }

  const mapaAlteradas = new Map(projecao.alteradas.map((p) => [p.id, p]));
  const atualizadas = progs.map((p) => mapaAlteradas.get(p.id) ?? p);

  salvarDadosCenario(STORAGE_KEY_PROG, atualizadas);

  return {
    principal: projecao.principal,
    afetadas: projecao.afetadas,
  };
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
