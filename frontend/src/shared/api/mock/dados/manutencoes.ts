import { geracaoCenario } from "../core/estadoCenario";
import type {
  ComentarioManutencaoResposta,
  ManutencaoConcluidaResposta,
  ManutencaoInstalador,
} from "@/shared/types/instalador";

export interface ManutencaoMockRegistro extends ManutencaoInstalador {
  equipeId: number;
  servicoExecutado?: string | null;
}

const STORAGE_PREFIX_MANUT = "mock_instalador_manutencoes_";
const STORAGE_PREFIX_COMENT = "mock_instalador_manut_comentarios_";

const memoriaManutencoes = new Map<string, ManutencaoMockRegistro[]>();
const memoriaComentarios = new Map<string, ComentarioManutencaoResposta[]>();

const MANUTENCOES_INICIAIS: ManutencaoMockRegistro[] = [
  {
    id: 41,
    obraId: 307,
    equipeId: 1,
    clienteNome: "Padaria Bom Grão",
    endereco: "Rua XV de Novembro, 120 - Centro, Crateús/CE",
    descricao: "Inversor apresentando desligamento automático no fim da tarde.",
    status: "Pendente",
    dataConclusao: null,
  },
  {
    id: 42,
    obraId: 301,
    equipeId: 1,
    clienteNome: "Mercado Sol Nascente",
    endereco: "Av. Sargento Hermínio, 840 - Crateús/CE",
    descricao: "Verificação de string box CC e reaperto de conectores.",
    status: "Pendente",
    dataConclusao: null,
  },
  {
    id: 43,
    obraId: 303,
    equipeId: 1,
    clienteNome: "Fazenda Santa Luzia",
    endereco: "Rodovia CE-187, Km 12 - Zona Rural",
    descricao: "Substituição preventiva de disjuntor CC 1000V.",
    status: "Concluida",
    dataConclusao: "2026-11-18T15:30:00.000Z",
    servicoExecutado: "Disjuntor substituído e testes de tensão realizados.",
  },
  {
    id: 44,
    obraId: 309,
    equipeId: 2,
    clienteNome: "Clínica Vida Plena",
    endereco: "Rua Coronel Zezé, 45 - Centro",
    descricao: "Revisão de aterramento da estrutura metálica.",
    status: "Pendente",
    dataConclusao: null,
  },
];

function obterGeracaoSegura(): string {
  try {
    return geracaoCenario() || "padrao";
  } catch {
    return "padrao";
  }
}

function clonarManutencoes(lista: ManutencaoMockRegistro[]): ManutencaoMockRegistro[] {
  return structuredClone(lista);
}

function clonarComentarios(
  lista: ComentarioManutencaoResposta[]
): ComentarioManutencaoResposta[] {
  return structuredClone(lista);
}

function salvarManutencoesPorGeracao(geracao: string, lista: ManutencaoMockRegistro[]): void {
  const clone = clonarManutencoes(lista);
  memoriaManutencoes.set(geracao, clone);
  if (typeof sessionStorage !== "undefined") {
    try {
      sessionStorage.setItem(`${STORAGE_PREFIX_MANUT}${geracao}`, JSON.stringify(clone));
    } catch {
      // Ignora erro de cota em ambiente de testes
    }
  }
}

function salvarComentariosPorGeracao(
  geracao: string,
  lista: ComentarioManutencaoResposta[]
): void {
  const clone = clonarComentarios(lista);
  memoriaComentarios.set(geracao, clone);
  if (typeof sessionStorage !== "undefined") {
    try {
      sessionStorage.setItem(`${STORAGE_PREFIX_COMENT}${geracao}`, JSON.stringify(clone));
    } catch {
      // Ignora erro de cota em ambiente de testes
    }
  }
}

