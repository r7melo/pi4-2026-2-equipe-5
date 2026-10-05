// frontend/src/stores/useGanttStore.ts
// Store Zustand para UI State do Gantt com persistência em localStorage
import { create } from "zustand";
import type { NivelZoom } from "@/components/gantt/GanttToolbar";

const STORAGE_KEY_ZOOM = "gantt_nivel_zoom";

export interface GanttUIState {
  nivelZoom: NivelZoom;
  setNivelZoom: (nivel: NivelZoom) => void;
}

function obterNivelZoomSalvo(): NivelZoom {
  if (typeof window === "undefined") return "day";
  try {
    const salvo = localStorage.getItem(STORAGE_KEY_ZOOM);
    if (salvo === "day" || salvo === "week" || salvo === "month") {
      return salvo;
    }
  } catch {
    // Silencia erro de leitura no storage
  }
  return "day"; // Padrão inicial: Dias
}

export const useGanttStore = create<GanttUIState>((set) => ({
  nivelZoom: obterNivelZoomSalvo(),
  setNivelZoom: (nivel) => {
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(STORAGE_KEY_ZOOM, nivel);
      } catch {
        // Silencia erro de escrita no storage
      }
    }
    set({ nivelZoom: nivel });
  },
}));
