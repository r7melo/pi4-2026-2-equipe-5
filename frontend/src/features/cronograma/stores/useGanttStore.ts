import { z } from "zod";
import { MOCK_ATIVO } from "@/shared/lib/modoApi";
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

if (!MOCK_ATIVO) migrarZoomLegado();

export const useGanttStore = create<GanttUIState>()(
  persist(
    (set) => ({
      nivelZoom: (() => {
        if (!MOCK_ATIVO) return "day";
        try {
          const bruto: unknown = JSON.parse(localStorage.getItem("gantt-storage") ?? "null");
          const parsed = z.object({ state: z.object({ nivelZoom: z.enum(["day", "week", "month"]) }) }).safeParse(bruto);
          const salvo = parsed.success ? parsed.data.state.nivelZoom : localStorage.getItem("gantt_nivel_zoom");
          return salvo === "day" || salvo === "week" || salvo === "month" ? salvo : "day";
        } catch { return "day"; }
      })(),
      setNivelZoom: (nivel) => set({ nivelZoom: nivel }),
      filtrosSalvos: null,
      salvarFiltros: (filtros) => set({ filtrosSalvos: filtros }),
      limparFiltrosSalvos: () => set({ filtrosSalvos: null }),
    }),
    {
      name: MOCK_ATIVO ? "mock_gantt_ui_v1" : "gantt-storage",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        nivelZoom: state.nivelZoom,
        filtrosSalvos: state.filtrosSalvos,
      }),
    }
  )
);
