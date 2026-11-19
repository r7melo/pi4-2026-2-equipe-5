import type { StatusObra } from "@/shared/constants/kanbanStatus";

export type CategoriaObraKanban =
  | "Residencial"
  | "Comercial"
  | "Industrial"
  | "Rural"
  | "Manutenção";

export interface ObraKanbanCard {
  id: number;
  status: StatusObra;
  clienteNome: string;
  categoria: CategoriaObraKanban;
  quantidadePaineis: number;
  dataFimEstimada: string;
  dataFimReal?: string;
  nome?: string;
  cidade?: string;
  uf?: string;
  endereco?: string;
  observacoes?: string;
  progressoGeral?: number;
  valorTotal?: number;
  atualizadoPor?: string;
  prazoContratualDias?: number;
}

export interface ListaObrasKanban {
  page?: number;
  pageSize?: number;
  total?: number;
  itens: ObraKanbanCard[];
}

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
  cards: ObraKanbanCard[];
}
