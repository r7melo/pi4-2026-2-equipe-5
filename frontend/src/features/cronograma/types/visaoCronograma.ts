import type { SetStateAction } from "react";
import type { GanttFiltrosAvancados, CategoriaObraGantt } from "@/features/cronograma/types/gantt";
import type { Programacao } from "@/shared/types/programacoes";
import type { Equipe } from "@/features/cronograma/types/equipes";

export type { CategoriaObraGantt };

/**
 * Resumo estrutural mínimo de obra para o contexto do cronograma Gantt.
 * Recebe somente os campos efetivamente consumidos pela visualização e filtros,
 * evitando acoplamento físico com os DTOs completos de obras.
 */
export interface ObraGanttResumo {
  id: number | string;
  clienteNome?: string;
  categoria?: string;
  status?: string;
  atualizadoPor?: string;
  quantidadePaineis?: number;
  dataFimEstimada?: string;
}

/**
 * Parecer estrutural mínimo de homologação da obra.
 */
export interface HomologacaoGanttResumo {
  parecerAcesso?: string | null;
  artTrt?: string;
  prazoVistoria?: string;
}

/**
 * Mapa indexado de homologações por id da obra.
 */
export type MapaHomologacoesGantt = Record<number, HomologacaoGanttResumo | undefined>;

/**
 * Parâmetros para transformação de dados brutos nas tarefas hierárquicas do Gantt.
 */
export interface TransformarTarefasGanttParams {
  programacoesVisiveis: Programacao[] | null | undefined;
  equipes: Equipe[] | null | undefined;
  obras: ObraGanttResumo[] | null | undefined;
  homologacoesMap?: MapaHomologacoesGantt | null;
}

/**
 * Parâmetros de entrada do hook useGanttFiltros.
 */
export interface UseGanttFiltrosParams {
  programacoes?: Programacao[];
  obras?: ObraGanttResumo[];
  equipes?: Equipe[];
  podeUsarInterface?: () => boolean;
}

/**
 * Interface de retorno do hook useGanttFiltros.
 */
export interface UseGanttFiltrosRetorno {
  hojeISO: string;
  filtros: GanttFiltrosAvancados;
  setFiltros: (atualizacao: SetStateAction<GanttFiltrosAvancados>) => void;
  atualizarFiltros: (atualizacao: SetStateAction<GanttFiltrosAvancados>) => void;
  totalFiltrosAtivos: number;
  programacoesFiltradas: Programacao[];
}

/**
 * Interface de retorno do hook useEquipesOverlays.
 */
export interface EquipesOverlaysRetorno {
  drawerFiltrosAberto: boolean;
  setDrawerFiltrosAberto: (aberto: boolean) => void;
  modalNovaAlocacaoAberto: boolean;
  setModalNovaAlocacaoAberto: (aberto: boolean) => void;
  modalNovaEquipeAberto: boolean;
  setModalNovaEquipeAberto: (aberto: boolean) => void;
  modalCompartilharAberto: boolean;
  setModalCompartilharAberto: (aberto: boolean) => void;
  tarefaSelecionadaId: number | null;
  setTarefaSelecionadaId: (id: number | null) => void;
}
