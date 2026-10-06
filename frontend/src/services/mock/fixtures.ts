// frontend/src/services/mock/fixtures.ts
// Fixtures sincronizadas 100% com database/02_seed.sql e database/GUIA_QA.md
import type { ObraCard, NomePerfil, DadosHomologacao, CriarProgramacaoPayload } from "@/types";
import type { StatusObra } from "@/constants/kanbanStatus";
import type { Programacao } from "../programacoes";
import type { Equipe, CriarEquipePayload } from "../equipes";
import type { Material } from "../materiais";
import type { RelatorioCusto } from "../relatorios";
import {
  proximoDiaUtil,
  adicionarDiasUteis,
  formatarDataISO,
  calcularDiasUteisEntre,
  normalizarDataMeioDiaUTC,
  dataFimExclusivaParaUltimoDiaUtil,
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
    cidade: payload.cidade,
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

export function excluirObraArmazenada(id: number): boolean {
  const obras = obterObrasArmazenadas();
  const index = obras.findIndex((o) => Number(o.id) === Number(id));
  if (index === -1) return false;

  obras.splice(index, 1);
  salvarObrasArmazenadas(obras);

  // Defesa em profundidade: purga defensiva de eventuais programações no Gantt
  if (typeof window !== "undefined") {
    try {
      const progs = obterProgramacoesArmazenadas();
      const filtradas = progs.filter((p) => Number(p.obraId) !== Number(id));
      if (filtradas.length !== progs.length) {
        sessionStorage.setItem("mock_programacoes_v3", JSON.stringify(filtradas));
      }
    } catch {
      // Silencia erro no storage
    }
  }

  return true;
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

const STORAGE_KEY_PROG = "mock_programacoes_v3";

export interface MockInstalador {
  id: number;
  nome: string;
  email: string;
}

/** 3 Instaladores oficiais sincronizados com database/02_seed.sql (IDs 5, 8 e 9) */
export const MOCK_INSTALADORES_DISPONIVEIS: MockInstalador[] = [
  { id: 5, nome: "Marcos Instalador", email: "instalador@zl.com.br" },
  { id: 8, nome: "Diego Instalador", email: "diego.campo@zl.com.br" },
  { id: 9, nome: "Beatriz Instaladora", email: "beatriz.campo@zl.com.br" },
];

const STORAGE_KEY_EQUIPES = "mock_equipes_v1";

export function obterEquipesArmazenadas(): Equipe[] {
  if (typeof window === "undefined") return MOCK_EQUIPES_FIXTURE;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY_EQUIPES);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {
    console.warn("[Mock] Erro ao ler equipes no sessionStorage:", e);
  }
  salvarEquipesArmazenadas(MOCK_EQUIPES_FIXTURE);
  return MOCK_EQUIPES_FIXTURE;
}

export function salvarEquipesArmazenadas(equipes: Equipe[]): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(STORAGE_KEY_EQUIPES, JSON.stringify(equipes));
  } catch (e) {
    console.warn("[Mock] Erro ao salvar equipes no sessionStorage:", e);
  }
}

