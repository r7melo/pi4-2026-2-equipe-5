import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { GanttUIState } from "@/types";

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
