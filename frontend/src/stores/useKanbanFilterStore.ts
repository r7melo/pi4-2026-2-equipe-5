import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export interface KanbanFilterState {
  busca: string;
  categoriaFiltro: string;
  materialFiltro: string;
  exibirArquivadas: boolean;
  setBusca: (busca: string) => void;
  setCategoriaFiltro: (categoria: string) => void;
  setMaterialFiltro: (material: string) => void;
  setExibirArquivadas: (exibir: boolean) => void;
  limparFiltros: () => void;
}

export const useKanbanFilterStore = create<KanbanFilterState>()(
  persist(
    (set) => ({
      busca: "",
      categoriaFiltro: "",
      materialFiltro: "",
      exibirArquivadas: false,
      setBusca: (busca) => set({ busca }),
      setCategoriaFiltro: (categoriaFiltro) => set({ categoriaFiltro }),
      setMaterialFiltro: (materialFiltro) => set({ materialFiltro }),
      setExibirArquivadas: (exibirArquivadas) => set({ exibirArquivadas }),
      limparFiltros: () =>
        set({
          busca: "",
          categoriaFiltro: "",
          materialFiltro: "",
          exibirArquivadas: false,
        }),
    }),
    {
      name: "kanban-filter-storage",
      storage: createJSONStorage(() => sessionStorage),
      partialize: (state) => ({
        busca: state.busca,
        categoriaFiltro: state.categoriaFiltro,
        materialFiltro: state.materialFiltro,
        exibirArquivadas: state.exibirArquivadas,
      }),
    }
  )
);
