// Tipos de UI State e Filtros Avançados do Cronograma Gantt (RF-08, G-03)
import type { StatusObra } from "@/shared/constants/kanbanStatus";

/**
 * Categoria escalar de obra para isolamento de tipos no Cronograma Gantt.
 */
export type CategoriaObraGantt = "Residencial" | "Comercial" | "Industrial" | "Rural" | "Manutenção";

export type NivelZoom = "day" | "week" | "month";

export interface GanttFiltrosAvancados {
  termoBusca?: string;
  instaladorId?: number;
  categoria?: CategoriaObraGantt;
  equipeId?: number;
  statusObra?: StatusObra;
  prioridade?: number;
  responsavel?: string;
  dataInicioDe?: string;
  dataInicioAte?: string;
  dataFimDe?: string;
  dataFimAte?: string;
  statusMaterial?: "todos" | "pronto" | "pendente";
  apenasAtrasadas?: boolean;
}

export interface GanttUIState {
  nivelZoom: NivelZoom;
  setNivelZoom: (nivel: NivelZoom) => void;
  filtrosSalvos: GanttFiltrosAvancados | null;
  salvarFiltros: (filtros: GanttFiltrosAvancados) => void;
  limparFiltrosSalvos: () => void;
}

export const CLASSE_BOTAO_ALOCACAO = "gantt-btn-alocacao";
export const CLASSE_BOTAO_EQUIPE = "gantt-btn-equipe";

export const obterSeletorBotaoAlocacao = (taskId?: string | number) =>
  taskId != null ? `button.${CLASSE_BOTAO_ALOCACAO}[data-task-id="${taskId}"]` : `button.${CLASSE_BOTAO_ALOCACAO}[data-task-id]`;

export const obterSeletorBotaoEquipe = (taskId?: string | number) =>
  taskId != null ? `button.${CLASSE_BOTAO_EQUIPE}[data-task-id="${taskId}"]` : `button.${CLASSE_BOTAO_EQUIPE}[data-task-id]`;

export function ehLinhaProjeto(task?: { type?: string; id?: string | number } | null): boolean {
  if (!task) return false;
  return task.type === "project" || (task.id != null && String(task.id).startsWith("equipe-"));
}

export interface GanttTask {
  equipeRotulo?: string;
  pessoasFaltantes?: number;
  integrantesNomes?: string[];
  id: string | number;
  parent?: string | number;
  type?: "project" | "task";
  open?: boolean;
  text: string;
  start_date: string | Date;
  end_date: string | Date;
  dataFimInclusiva?: string;
  duration?: number;
  equipeId?: number;
  nomeEquipe?: string;
  nomeCliente?: string;
  paineis?: number;
  duracaoDias?: number;
  statusObra?: string;
  materialPronto?: boolean;
  homologacaoOk?: boolean;
}