export function adicionarEquipeArmazenada(payload: CriarEquipePayload): Equipe {
  const equipes = obterEquipesArmazenadas();
  const maxId = equipes.reduce((acc, curr) => Math.max(acc, Number(curr.id) || 0), 0);
  const novoId = maxId + 1;

  const membros = MOCK_INSTALADORES_DISPONIVEIS.filter((i) =>
    payload.instaladorIds.includes(i.id)
  ).map((i) => ({
    id: i.id,
    nome: i.nome,
  }));

  const responsavel = MOCK_INSTALADORES_DISPONIVEIS.find(
    (i) => i.id === payload.responsavelId
  );

  const novaEquipe: Equipe = {
    id: novoId,
    nome: payload.nome,
    especialidade: payload.especialidade || "Instalação Fotovoltaica Geral",
    responsavelId: payload.responsavelId,
    responsavelNome: responsavel?.nome || "Responsável não informado",
    membros,
  };

  const atualizadas = [...equipes, novaEquipe];
  salvarEquipesArmazenadas(atualizadas);
  return novaEquipe;
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

// ─── MATERIAIS (RF-06) ───
const STORAGE_KEY_MAT = "mock_materiais";

export const MOCK_MATERIAIS_FIXTURE: Material[] = [
  // Obra 301 - Rede Alfa Supermercados (45 painéis)
  { id: 501, obraId: 301, descricao: "Painel Solar 550W Monocristalino", quantidade: 45, unidade: "un" },
  { id: 502, obraId: 301, descricao: "Inversor String 25kW Trifásico", quantidade: 1, unidade: "un" },
  { id: 503, obraId: 301, descricao: "Cabo Solar 6mm Preto/Vermelho", quantidade: 400, unidade: "m" },
  { id: 504, obraId: 301, descricao: "Estrutura Fixação Telhado Trapezoidal", quantidade: 12, unidade: "kit" },
  { id: 505, obraId: 301, descricao: "String Box CC 1000V com DPS Integrado", quantidade: 1, unidade: "un" },

  // Obra 302 - Indústria Metalúrgica Ramos (120 painéis)
  { id: 506, obraId: 302, descricao: "Módulo Fotovoltaico 550W Bifacial", quantidade: 120, unidade: "un" },
  { id: 507, obraId: 302, descricao: "Inversor Central Trifásico 75kW", quantidade: 1, unidade: "un" },
  { id: 508, obraId: 302, descricao: "Cabo Solar 10mm Dupla Isolação", quantidade: 600, unidade: "m" },
  { id: 509, obraId: 302, descricao: "Estrutura Metálica Reforçada Alumínio", quantidade: 30, unidade: "kit" },
  { id: 510, obraId: 302, descricao: "Painel de Média Tensão e Proteção", quantidade: 1, unidade: "un" },
  { id: 511, obraId: 302, descricao: "Conectores MC4 Industriais Blindados", quantidade: 32, unidade: "par" },

  // Obra 303 - Residencial Vista Verde (24 painéis)
  { id: 512, obraId: 303, descricao: "Painel Solar 550W Monocristalino", quantidade: 24, unidade: "un" },
  { id: 513, obraId: 303, descricao: "Microinversor 2000W 4 MPPT", quantidade: 6, unidade: "un" },
  { id: 514, obraId: 303, descricao: "Cabo Tronco e Cabo Solar 6mm", quantidade: 80, unidade: "m" },
  { id: 515, obraId: 303, descricao: "Estrutura Telha Cerâmica com Gancho Inox", quantidade: 6, unidade: "kit" },
  { id: 516, obraId: 303, descricao: "Quadro de Distribuição CA com DPS e Disjuntor", quantidade: 1, unidade: "un" },

  // Obra 304 - Fazenda Santa Maria (80 painéis)
  { id: 517, obraId: 304, descricao: "Módulo Fotovoltaico 550W Tier 1", quantidade: 80, unidade: "un" },
  { id: 518, obraId: 304, descricao: "Inversor Trifásico 20kW", quantidade: 2, unidade: "un" },
  { id: 519, obraId: 304, descricao: "Cabo Solar 6mm", quantidade: 400, unidade: "m" },
  { id: 520, obraId: 304, descricao: "Estrutura Biposte de Solo em Aço Galvanizado", quantidade: 20, unidade: "kit" },
  { id: 521, obraId: 304, descricao: "String Box CC 2 Entradas / 2 Saídas", quantidade: 2, unidade: "un" },
  { id: 522, obraId: 304, descricao: "Eletroduto Corrugado Reforçado 2\"", quantidade: 150, unidade: "m" },

  // Obra 305 - Hospital São Lucas (96 painéis)
  { id: 523, obraId: 305, descricao: "Painel Solar 550W Alta Eficiência", quantidade: 96, unidade: "un" },
  { id: 524, obraId: 305, descricao: "Inversor Híbrido 25kW com Suporte a Nobreak", quantidade: 2, unidade: "un" },
  { id: 525, obraId: 305, descricao: "Cabo Solar 6mm Retardante a Chamas", quantidade: 500, unidade: "m" },
  { id: 526, obraId: 305, descricao: "Estrutura Especial Fixação Alumínio Anodizado", quantidade: 24, unidade: "kit" },
  { id: 527, obraId: 305, descricao: "Sistema de Aterramento e Malha SPDA Hospitalar", quantidade: 1, unidade: "un" },
  { id: 528, obraId: 305, descricao: "Chave de Transferência Automática ATS", quantidade: 2, unidade: "un" },

  // Obra 306 - Condomínio Solar das Flores (36 painéis)
  { id: 529, obraId: 306, descricao: "Módulo Fotovoltaico 550W", quantidade: 36, unidade: "un" },
  { id: 530, obraId: 306, descricao: "Inversor Trifásico 15kW", quantidade: 1, unidade: "un" },
  { id: 531, obraId: 306, descricao: "Cabo Solar 6mm", quantidade: 150, unidade: "m" },
  { id: 532, obraId: 306, descricao: "Estrutura Especial para Telhas Shingle", quantidade: 9, unidade: "kit" },
  { id: 533, obraId: 306, descricao: "Caixa de Proteção CA/CC Integrada", quantidade: 1, unidade: "un" },

  // Obra 307 - Posto Alvorada Combustíveis (50 painéis)
  { id: 534, obraId: 307, descricao: "Painel Solar 550W com Certificação Anti-chama", quantidade: 50, unidade: "un" },
  { id: 535, obraId: 307, descricao: "Inversor IP66 para Área Classificada", quantidade: 1, unidade: "un" },
  { id: 536, obraId: 307, descricao: "Cabo Solar Blindado 6mm", quantidade: 250, unidade: "m" },
  { id: 537, obraId: 307, descricao: "Estrutura em Aço Inox 316", quantidade: 14, unidade: "kit" },
  { id: 538, obraId: 307, descricao: "Eletrodutos Galvanizados à Prova de Explosão", quantidade: 80, unidade: "m" },

  // Obra 308 - Manutenção Preventiva — Granja Silva (30 painéis)
  { id: 539, obraId: 308, descricao: "Conector MC4 Original Stäubli", quantidade: 20, unidade: "par" },
  { id: 540, obraId: 308, descricao: "Diodo de Bypass 15A 1000V", quantidade: 4, unidade: "un" },
  { id: 541, obraId: 308, descricao: "Fusível Fotovoltaico gPV 1000V 15A", quantidade: 2, unidade: "un" },
  { id: 542, obraId: 308, descricao: "Solução Desengordurante Biodegradável para Módulos", quantidade: 50, unidade: "l" },
];

export function obterMateriaisArmazenados(): Material[] {
  if (typeof window === "undefined") return MOCK_MATERIAIS_FIXTURE;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY_MAT);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length >= MOCK_MATERIAIS_FIXTURE.length) {
        return parsed;
      }
    }
  } catch { }
  sessionStorage.setItem(STORAGE_KEY_MAT, JSON.stringify(MOCK_MATERIAIS_FIXTURE));
  return MOCK_MATERIAIS_FIXTURE;
}

