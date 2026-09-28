import { create } from "zustand";

export interface KanbanUIState {
  activeCardId: string | null;
  setActiveCard: (id: string | null) => void;
}

/**
 * Store exclusivo para UI transitória do Kanban (DnD).
 * O Server State (dados de obras, listagem, mutações e cache)
 * é gerenciado exclusivamente pelo TanStack Query (useObras e useMoverCard).
 */
export const useKanbanStore = create<KanbanUIState>((set) => ({
  activeCardId: null,
  setActiveCard: (id) => set({ activeCardId: id }),
}));
