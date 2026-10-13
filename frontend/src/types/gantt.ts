// Tipos de UI State e Filtros Avançados do Cronograma Gantt (RF-08, G-03)
import type { CategoriaObra } from "./obras";
import type { StatusObra } from "@/constants/kanbanStatus";

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
