// frontend/src/services/mock/fixtures.ts
// Fixtures sincronizadas 100% com database/02_seed.sql e database/GUIA_QA.md
import type { ObraCard, NomePerfil, DadosHomologacao, CriarProgramacaoPayload } from "@/types";
import type { StatusObra } from "@/constants/kanbanStatus";
import type { Programacao } from "../programacoes";
import type { Equipe } from "../equipes";
import {
  proximoDiaUtil,
  adicionarDiasUteis,
  formatarDataISO,
  calcularDiasUteisEntre,
  normalizarDataMeioDiaUTC,
} from "@/lib/formatters";

export interface MockUsuario {
  id: number;
  nome: string;
  email: string;
  perfil: {
    id: number;
    nomePerfil: NomePerfil;
    permissoes: string[];
  };
  equipeId?: number;
}

/** Usuários sincronizados estritamente com IDs do 02_seed.sql e GUIA_QA.md */
export const MOCK_USUARIOS: Record<string, MockUsuario> = {
  "admin@zl.com.br": {
    id: 1,
    nome: "Carlos Administrador",
    email: "admin@zl.com.br",
    perfil: {
      id: 1,
      nomePerfil: "Administrador",
      permissoes: ["*"],
    },
  },
  "engenharia@zlengenharia.com": {
    id: 2,
    nome: "Ana Souza",
    email: "engenharia@zlengenharia.com",
    perfil: {
      id: 2,
      nomePerfil: "EngenhariaObras",
      permissoes: ["obras:criar", "obras:mover", "programacoes:editar"],
    },
    equipeId: 3,
  },
  "financeiro@zl.com.br": {
    id: 3,
    nome: "Fernanda Financeiro",
    email: "financeiro@zl.com.br",
    perfil: {
      id: 3,
      nomePerfil: "Financeiro",
      permissoes: ["financeiro:visualizar", "relatorios:visualizar"],
    },
  },
  "instalador@zl.com.br": {
    id: 5,
    nome: "Marcos Instalador",
    email: "instalador@zl.com.br",
    perfil: {
      id: 5,
      nomePerfil: "InstaladorCampo",
      permissoes: ["obras:visualizar", "materiais:confirmar"],
    },
    equipeId: 3,
  },
};

/** 10 Obras sincronizadas estritamente com database/02_seed.sql */
export const MOCK_OBRAS_FIXTURE: ObraCard[] = [
  { id: 301, clienteNome: "Rede Alfa Supermercados", status: "MaterialComprado", categoria: "Comercial", quantidadePaineis: 45, dataFimEstimada: "2026-10-06" },
  { id: 302, clienteNome: "Indústria Metalúrgica Ramos", status: "MaterialComprado", categoria: "Industrial", quantidadePaineis: 120, dataFimEstimada: "2026-10-25" },
  { id: 303, clienteNome: "Residencial Vista Verde", status: "NoDeposito", categoria: "Residencial", quantidadePaineis: 24, dataFimEstimada: "2026-10-14" },
  { id: 304, clienteNome: "Fazenda Santa Maria", status: "Separado", categoria: "Rural", quantidadePaineis: 80, dataFimEstimada: "2026-10-08" },
  { id: 305, clienteNome: "Hospital São Lucas", status: "EmAndamento", categoria: "Comercial", quantidadePaineis: 96, dataFimEstimada: "2026-10-02" },
  { id: 306, clienteNome: "Condomínio Solar das Flores", status: "EmAndamento", categoria: "Residencial", quantidadePaineis: 36, dataFimEstimada: "2026-10-04" },
  { id: 307, clienteNome: "Posto Alvorada Combustíveis", status: "Concluido", categoria: "Comercial", quantidadePaineis: 50, dataFimEstimada: "2026-09-18" },
  { id: 308, clienteNome: "Granja Silva", status: "Assistencia", categoria: "Manutenção", quantidadePaineis: 30, dataFimEstimada: "2026-10-12" },
  { id: 309, clienteNome: "Escola Estadual Dom Pedro II", status: "NoDeposito", categoria: "Comercial", quantidadePaineis: 60, dataFimEstimada: "2026-10-20" },
  { id: 310, clienteNome: "Shopping Bela Vista", status: "MaterialComprado", categoria: "Comercial", quantidadePaineis: 200, dataFimEstimada: "2026-11-10" },
];

const STORAGE_KEY = "mock_obras_v2";

export function obterObrasArmazenadas(): ObraCard[] {
  if (typeof window === "undefined") return MOCK_OBRAS_FIXTURE;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {
    console.warn("[Mock] Erro ao ler sessionStorage:", e);
  }
  salvarObrasArmazenadas(MOCK_OBRAS_FIXTURE);
  return MOCK_OBRAS_FIXTURE;
}

export function salvarObrasArmazenadas(obras: ObraCard[]): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(obras));
  } catch (e) {
    console.warn("[Mock] Erro ao salvar sessionStorage:", e);
  }
}