export function adicionarMaterialArmazenado(obraId: number, payload: Omit<Material, "id" | "obraId">): Material {
  const materiais = obterMateriaisArmazenados();
  const novoId = materiais.reduce((acc, curr) => Math.max(acc, curr.id), 500) + 1;
  const novo: Material = { id: novoId, obraId, ...payload };
  const atualizados = [...materiais, novo];
  sessionStorage.setItem(STORAGE_KEY_MAT, JSON.stringify(atualizados));
  return novo;
}

// ─── RELATÓRIOS (RF-14/15/20) ───
export const MOCK_RELATORIOS_FIXTURE: Record<number, RelatorioCusto> = {
  301: {
    obraId: 301,
    custoTotal: 38600.0,
    receita: 58500.0,
    lucro: 19900.0,
    itens: [
      { descricao: "Mão de Obra de Instalação e Montagem", valor: 10500.0 },
      { descricao: "45 Módulos Fotovoltaicos 550W Monocristalinos", valor: 18200.0 },
      { descricao: "Inversor String Trifásico 25kW", valor: 5800.0 },
      { descricao: "Estruturas de Fixação Telhado Trapezoidal", valor: 2100.0 },
      { descricao: "Cabeamento Solar 6mm e String Box CC/CA", valor: 1200.0 },
      { descricao: "Homologação, Projeto Elétrico e ART", valor: 800.0 },
    ],
    balancoMateriais: [
      { tipo: "Painel Solar 550W Monocristalino", unidade: "un", quantidadeComprada: 45, quantidadeUtilizada: 45 },
      { tipo: "Inversor String 25kW Trifásico", unidade: "un", quantidadeComprada: 1, quantidadeUtilizada: 1 },
      { tipo: "Cabo Solar 6mm Preto/Vermelho", unidade: "m", quantidadeComprada: 400, quantidadeUtilizada: 367 },
      { tipo: "Estrutura Fixação Telhado Trapezoidal", unidade: "kit", quantidadeComprada: 12, quantidadeUtilizada: 12 },
      { tipo: "String Box CC 1000V com DPS Integrado", unidade: "un", quantidadeComprada: 1, quantidadeUtilizada: 1 },
    ],
  },
  302: {
    obraId: 302,
    custoTotal: 102400.0,
    receita: 156000.0,
    lucro: 53600.0,
    itens: [
      { descricao: "Mão de Obra Especializada Industrial", valor: 26000.0 },
      { descricao: "120 Módulos Fotovoltaicos 550W Bifaciais", valor: 48000.0 },
      { descricao: "Inversor Central Trifásico 75kW", valor: 15400.0 },
      { descricao: "Estruturas de Fixação Reforçadas em Alumínio", valor: 6200.0 },
      { descricao: "Subestação, Painel de Média Tensão e Proteção", valor: 4500.0 },
      { descricao: "Cabeamento Solar 10mm e Conectores MC4", valor: 2300.0 },
    ],
    balancoMateriais: [
      { tipo: "Módulo Fotovoltaico 550W Bifacial", unidade: "un", quantidadeComprada: 120, quantidadeUtilizada: 0 },
      { tipo: "Inversor Central Trifásico 75kW", unidade: "un", quantidadeComprada: 1, quantidadeUtilizada: 0 },
      { tipo: "Cabo Solar 10mm Dupla Isolação", unidade: "m", quantidadeComprada: 600, quantidadeUtilizada: 0 },
      { tipo: "Estrutura Metálica Reforçada Alumínio", unidade: "kit", quantidadeComprada: 30, quantidadeUtilizada: 0 },
      { tipo: "Conectores MC4 Industriais Blindados", unidade: "par", quantidadeComprada: 32, quantidadeUtilizada: 0 },
    ],
  },
  303: {
    obraId: 303,
    custoTotal: 21300.0,
    receita: 32000.0,
    lucro: 10700.0,
    itens: [
      { descricao: "Mão de Obra Residencial (Telhado Inclinado)", valor: 6000.0 },
      { descricao: "24 Módulos Fotovoltaicos 550W", valor: 9800.0 },
      { descricao: "6 Microinversores 2000W", valor: 3600.0 },
      { descricao: "Estrutura Telha Cerâmica e Ganchos Inox", valor: 1100.0 },
      { descricao: "Quadro de Distribuição CA e Disjuntores", valor: 800.0 },
    ],
    balancoMateriais: [
      { tipo: "Painel Solar 550W Monocristalino", unidade: "un", quantidadeComprada: 24, quantidadeUtilizada: 24 },
      { tipo: "Microinversor 2000W 4 MPPT", unidade: "un", quantidadeComprada: 6, quantidadeUtilizada: 6 },
      { tipo: "Cabo Tronco e Cabo Solar 6mm", unidade: "m", quantidadeComprada: 80, quantidadeUtilizada: 73 },
      { tipo: "Estrutura Telha Cerâmica com Gancho Inox", unidade: "kit", quantidadeComprada: 6, quantidadeUtilizada: 6 },
    ],
  },
  304: {
    obraId: 304,
    custoTotal: 68900.0,
    receita: 104000.0,
    lucro: 35100.0,
    itens: [
      { descricao: "Mão de Obra Montagem Usina em Solo", valor: 18000.0 },
      { descricao: "80 Módulos Fotovoltaicos 550W Tier 1", valor: 32400.0 },
      { descricao: "2 Inversores Trifásicos 20kW", valor: 11200.0 },
      { descricao: "Estrutura de Fixação Biposte em Solo Galvanizado", valor: 4800.0 },
      { descricao: "Valas, Eletrodutos Enterrados e Cabos de Cobre", valor: 2500.0 },
    ],
    balancoMateriais: [
      { tipo: "Módulo Fotovoltaico 550W Tier 1", unidade: "un", quantidadeComprada: 80, quantidadeUtilizada: 0 },
      { tipo: "Inversor Trifásico 20kW", unidade: "un", quantidadeComprada: 2, quantidadeUtilizada: 0 },
      { tipo: "Cabo Solar 6mm", unidade: "m", quantidadeComprada: 400, quantidadeUtilizada: 0 },
      { tipo: "Estrutura Biposte de Solo em Aço Galvanizado", unidade: "kit", quantidadeComprada: 20, quantidadeUtilizada: 0 },
      { tipo: "Eletroduto Corrugado Reforçado 2\"", unidade: "m", quantidadeComprada: 150, quantidadeUtilizada: 0 },
    ],
  },
  305: {
    obraId: 305,
    custoTotal: 83500.0,
    receita: 128000.0,
    lucro: 44500.0,
    itens: [
      { descricao: "Mão de Obra Especializada com Escala Noturna", valor: 22500.0 },
      { descricao: "96 Módulos Fotovoltaicos 550W Alta Eficiência", valor: 39000.0 },
      { descricao: "Inversores Híbridos com Integração a Gerador", valor: 14200.0 },
      { descricao: "Sistema de Aterramento e Malha SPDA Hospitalar", valor: 4800.0 },
      { descricao: "String Boxes com Chave Seccionadora Motorizada", valor: 3000.0 },
    ],
    balancoMateriais: [
      { tipo: "Painel Solar 550W Alta Eficiência", unidade: "un", quantidadeComprada: 96, quantidadeUtilizada: 58 },
      { tipo: "Inversor Híbrido 25kW com Suporte a Nobreak", unidade: "un", quantidadeComprada: 2, quantidadeUtilizada: 1 },
      { tipo: "Cabo Solar 6mm Retardante a Chamas", unidade: "m", quantidadeComprada: 500, quantidadeUtilizada: 280 },
      { tipo: "Estrutura Especial Fixação Alumínio Anodizado", unidade: "kit", quantidadeComprada: 24, quantidadeUtilizada: 14 },
      { tipo: "Chave de Transferência Automática ATS", unidade: "un", quantidadeComprada: 2, quantidadeUtilizada: 1 },
    ],
  },
  306: {
    obraId: 306,
    custoTotal: 31800.0,
    receita: 48000.0,
    lucro: 16200.0,
    itens: [
      { descricao: "Mão de Obra com Equipamento de Linha de Vida (NR-35)", valor: 8500.0 },
      { descricao: "36 Módulos Fotovoltaicos 550W", valor: 14800.0 },
      { descricao: "Inversor Trifásico 15kW", valor: 5200.0 },
      { descricao: "Estruturas de Fixação para Telhas Shingle", valor: 1900.0 },
      { descricao: "Cabeamento Solar e Quadro Geral", valor: 1400.0 },
    ],
    balancoMateriais: [
      { tipo: "Módulo Fotovoltaico 550W", unidade: "un", quantidadeComprada: 36, quantidadeUtilizada: 21 },
      { tipo: "Inversor Trifásico 15kW", unidade: "un", quantidadeComprada: 1, quantidadeUtilizada: 0 },
      { tipo: "Cabo Solar 6mm", unidade: "m", quantidadeComprada: 150, quantidadeUtilizada: 88 },
      { tipo: "Estrutura Especial para Telhas Shingle", unidade: "kit", quantidadeComprada: 9, quantidadeUtilizada: 5 },
    ],
  },
  307: {
    obraId: 307,
    custoTotal: 44700.0,
    receita: 69000.0,
    lucro: 24300.0,
    itens: [
      { descricao: "Mão de Obra com Certificações NR-10, NR-20 e NR-35", valor: 12000.0 },
      { descricao: "50 Módulos Fotovoltaicos Anti-deflagrantes 550W", valor: 21000.0 },
      { descricao: "Inversor String Grau de Proteção IP66", valor: 7200.0 },
      { descricao: "Eletrodutos Galvanizados à Prova de Explosão", valor: 2900.0 },
      { descricao: "Laudo de Conformidade de Área Classificada e ART", valor: 1600.0 },
    ],
    balancoMateriais: [
      { tipo: "Painel Solar 550W com Certificação Anti-chama", unidade: "un", quantidadeComprada: 50, quantidadeUtilizada: 50 },
      { tipo: "Inversor IP66 para Área Classificada", unidade: "un", quantidadeComprada: 1, quantidadeUtilizada: 1 },
      { tipo: "Cabo Solar Blindado 6mm", unidade: "m", quantidadeComprada: 250, quantidadeUtilizada: 231 },
      { tipo: "Estrutura em Aço Inox 316", unidade: "kit", quantidadeComprada: 14, quantidadeUtilizada: 14 },
      { tipo: "Eletrodutos Galvanizados à Prova de Explosão", unidade: "m", quantidadeComprada: 80, quantidadeUtilizada: 80 },
    ],
  },
  308: {
    obraId: 308,
    custoTotal: 9400.0,
    receita: 18000.0,
    lucro: 8600.0,
    itens: [
      { descricao: "Equipe Técnica Especializada em O&M Solar", valor: 4200.0 },
      { descricao: "Substituição de Conectores MC4 e Diodos de Bypass", valor: 1800.0 },
      { descricao: "Limpeza Química e Descontaminação dos Módulos", valor: 1900.0 },
      { descricao: "Inspeção Termográfica com Drone e Relatório Técnico", valor: 1500.0 },
    ],
    balancoMateriais: [
      { tipo: "Conector MC4 Original Stäubli", unidade: "par", quantidadeComprada: 20, quantidadeUtilizada: 14 },
      { tipo: "Diodo de Bypass 15A 1000V", unidade: "un", quantidadeComprada: 4, quantidadeUtilizada: 3 },
      { tipo: "Fusível Fotovoltaico gPV 1000V 15A", unidade: "un", quantidadeComprada: 2, quantidadeUtilizada: 2 },
      { tipo: "Solução Desengordurante Biodegradável", unidade: "l", quantidadeComprada: 50, quantidadeUtilizada: 42 },
    ],
  },
};


