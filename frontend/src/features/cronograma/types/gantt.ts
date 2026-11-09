// Tipos de UI State e Filtros Avançados do Cronograma Gantt (RF-08, G-03)
import type { CategoriaObra } from "@/features/obras/types/obras";
import type { StatusObra } from "@/shared/constants/kanbanStatus";

export type NivelZoom = "day" | "week" | "month";

export interface GanttFiltrosAvancados {
  termoBusca?: string;
  categoria?: CategoriaObra;
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
export const SELETOR_BOTAO_ALOCACAO = "button.gantt-btn-alocacao[data-task-id]";

export function ehLinhaProjeto(task: { type?: string; id?: string | number }): boolean {
  return task.type === "project" || (task.id != null && String(task.id).startsWith("equipe-"));
}

export interface GanttTask {
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