export function adicionarObraArmazenada(payload: {
  clienteNome: string;
  cidade?: string;
  quantidadePaineis: number;
  dataInicioEstimada: string;
  dataFimEstimada: string;
}): ObraCard {
  const obras = obterObrasArmazenadas();
  const maxId = obras.reduce((acc, curr) => Math.max(acc, Number(curr.id) || 0), 300);
  const novoId = maxId + 1;

  const novaObra: ObraCard = {
    id: novoId,
    clienteNome: payload.clienteNome,
    status: "MaterialComprado",
    categoria: "Novo",
    quantidadePaineis: payload.quantidadePaineis,
    dataFimEstimada: payload.dataFimEstimada,
  };

  const listaAtualizada = [novaObra, ...obras];
  salvarObrasArmazenadas(listaAtualizada);
  return novaObra;
}

export function atualizarStatusObraArmazenada(
  id: number,
  statusNovo: StatusObra
): ObraCard | null {
  const obras = obterObrasArmazenadas();
  let obraModificada: ObraCard | null = null;

  const listaAtualizada = obras.map((obra) => {
    if (Number(obra.id) === id) {
      obraModificada = { ...obra, status: statusNovo };
      return obraModificada;
    }
    return obra;
  });

  if (obraModificada) {
    salvarObrasArmazenadas(listaAtualizada);
  }

  return obraModificada;
}

/** 10 Equipes sincronizadas estritamente com database/02_seed.sql */
export const MOCK_EQUIPES_FIXTURE: Equipe[] = [
  { id: 1, nome: "Equipe 01", especialidade: "Instalação Residencial" },
  { id: 2, nome: "Equipe 02", especialidade: "Instalação Comercial" },
  { id: 3, nome: "Equipe 03", especialidade: "Instalação Industrial" },
  { id: 4, nome: "Equipe 04", especialidade: "Instalação Rural" },
  { id: 5, nome: "Equipe 05", especialidade: "Instalação Residencial" },
  { id: 6, nome: "Equipe 06", especialidade: "Instalação Comercial" },
  { id: 7, nome: "Equipe 07", especialidade: "Manutenção e Assistência" },
  { id: 8, nome: "Equipe 08", especialidade: "Instalação Industrial" },
  { id: 9, nome: "Equipe 09", especialidade: "Instalação Rural" },
  { id: 10, nome: "Equipe 10", especialidade: "Manutenção e Assistência" },
];

/** 10 Programações sincronizadas estritamente com database/02_seed.sql e QA (607 com prioridade 3 na Eq 1, 608 com prioridade 3 na Eq 2, 609 em dia útil) */
export const MOCK_PROGRAMACOES_FIXTURE: Programacao[] = [
  { id: 601, obraId: 301, equipeId: 1, dataInicio: "2026-10-01", dataFim: "2026-10-03", prioridade: 1, duracaoEstimadaDias: 2 },
  { id: 602, obraId: 302, equipeId: 1, dataInicio: "2026-10-06", dataFim: "2026-10-10", prioridade: 2, duracaoEstimadaDias: 4 },
  { id: 603, obraId: 303, equipeId: 2, dataInicio: "2026-10-02", dataFim: "2026-10-06", prioridade: 1, duracaoEstimadaDias: 2 },
  { id: 604, obraId: 305, equipeId: 2, dataInicio: "2026-10-07", dataFim: "2026-10-10", prioridade: 2, duracaoEstimadaDias: 3 },
  { id: 605, obraId: 304, equipeId: 3, dataInicio: "2026-10-01", dataFim: "2026-10-07", prioridade: 1, duracaoEstimadaDias: 4 },
  { id: 606, obraId: 306, equipeId: 3, dataInicio: "2026-10-08", dataFim: "2026-10-10", prioridade: 2, duracaoEstimadaDias: 2 },
  { id: 607, obraId: 309, equipeId: 1, dataInicio: "2026-10-13", dataFim: "2026-10-17", prioridade: 3, duracaoEstimadaDias: 4.5 },
  { id: 608, obraId: 310, equipeId: 2, dataInicio: "2026-10-20", dataFim: "2026-11-07", prioridade: 3, duracaoEstimadaDias: 14.0 },
  { id: 609, obraId: 308, equipeId: 7, dataInicio: "2026-10-09", dataFim: "2026-10-10", prioridade: 1, duracaoEstimadaDias: 1.0 },
  { id: 610, obraId: 302, equipeId: 4, dataInicio: "2026-10-14", dataFim: "2026-10-18", prioridade: 3, duracaoEstimadaDias: 3.5 },
];

const STORAGE_KEY_PROG = "mock_programacoes_v2";

