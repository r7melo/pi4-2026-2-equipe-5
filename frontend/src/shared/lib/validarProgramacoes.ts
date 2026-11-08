import { periodoCivilValido, diasUteisCivis } from "./datasCivis";
import type {
  Programacao,
  ProgramacaoAfetada,
  ReordenarProgramacaoResposta,
} from "@/shared/types/programacoes";

function isObjeto(valor: unknown): valor is Record<string, unknown> {
  return typeof valor === "object" && valor !== null && !Array.isArray(valor);
}

function isProgramacao(item: unknown): item is Programacao {
  if (!isObjeto(item)) return false;

  const { id, obraId, equipeId, dataInicio, dataFim, prioridade, duracaoEstimadaDias } = item;

  if (typeof id !== "number" || !Number.isInteger(id) || id <= 0) return false;
  if (typeof obraId !== "number" || !Number.isInteger(obraId) || obraId <= 0) return false;
  if (typeof equipeId !== "number" || !Number.isInteger(equipeId) || equipeId <= 0) return false;

  if (typeof dataInicio !== "string" || typeof dataFim !== "string") return false;
  if (!periodoCivilValido(dataInicio, dataFim) || diasUteisCivis(dataInicio, dataFim) < 1) {
    return false;
  }

  if (typeof prioridade !== "number" || !Number.isFinite(prioridade)) return false;

  if (
    duracaoEstimadaDias !== undefined &&
    duracaoEstimadaDias !== null &&
    (typeof duracaoEstimadaDias !== "number" || !Number.isFinite(duracaoEstimadaDias))
  ) {
    return false;
  }

  return true;
}

function isProgramacaoAfetada(item: unknown): item is ProgramacaoAfetada {
  if (!isObjeto(item)) return false;

  const { id, novaDataInicio, novaDataFim } = item;

  if (typeof id !== "number" || !Number.isInteger(id) || id <= 0) return false;
  if (typeof novaDataInicio !== "string" || typeof novaDataFim !== "string") return false;
  if (!periodoCivilValido(novaDataInicio, novaDataFim) || diasUteisCivis(novaDataInicio, novaDataFim) < 1) {
    return false;
  }

  return true;
}

function isRespostaReordenacao(valor: unknown): valor is ReordenarProgramacaoResposta {
  if (!isObjeto(valor)) return false;

  const { id, novaDataInicio, novaDataFim, programacoesAfetadas } = valor;

  if (typeof id !== "number" || !Number.isInteger(id) || id <= 0) return false;
  if (typeof novaDataInicio !== "string" || typeof novaDataFim !== "string") return false;
  if (!periodoCivilValido(novaDataInicio, novaDataFim) || diasUteisCivis(novaDataInicio, novaDataFim) < 1) {
    return false;
  }

  if (!Array.isArray(programacoesAfetadas)) return false;
  for (let i = 0; i < programacoesAfetadas.length; i++) {
    if (!isProgramacaoAfetada(programacoesAfetadas[i])) return false;
  }

  return true;
}

export function validarProgramacoes(valor: unknown): Programacao[] {
  if (!Array.isArray(valor)) {
    throw new Error("Resposta inválida do servidor: esperava-se uma lista de programações.");
  }

  const resultado: Programacao[] = [];
  const ids = new Set<number>();
  for (let i = 0; i < valor.length; i++) {
    const item: unknown = valor[i];
    if (!isProgramacao(item)) {
      throw new Error(`Dados de programação recebidos do servidor são inválidos no item ${i + 1}.`);
    }
    if (ids.has(item.id)) {
      throw new Error(`Identificador de programação duplicado recebido do servidor: ${item.id}.`);
    }
    ids.add(item.id);
    resultado.push(item);
  }

  return resultado;
}

export function validarRespostaReordenacao(valor: unknown): ReordenarProgramacaoResposta {
  if (!isObjeto(valor)) {
    throw new Error("Resposta inválida do servidor para reagendamento.");
  }

  const { id, novaDataInicio, novaDataFim, programacoesAfetadas } = valor;

  if (typeof id !== "number" || !Number.isInteger(id) || id <= 0) {
    throw new Error("Identificador inválido na resposta de reagendamento.");
  }

  if (
    typeof novaDataInicio !== "string" ||
    typeof novaDataFim !== "string" ||
    !periodoCivilValido(novaDataInicio, novaDataFim) ||
    diasUteisCivis(novaDataInicio, novaDataFim) < 1
  ) {
    throw new Error("Datas inválidas na resposta de reagendamento.");
  }

  if (!Array.isArray(programacoesAfetadas)) {
    throw new Error("Lista de programações afetadas ausente ou inválida.");
  }

  for (let i = 0; i < programacoesAfetadas.length; i++) {
    if (!isProgramacaoAfetada(programacoesAfetadas[i])) {
      throw new Error(`Dados inválidos na programação afetada ${i + 1} retornada pelo servidor.`);
    }
  }

  if (isRespostaReordenacao(valor)) {
    return valor;
  }

  throw new Error("Resposta de reagendamento não cumpre o contrato esperado.");
}