/**
 * Obtém o relatório de custos da obra ou calcula dinamicamente se for uma nova obra.
 */
export function obterRelatorioArmazenado(obraId: number): RelatorioCusto | null {
  if (MOCK_RELATORIOS_FIXTURE[obraId]) {
    return MOCK_RELATORIOS_FIXTURE[obraId];
  }

  // Se for uma obra recém-cadastrada, gera estimativa baseada no porte de painéis
  const obras = obterObrasArmazenadas();
  const obra = obras.find((o) => Number(o.id) === obraId);
  if (obra) {
    const paineis = obra.quantidadePaineis || 30;
    const receita = paineis * 1300;
    const custoTotal = paineis * 850;
    const lucro = receita - custoTotal;

    const relatorioGerado: RelatorioCusto = {
      obraId,
      receita,
      custoTotal,
      lucro,
      itens: [
        { descricao: `Módulos Fotovoltaicos (${paineis} un)`, valor: Math.round(custoTotal * 0.46) },
        { descricao: "Mão de Obra de Instalação e Homologação", valor: Math.round(custoTotal * 0.28) },
        { descricao: "Inversor String e String Box CA/CC", valor: Math.round(custoTotal * 0.18) },
        { descricao: "Estruturas de Fixação e Cabeamento Solar", valor: Math.round(custoTotal * 0.08) },
      ],
    };

    MOCK_RELATORIOS_FIXTURE[obraId] = relatorioGerado;
    return relatorioGerado;
  }

  return null;
}

