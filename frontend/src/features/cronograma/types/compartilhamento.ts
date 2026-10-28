import type { LinkCronogramaCompartilhado, PeriodoCompartilhado } from "@/shared/types/compartilhamentoCronograma";

export interface GanttCompartilharModalProps {
  isOpen: boolean;
  onClose: () => void;
  podeInteragir?: () => boolean;
}

export interface VariaveisGeracaoLink {
  periodo: PeriodoCompartilhado;
  sessao: number;
}

export interface LinkCronogramaValidado extends LinkCronogramaCompartilhado {
  recebidoEm: number;
}
