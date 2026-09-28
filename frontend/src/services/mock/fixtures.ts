import type { ObraCard, NomePerfil } from "@/types";
import type { StatusObra } from "@/constants/kanbanStatus";
import type { Programacao } from "../programacoes";
import type { Equipe } from "../equipes";

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

export const MOCK_USUARIOS: Record<string, MockUsuario> = {
  "engenharia@zlengenharia.com": {
    id: 12,
    nome: "Ana Souza",
    email: "engenharia@zlengenharia.com",
    perfil: {
      id: 2,
      nomePerfil: "EngenhariaObras",
      permissoes: ["obras:criar", "obras:mover", "programacoes:editar"],
    },
    equipeId: 3,
  },
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
  "instalador@zl.com.br": {
    id: 15,
    nome: "Marcos Instalador",
    email: "instalador@zl.com.br",
    perfil: {
      id: 5,
      nomePerfil: "InstaladorCampo",
      permissoes: ["obras:visualizar", "materiais:confirmar"],
    },
    equipeId: 3,
  },
  "financeiro@zl.com.br": {
    id: 10,
    nome: "Fernanda Financeiro",
    email: "financeiro@zl.com.br",
    perfil: {
      id: 3,
      nomePerfil: "Financeiro",
      permissoes: ["financeiro:visualizar", "relatorios:visualizar"],
    },
  },
};

export const MOCK_OBRAS_FIXTURE: ObraCard[] = [
  {
    id: 301,
    clienteNome: "Rede Alfa Supermercados",
    status: "MaterialComprado",
    categoria: "Comercial",
    quantidadePaineis: 45,
    dataFimEstimada: "2026-10-06",
  },
  {
    id: 302,
    clienteNome: "Indústria Metalúrgica Ramos",
    status: "MaterialComprado",
    categoria: "Industrial",
    quantidadePaineis: 120,
    dataFimEstimada: "2026-10-25",
  },
  {
    id: 303,
    clienteNome: "Residencial Vista Verde",
    status: "NoDeposito",
    categoria: "Residencial",
    quantidadePaineis: 24,
    dataFimEstimada: "2026-10-14",
  },
  {
    id: 304,
    clienteNome: "Fazenda Santa Maria",
    status: "Separado",
    categoria: "Rural",
    quantidadePaineis: 80,
    dataFimEstimada: "2026-10-08",
  },
  {
    id: 305,
    clienteNome: "Hospital São Lucas",
    status: "EmAndamento",
    categoria: "Comercial",
    quantidadePaineis: 96,
    dataFimEstimada: "2026-10-02",
  },
  {
    id: 306,
    clienteNome: "Condomínio Solar das Flores",
    status: "EmAndamento",
    categoria: "Residencial",
    quantidadePaineis: 36,
    dataFimEstimada: "2026-10-04",
  },
  {
    id: 307,
    clienteNome: "Posto Alvorada Combustíveis",
    status: "Concluido",
    categoria: "Comercial",
    quantidadePaineis: 50,
    dataFimEstimada: "2026-09-18",
  },
  {
    id: 308,
    clienteNome: "Manutenção Preventiva — Granja Silva",
    status: "Assistencia",
    categoria: "Manutenção",
    quantidadePaineis: 30,
    dataFimEstimada: "2026-10-12",
  },
];

const STORAGE_KEY = "mock_obras";

/**
 * Lê as obras do sessionStorage para preservar mutações após F5.
 * Se ainda não existir no storage, inicializa com o fixture padrão.
 */
export function obterObrasArmazenadas(): ObraCard[] {
  if (typeof window === "undefined") return MOCK_OBRAS_FIXTURE;

  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn("[Mock] Erro ao ler sessionStorage:", e);
  }

  // Inicializa o sessionStorage
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

const STORAGE_KEY_PROG = "mock_programacoes";

export const MOCK_EQUIPES_FIXTURE: Equipe[] = [
  { id: 1, nome: "Equipe 01" },
  { id: 2, nome: "Equipe 02" },
  { id: 3, nome: "Equipe 03" },
];

export const MOCK_PROGRAMACOES_FIXTURE: Programacao[] = [
  // Equipe 01: duas obras sequenciais
  {
    id: 601,
    obraId: 301,
    equipeId: 1,
    dataInicio: "2026-10-01",
    dataFim: "2026-10-03",
    prioridade: 1,
    duracaoEstimadaDias: 2,
  },
  {
    id: 602,
    obraId: 302,
    equipeId: 1,
    dataInicio: "2026-10-06",
    dataFim: "2026-10-10",
    prioridade: 2,
    duracaoEstimadaDias: 4,
  },
  // Equipe 02: duas obras
  {
    id: 603,
    obraId: 303,
    equipeId: 2,
    dataInicio: "2026-10-02",
    dataFim: "2026-10-06",
    prioridade: 1,
    duracaoEstimadaDias: 2,
  },
  {
    id: 604,
    obraId: 305,
    equipeId: 2,
    dataInicio: "2026-10-07",
    dataFim: "2026-10-10",
    prioridade: 2,
    duracaoEstimadaDias: 3,
  },
  // Equipe 03: duas obras
  {
    id: 605,
    obraId: 304,
    equipeId: 3,
    dataInicio: "2026-10-01",
    dataFim: "2026-10-07",
    prioridade: 1,
    duracaoEstimadaDias: 4,
  },
  {
    id: 606,
    obraId: 306,
    equipeId: 3,
    dataInicio: "2026-10-08",
    dataFim: "2026-10-10",
    prioridade: 2,
    duracaoEstimadaDias: 2,
  },
];