// ─── HISTÓRICO E COMENTÁRIOS (RF-11/12) ───
export interface HistoricoObra {
  id: number;
  obraId: number;
  statusAnterior: string;
  statusNovo: string;
  dataAlteracao: string;
  observacao?: string;
  usuario: { id: number; nome: string };
}

export interface ComentarioObra {
  id: number;
  obraId: number;
  descricao: string;
  dataRegistro: string;
  usuario: { id: number; nome: string };
}

const STORAGE_KEY_HIST = "mock_historico";
const STORAGE_KEY_COM = "mock_comentarios";

export const MOCK_HISTORICO_FIXTURE: HistoricoObra[] = [
  // Obra 301
  {
    id: 9001,
    obraId: 301,
    statusAnterior: "Criado",
    statusNovo: "MaterialComprado",
    dataAlteracao: new Date(Date.now() - 4 * 86400000).toISOString(),
    observacao: "Pedido de compra emitido e aprovado pelo financeiro.",
    usuario: { id: 1, nome: "Carlos Administrador" },
  },
  // Obra 302
  {
    id: 9002,
    obraId: 302,
    statusAnterior: "Criado",
    statusNovo: "MaterialComprado",
    dataAlteracao: new Date(Date.now() - 3 * 86400000).toISOString(),
    observacao: "Módulos bifaciais de 550W encomendados junto à fabricante.",
    usuario: { id: 12, nome: "Ana Souza" },
  },
  // Obra 303
  {
    id: 9003,
    obraId: 303,
    statusAnterior: "MaterialComprado",
    statusNovo: "NoDeposito",
    dataAlteracao: new Date(Date.now() - 2 * 86400000).toISOString(),
    observacao: "Microinversores e módulos recebidos no almoxarifado central.",
    usuario: { id: 1, nome: "Carlos Administrador" },
  },
  // Obra 304
  {
    id: 9004,
    obraId: 304,
    statusAnterior: "NoDeposito",
    statusNovo: "Separado",
    dataAlteracao: new Date(Date.now() - 86400000).toISOString(),
    observacao: "Kit de solo e estruturas metálicas separados no Pallet #04.",
    usuario: { id: 12, nome: "Ana Souza" },
  },
  // Obra 305
  {
    id: 9005,
    obraId: 305,
    statusAnterior: "Separado",
    statusNovo: "EmAndamento",
    dataAlteracao: new Date(Date.now() - 12 * 3600000).toISOString(),
    observacao: "Equipe 02 iniciou a fixação dos suportes na cobertura do hospital.",
    usuario: { id: 15, nome: "Marcos Instalador" },
  },
  // Obra 306
  {
    id: 9006,
    obraId: 306,
    statusAnterior: "Separado",
    statusNovo: "EmAndamento",
    dataAlteracao: new Date(Date.now() - 6 * 3600000).toISOString(),
    observacao: "Instalação da linha de vida e cabeamento CA em execução.",
    usuario: { id: 15, nome: "Marcos Instalador" },
  },
  // Obra 307
  {
    id: 9007,
    obraId: 307,
    statusAnterior: "EmAndamento",
    statusNovo: "Concluido",
    dataAlteracao: new Date(Date.now() - 14 * 86400000).toISOString(),
    observacao: "Comissionamento elétrico aprovado e homologação concluída com sucesso.",
    usuario: { id: 1, nome: "Carlos Administrador" },
  },
  // Obra 308
  {
    id: 9008,
    obraId: 308,
    statusAnterior: "Concluido",
    statusNovo: "Assistencia",
    dataAlteracao: new Date(Date.now() - 24 * 3600000).toISOString(),
    observacao: "Abertura de chamado de assistência para revisão pós-tempestade.",
    usuario: { id: 12, nome: "Ana Souza" },
  },
];

