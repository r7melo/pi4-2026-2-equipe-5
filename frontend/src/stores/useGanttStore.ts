// frontend/src/stores/useGanttStore.ts
// Store Zustand para UI State do Gantt com persistência declarativa em localStorage
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { NivelZoom } from "@/components/gantt/GanttToolbar";
import type { CategoriaObra } from "@/types";
import type { StatusObra } from "@/constants/kanbanStatus";

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

// Migração defensiva ativa do zoom legado para a chave moderna "gantt-storage"
function migrarZoomLegado(): void {
  if (typeof window === "undefined") return;
  try {
    if (localStorage.getItem("gantt-storage")) {
      localStorage.removeItem("gantt_nivel_zoom");
      return;
    }
    const salvo = localStorage.getItem("gantt_nivel_zoom");
    if (salvo === "day" || salvo === "week" || salvo === "month") {
      localStorage.setItem(
        "gantt-storage",
        JSON.stringify({
          state: { nivelZoom: salvo },
          version: 0,
        })
      );
      localStorage.removeItem("gantt_nivel_zoom");
    }
  } catch {
    // Silencia restrições de storage
  }
}

migrarZoomLegado();

export const useGanttStore = create<GanttUIState>()(
  persist(
    (set) => ({
      nivelZoom: "day",
      setNivelZoom: (nivel) => set({ nivelZoom: nivel }),
      filtrosSalvos: null,
      salvarFiltros: (filtros) => set({ filtrosSalvos: filtros }),
      limparFiltrosSalvos: () => set({ filtrosSalvos: null }),
    }),
    {
      name: "gantt-storage",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        nivelZoom: state.nivelZoom,
        filtrosSalvos: state.filtrosSalvos,
      }),
    }
  )
);
