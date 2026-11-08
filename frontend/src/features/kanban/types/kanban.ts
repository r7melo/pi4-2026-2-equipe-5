import type { StatusObra } from "@/shared/constants/kanbanStatus";
import type { ObraCard } from "@/features/obras/types/obras";

export interface MoverStatusResposta {
  id: number;
  statusAnterior: string;
  statusNovo: string;
  dataAlteracao: string;
  emailNotificacaoEnviado: boolean;
}

export interface KanbanColumnData {
  id: StatusObra;
  titulo: string;
  cards: ObraCard[];
}