export function obterManutencoesArmazenadas(): ManutencaoMockRegistro[] {
  const geracao = obterGeracaoSegura();
  const emMemoria = memoriaManutencoes.get(geracao);
  if (emMemoria) return clonarManutencoes(emMemoria);

  if (typeof sessionStorage !== "undefined") {
    try {
      const bruto = sessionStorage.getItem(`${STORAGE_PREFIX_MANUT}${geracao}`);
      if (bruto) {
        const parsed = JSON.parse(bruto) as ManutencaoMockRegistro[];
        if (Array.isArray(parsed)) {
          memoriaManutencoes.set(geracao, clonarManutencoes(parsed));
          return clonarManutencoes(parsed);
        }
      }
    } catch {
      // Inicializa seed padrão
    }
  }

  const inicial = clonarManutencoes(MANUTENCOES_INICIAIS);
  salvarManutencoesPorGeracao(geracao, inicial);
  return clonarManutencoes(inicial);
}

export function buscarManutencaoPorIdMock(id: number): ManutencaoMockRegistro | undefined {
  return obterManutencoesArmazenadas().find((item) => item.id === id);
}

export function concluirManutencaoArmazenada(
  id: number,
  servicoExecutado: string
): ManutencaoConcluidaResposta | undefined {
  const lista = obterManutencoesArmazenadas();
  const indice = lista.findIndex((item) => item.id === id);
  if (indice === -1) return undefined;

  const dataConclusao = new Date().toISOString();
  lista[indice] = {
    ...lista[indice],
    status: "Concluida",
    dataConclusao,
    servicoExecutado: servicoExecutado.trim(),
  };
  salvarManutencoesPorGeracao(obterGeracaoSegura(), lista);

  return {
    id,
    status: "Concluida",
    dataConclusao,
  };
}

export function obterComentariosManutencaoMock(
  manutencaoId?: number
): ComentarioManutencaoResposta[] {
  const geracao = obterGeracaoSegura();
  let lista = memoriaComentarios.get(geracao);
  if (!lista && typeof sessionStorage !== "undefined") {
    try {
      const bruto = sessionStorage.getItem(`${STORAGE_PREFIX_COMENT}${geracao}`);
      if (bruto) {
        const parsed = JSON.parse(bruto) as ComentarioManutencaoResposta[];
        if (Array.isArray(parsed)) {
          lista = clonarComentarios(parsed);
          memoriaComentarios.set(geracao, lista);
        }
      }
    } catch {
      lista = [];
    }
  }
  const base = lista ?? [];
  return typeof manutencaoId === "number"
    ? clonarComentarios(base.filter((c) => c.manutencaoId === manutencaoId))
    : clonarComentarios(base);
}

export function criarComentarioManutencaoArmazenado(
  manutencaoId: number,
  descricao: string,
  autorNome?: string
): ComentarioManutencaoResposta | undefined {
  const manutencao = buscarManutencaoPorIdMock(manutencaoId);
  if (!manutencao) return undefined;

  const atuais = obterComentariosManutencaoMock();
  const novoId = atuais.reduce((acc, item) => Math.max(acc, item.id), 900) + 1;
  const comentario: ComentarioManutencaoResposta = {
    id: novoId,
    obraId: manutencao.obraId,
    manutencaoId,
    descricao: descricao.trim(),
    tipo: "Manutencao",
    autorNome: autorNome || "Instalador",
    dataRegistro: new Date().toISOString(),
  };

  salvarComentariosPorGeracao(obterGeracaoSegura(), [...atuais, comentario]);
  return { ...comentario };
}

export function resetarManutencoesMock(): void {
  const geracao = obterGeracaoSegura();
  memoriaManutencoes.delete(geracao);
  memoriaComentarios.delete(geracao);
  if (typeof sessionStorage !== "undefined") {
    try {
      sessionStorage.removeItem(`${STORAGE_PREFIX_MANUT}${geracao}`);
      sessionStorage.removeItem(`${STORAGE_PREFIX_COMENT}${geracao}`);
    } catch {
      // Ignora em ambiente sem storage
    }
  }
}
