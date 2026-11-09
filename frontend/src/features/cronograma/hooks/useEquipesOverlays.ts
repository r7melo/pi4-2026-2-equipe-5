import { useState, useCallback } from "react";
import type { EquipesOverlaysRetorno } from "@/features/cronograma/types/visaoCronograma";

/**
 * Hook customizado para centralizar a abertura e fechamento dos 5 overlays do Gantt
 * (Drawer de Filtros, Modal de Nova Alocação, Modal de Nova Equipe, Modal de Compartilhamento e Drawer de Tarefa),
 * preservando estritamente os protocolos reativos de descarte em tempo de render:
 * - epochRender: fecha incondicionalmente todos os 5 overlays e reseta tarefaSelecionadaId = null.
 * - sessaoRender: fecha exclusivamente o modalCompartilharAberto, sem afetar os outros 4 overlays.
 */
export function useEquipesOverlays(
  epochRender: number,
  sessaoRender: number
): EquipesOverlaysRetorno {
  const [drawerFiltrosAberto, setDrawerFiltrosAberto] = useState(false);
  const [modalNovaAlocacaoAberto, setModalNovaAlocacaoAberto] = useState(false);
  const [modalNovaEquipeAberto, setModalNovaEquipeAberto] = useState(false);
  const [modalCompartilharAberto, setModalCompartilharAberto] = useState(false);
  const [sessaoCompartilhamento, setSessaoCompartilhamento] = useState(sessaoRender);

  if (sessaoCompartilhamento !== sessaoRender) {
    setSessaoCompartilhamento(sessaoRender);
    setModalCompartilharAberto(false);
  }

  const [tarefaSelecionadaId, setTarefaSelecionadaId] = useState<number | null>(null);
  const [epochOverlays, setEpochOverlays] = useState(epochRender);

  if (epochOverlays !== epochRender) {
    setEpochOverlays(epochRender);
    setDrawerFiltrosAberto(false);
    setModalNovaAlocacaoAberto(false);
    setModalNovaEquipeAberto(false);
    setModalCompartilharAberto(false);
    setTarefaSelecionadaId(null);
  }

  const fecharTodosOverlays = useCallback(() => {
    setDrawerFiltrosAberto(false);
    setModalNovaAlocacaoAberto(false);
    setModalNovaEquipeAberto(false);
    setModalCompartilharAberto(false);
    setTarefaSelecionadaId(null);
  }, []);

  return {
    drawerFiltrosAberto,
    setDrawerFiltrosAberto,
    modalNovaAlocacaoAberto,
    setModalNovaAlocacaoAberto,
    modalNovaEquipeAberto,
    setModalNovaEquipeAberto,
    modalCompartilharAberto,
    setModalCompartilharAberto,
    tarefaSelecionadaId,
    setTarefaSelecionadaId,
    fecharTodosOverlays,
  };
}
