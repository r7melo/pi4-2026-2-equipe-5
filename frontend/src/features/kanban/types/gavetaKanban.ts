import type { ReactNode } from "react";
import type { StatusObra } from "@/shared/constants/kanbanStatus";
import type { ObraKanbanCard } from "./kanban";
import type { TipoComentario } from "./comentarios";
export type { ObraKanbanCard };

export type AbaDrawerKanban = "dados" | "materiais" | "historico" | "comentarios";

export interface ObraDetalheKanban {
  id: number;
  status: StatusObra;
  clienteNome?: string;
  dataInicioEstimada?: string;
  dataFimEstimada: string;
  dataInicioReal?: string | null;
  dataFimReal?: string | null;
  endereco?: string;
  quantidadePaineis?: number;
  quantidadeInversores?: number;
  valorTotal?: number;
  categoria?: string;
  observacoes?: string;
  descricao?: string | null;
}

export interface HistoricoItemKanban {
  tipoAcao?: string;
  id: number;
  dataAlteracao: string;
  usuarioNome: string;
  statusAnterior: string | null;
  statusNovo: string | null;
  observacao?: string;
}

export interface ComentarioItemKanban {
  tipo?: TipoComentario;
  id: number;
  dataHora: string;
  usuarioNome: string;
  texto: string;
}

export interface EditarObraKanbanPayload {
  endereco?: string;
  quantidadePaineis?: number;
  quantidadeInversores?: number;
  dataFimEstimada?: string;
  descricao?: string;
}

export interface EquipeAlocadaResumo {
  id: number;
  nome: string;
  pessoasPrevistas?: number;
  pessoasAlocadas?: number;
  pessoasFaltantes?: number;
  dataInicio?: string;
  dataFim?: string;
  integrantes?: {
    usuarioId: number;
    nome: string;
    dataEntrada: string;
    dataSaida: string;
  }[];
}

export interface DrawerKanbanSlotProps {
  card: ObraKanbanCard;
  isOpen: boolean;
  onClose: () => void;
  onMoverCard?: (card: ObraKanbanCard, novoStatus: StatusObra) => void;
  renderizarAcoesObra?: (obraId: number) => ReactNode;
}

export interface KanbanTaskDrawerProps {
  card: ObraKanbanCard | null;
  isOpen: boolean;
  onClose: () => void;
  onMoverCard?: (card: ObraKanbanCard, novoStatus: StatusObra) => void;
  renderizarAcoesObra?: (obraId: number) => ReactNode;
  detalheObra?: ObraDetalheKanban;
  carregandoDetalhe?: boolean;
  erroDetalhe?: boolean;
  equipeAlocada?: EquipeAlocadaResumo | null;
  temAlocacaoAtiva?: boolean;
  historico?: HistoricoItemKanban[];
  carregandoHistorico?: boolean;
  comentarios?: ComentarioItemKanban[];
  carregandoComentarios?: boolean;
  onSalvarObra?: (id: number, payload: EditarObraKanbanPayload) => Promise<void>;
  isSalvandoObra?: boolean;
  onExcluirObra?: (id: number) => Promise<void>;
  isExcluindoObra?: boolean;
  onAdicionarComentario?: (id: number, texto: string, tipo?: TipoComentario) => Promise<void>;
  onEditarComentario?: (id: number, texto: string) => Promise<void>;
  onExcluirComentario?: (id: number) => Promise<void>;
  erroComentarios?: Error | null;
  onRecarregarComentarios?: () => void;
  isEnviandoComentario?: boolean;
  focoRetorno?: () => HTMLElement | null;
  totalMateriais?: number;
  renderAbaMateriais?: (obraId: number) => ReactNode;
  renderSecaoEquipe?: (canEdit: boolean) => ReactNode;
}

export type ComentariosObraProps = Pick<KanbanTaskDrawerProps,
  "comentarios" | "carregandoComentarios" | "onAdicionarComentario" | "onEditarComentario" |
  "onExcluirComentario" | "isEnviandoComentario" | "erroComentarios" | "onRecarregarComentarios"> & { obraId: number; canEdit?: boolean };