export function obterEquipesArmazenadas(): Equipe[] {
  return MOCK_EQUIPES_FIXTURE;
}

export function obterProgramacoesArmazenadas(): Programacao[] {
  if (typeof window === "undefined") return MOCK_PROGRAMACOES_FIXTURE;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY_PROG);
    if (raw) return JSON.parse(raw);
  } catch {
    // Silencia erro de leitura no storage
  }
  sessionStorage.setItem(STORAGE_KEY_PROG, JSON.stringify(MOCK_PROGRAMACOES_FIXTURE));
  return MOCK_PROGRAMACOES_FIXTURE;
}

// ─── Helpers de dias úteis (espelham a lógica do backend — RF-09) ───

/** Avança uma data pelo número de dias úteis (pula sábado e domingo). */
function adicionarDiasUteis(data: Date, dias: number): Date {
  const resultado = new Date(data);
  let restantes = Math.ceil(dias);
  while (restantes > 0) {
    resultado.setDate(resultado.getDate() + 1);
    const diaSemana = resultado.getDay();
    if (diaSemana !== 0 && diaSemana !== 6) restantes--;
  }
  return resultado;
}

/** Retorna a própria data se for dia útil, senão avança para a próxima segunda. */
function proximoDiaUtil(data: Date): Date {
  const resultado = new Date(data);
  while (resultado.getDay() === 0 || resultado.getDay() === 6) {
    resultado.setDate(resultado.getDate() + 1);
  }
  return resultado;
}

function formatarData(data: Date): string {
  return data.toISOString().split("T")[0];
}

/** Resultado da reordenação mock, espelhando o contrato da API (Rota #16) */
export interface ResultadoReordenacaoMock {
  principal: Programacao;
  afetadas: { id: number; novaDataInicio: string; novaDataFim: string }[];
}

/**
 * Simula a lógica do backend de reordenação com propagação em cadeia (RF-09).
 * - Recalcula dataFim usando dias ÚTEIS (pula sábado/domingo).
 * - Programações da mesma equipe com prioridade maior que sofrem sobreposição
 *   são empurradas para frente (cascata).
 */
export function atualizarProgramacaoDataArmazenada(
  id: number,
  novaDataInicio: string
): ResultadoReordenacaoMock | null {
  const progs = obterProgramacoesArmazenadas();
  const progOriginal = progs.find((p) => Number(p.id) === id);
  if (!progOriginal) return null;

  // Calcula nova dataFim usando dias úteis
  const duracao = progOriginal.duracaoEstimadaDias || 1;
  const novoInicio = proximoDiaUtil(new Date(`${novaDataInicio}T12:00:00Z`));
  const novoFim = adicionarDiasUteis(novoInicio, duracao);
  const novaDataFimStr = formatarData(novoFim);
  const novaDataInicioStr = formatarData(novoInicio);

  const progAtualizada: Programacao = {
    ...progOriginal,
    dataInicio: novaDataInicioStr,
    dataFim: novaDataFimStr,
  };

  // Propagação em cadeia: programações da mesma equipe com prioridade maior
  const mesmaEquipe = progs
    .filter(
      (p) =>
        p.equipeId === progOriginal.equipeId &&
        p.id !== id &&
        p.prioridade > progOriginal.prioridade
    )
    .sort((a, b) => a.prioridade - b.prioridade);

  const afetadas: { id: number; novaDataInicio: string; novaDataFim: string }[] = [];
  let ultimaDataFim = novaDataFimStr;

  for (const p of mesmaEquipe) {
    if (p.dataInicio <= ultimaDataFim) {
      // Sobreposição — empurrar para o próximo dia útil após ultimaDataFim
      const diaApos = new Date(`${ultimaDataFim}T12:00:00Z`);
      diaApos.setDate(diaApos.getDate() + 1);
      const inicioAfetada = proximoDiaUtil(diaApos);
      const dur = p.duracaoEstimadaDias || 1;
      const fimAfetada = adicionarDiasUteis(inicioAfetada, dur);

      const novoInicioStr = formatarData(inicioAfetada);
      const novoFimStr = formatarData(fimAfetada);

      afetadas.push({ id: p.id, novaDataInicio: novoInicioStr, novaDataFim: novoFimStr });
      ultimaDataFim = novoFimStr;
    }
  }

  // Persistir todas as atualizações no sessionStorage
  const atualizadas = progs.map((p) => {
    if (p.id === id) return progAtualizada;
    const afetada = afetadas.find((a) => a.id === p.id);
    if (afetada)
      return { ...p, dataInicio: afetada.novaDataInicio, dataFim: afetada.novaDataFim };
    return p;
  });
  sessionStorage.setItem(STORAGE_KEY_PROG, JSON.stringify(atualizadas));

  return { principal: progAtualizada, afetadas };
}