export const MOCK_COMENTARIOS_FIXTURE: ComentarioObra[] = [
  // Obra 301
  {
    id: 701,
    obraId: 301,
    descricao: "Cliente confirmou acesso ao telhado para descarregamento a partir de terça.",
    dataRegistro: new Date(Date.now() - 3600000 * 5).toISOString(),
    usuario: { id: 12, nome: "Ana Souza" },
  },
  // Obra 302
  {
    id: 702,
    obraId: 302,
    descricao: "Engenharia da metalúrgica solicitou cópia do plano de içamento de cargas.",
    dataRegistro: new Date(Date.now() - 3600000 * 8).toISOString(),
    usuario: { id: 1, nome: "Carlos Administrador" },
  },
  // Obra 303
  {
    id: 703,
    obraId: 303,
    descricao: "Materiais inspecionados sem avarias. Aguardando liberação da equipe.",
    dataRegistro: new Date(Date.now() - 3600000 * 12).toISOString(),
    usuario: { id: 15, nome: "Marcos Instalador" },
  },
  // Obra 304
  {
    id: 704,
    obraId: 304,
    descricao: "Trator da fazenda foi disponibilizado para abertura das valas dos cabos.",
    dataRegistro: new Date(Date.now() - 3600000 * 18).toISOString(),
    usuario: { id: 12, nome: "Ana Souza" },
  },
  // Obra 305
  {
    id: 705,
    obraId: 305,
    descricao: "Trabalhos elétricos pesados concentrados no turno noturno para evitar ruído.",
    dataRegistro: new Date(Date.now() - 3600000 * 3).toISOString(),
    usuario: { id: 15, nome: "Marcos Instalador" },
  },
  // Obra 306
  {
    id: 706,
    obraId: 306,
    descricao: "Síndico do condomínio liberou vaga para estacionamento do furgão de ferramentas.",
    dataRegistro: new Date(Date.now() - 3600000 * 2).toISOString(),
    usuario: { id: 12, nome: "Ana Souza" },
  },
  // Obra 307
  {
    id: 707,
    obraId: 307,
    descricao: "Vistoria da concessionária finalizada com parecer de acesso 100% deferido.",
    dataRegistro: new Date(Date.now() - 86400000 * 10).toISOString(),
    usuario: { id: 1, nome: "Carlos Administrador" },
  },
  // Obra 308
  {
    id: 708,
    obraId: 308,
    descricao: "Granja solicitou lavagem especializada dos módulos para recuperar rendimento.",
    dataRegistro: new Date(Date.now() - 3600000 * 20).toISOString(),
    usuario: { id: 12, nome: "Ana Souza" },
  },
];