export function obterEquipesArmazenadas(): Equipe[] {
  return MOCK_EQUIPES_FIXTURE;
}

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
    let fim = normalizarDataMeioDiaUTC(novaDataFim);
    if (fim <= ini) {
      fim = adicionarDiasUteis(ini, 1);
    }
    novaDataInicioStr = formatarDataISO(ini);
    novaDataFimStr = formatarDataISO(fim);
    duracao = Math.max(1, calcularDiasUteisEntre(ini, fim));
  } else if (novaDataInicio) {
    const ini = proximoDiaUtil(normalizarDataMeioDiaUTC(novaDataInicio));
    const fim = adicionarDiasUteis(ini, duracao);
    novaDataInicioStr = formatarDataISO(ini);
    novaDataFimStr = formatarDataISO(fim);
  } else if (novaDataFim) {
    const ini = normalizarDataMeioDiaUTC(progOriginal.dataInicio);
    let fim = normalizarDataMeioDiaUTC(novaDataFim);
    if (fim <= ini) {
      fim = adicionarDiasUteis(ini, 1);
    }
    novaDataFimStr = formatarDataISO(fim);
    duracao = Math.max(1, calcularDiasUteisEntre(ini, fim));
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

    if (cursorFim && item.dataInicio < cursorFim) {
      // Conflito/sobreposição: encadeia o início exatamente no término útil da anterior
      const dataInicioAjustada = proximoDiaUtil(normalizarDataMeioDiaUTC(cursorFim));
      const durItem = item.duracaoEstimadaDias || 1;
      const dataFimAjustada = adicionarDiasUteis(dataInicioAjustada, durItem);

      const novoIniStr = formatarDataISO(dataInicioAjustada);
      const novoFimStr = formatarDataISO(dataFimAjustada);

      item.dataInicio = novoIniStr;
      item.dataFim = novoFimStr;

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

/** Fixture de Homologação 100% sincronizada com 02_seed.sql e QA (com Obra 308 Reprovada para testes) */
export const MOCK_HOMOLOGACOES_FIXTURE: Record<number, DadosHomologacao> = {
  301: { obraId: 301, parecerAcesso: "Aprovado", artTrt: "ART-2026-0301", prazoVistoria: "2026-10-10" },
  302: { obraId: 302, parecerAcesso: "Pendente", prazoVistoria: "2026-10-28" },
  303: { obraId: 303, parecerAcesso: "EmAnalise", artTrt: "ART-2026-0303", prazoVistoria: "2026-10-18" },
  304: { obraId: 304, parecerAcesso: "Aprovado", artTrt: "ART-2026-0304", prazoVistoria: "2026-10-12" },
  305: { obraId: 305, parecerAcesso: "Aprovado", artTrt: "ART-2026-0305", prazoVistoria: "2026-10-05" },
  306: { obraId: 306, parecerAcesso: "EmAnalise", artTrt: "ART-2026-0306", prazoVistoria: "2026-10-08" },
  307: { obraId: 307, parecerAcesso: "Aprovado", artTrt: "ART-2026-0307", prazoVistoria: "2026-09-20" },
  308: { obraId: 308, parecerAcesso: "Reprovado" },
  309: { obraId: 309, parecerAcesso: "Pendente", prazoVistoria: "2026-10-25" },
  310: { obraId: 310, parecerAcesso: "Pendente", prazoVistoria: "2026-11-15" },
};

export function obterHomologacaoObraArmazenada(obraId: number): DadosHomologacao {
  return (
    MOCK_HOMOLOGACOES_FIXTURE[Number(obraId)] || {
      obraId: Number(obraId),
      parecerAcesso: "Pendente",
    }
  );
}

/** Cria uma nova programação no mock com cálculo de dias úteis e persistência */
export function criarProgramacaoArmazenada(payload: CriarProgramacaoPayload): Programacao {
  const progs = obterProgramacoesArmazenadas();
  const obras = obterObrasArmazenadas();
  const obra = obras.find((o) => Number(o.id) === Number(payload.obraId));

  const novoInicio = proximoDiaUtil(normalizarDataMeioDiaUTC(payload.dataInicio));
  let duracaoDias: number;
  let novoFim: Date;

  if (payload.dataFim) {
    novoFim = normalizarDataMeioDiaUTC(payload.dataFim);
    if (novoFim <= novoInicio) {
      novoFim = adicionarDiasUteis(novoInicio, 1);
    }
    duracaoDias = Math.max(1, calcularDiasUteisEntre(novoInicio, novoFim));
  } else {
    const paineis = obra?.quantidadePaineis || 9;
    duracaoDias = Math.max(1, Math.ceil(paineis / 9));
    novoFim = adicionarDiasUteis(novoInicio, duracaoDias);
  }

  const novaProg: Programacao = {
    id: progs.length > 0 ? Math.max(...progs.map((p) => Number(p.id) || 0)) + 1 : 601,
    obraId: Number(payload.obraId),
    equipeId: Number(payload.equipeId),
    dataInicio: formatarDataISO(novoInicio),
    dataFim: formatarDataISO(novoFim),
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
    progs = progs.filter((p) => p.dataFim >= filtro.dataInicio!);
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