export function obterHistoricoArmazenado(): HistoricoObra[] {
  if (typeof window === "undefined") return MOCK_HISTORICO_FIXTURE;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY_HIST);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length >= MOCK_HISTORICO_FIXTURE.length) {
        return parsed;
      }
    }
  } catch { }
  sessionStorage.setItem(STORAGE_KEY_HIST, JSON.stringify(MOCK_HISTORICO_FIXTURE));
  return MOCK_HISTORICO_FIXTURE;
}

export function adicionarHistoricoArmazenado(obraId: number, statusAnterior: string, statusNovo: string, observacao?: string, usuario?: { id: number; nome: string }): HistoricoObra {
  const historico = obterHistoricoArmazenado();
  const novoId = historico.reduce((acc, curr) => Math.max(acc, curr.id), 9000) + 1;
  const novo: HistoricoObra = {
    id: novoId,
    obraId,
    statusAnterior,
    statusNovo,
    dataAlteracao: new Date().toISOString(),
    observacao,
    usuario: usuario || { id: 0, nome: "Sistema" },
  };
  sessionStorage.setItem(STORAGE_KEY_HIST, JSON.stringify([novo, ...historico]));
  return novo;
}

export function obterComentariosArmazenados(): ComentarioObra[] {
  if (typeof window === "undefined") return MOCK_COMENTARIOS_FIXTURE;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY_COM);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length >= MOCK_COMENTARIOS_FIXTURE.length) {
        return parsed;
      }
    }
  } catch { }
  sessionStorage.setItem(STORAGE_KEY_COM, JSON.stringify(MOCK_COMENTARIOS_FIXTURE));
  return MOCK_COMENTARIOS_FIXTURE;
}

export function adicionarComentarioArmazenado(obraId: number, descricao: string, usuario: { id: number; nome: string }): ComentarioObra {
  const comentarios = obterComentariosArmazenados();
  const novoId = comentarios.reduce((acc, curr) => Math.max(acc, curr.id), 700) + 1;
  const novo: ComentarioObra = {
    id: novoId,
    obraId,
    descricao,
    dataRegistro: new Date().toISOString(),
    usuario,
  };
  sessionStorage.setItem(STORAGE_KEY_COM, JSON.stringify([novo, ...comentarios]));
  return novo;
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
    progs = progs.filter(
      (p) => dataFimExclusivaParaUltimoDiaUtil(p.dataFim) >= filtro.dataInicio!
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
