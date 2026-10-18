import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { TemaSistema, ThemeUIState } from "@/types";

export function resolverTemaEfetivo(tema: TemaSistema): "light" | "dark" {
  if (tema === "system" && typeof window !== "undefined") {
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }
  return tema === "dark" ? "dark" : "light";
}

export function aplicarTemaNoDOM(tema: TemaSistema): void {
  if (typeof document === "undefined") return;
  const efetivo = resolverTemaEfetivo(tema);
  const isDark = efetivo === "dark";

  document.documentElement.classList.toggle("dark", isDark);

  const metaThemeColor = document.querySelector('meta[name="theme-color"]');
  if (metaThemeColor) {
    metaThemeColor.setAttribute("content", isDark ? "#090d16" : "#0f172a");
  }
}

export const useThemeStore = create<ThemeUIState>()(
  persist(
    (set, get) => ({
      tema: "light",
      setTema: (tema) => {
        aplicarTemaNoDOM(tema);
        set({ tema });
      },
      alternarTema: () => {
        const atualEfetivo = resolverTemaEfetivo(get().tema);
        const proximo: TemaSistema = atualEfetivo === "dark" ? "light" : "dark";
        aplicarTemaNoDOM(proximo);
        set({ tema: proximo });
      },
    }),
    {
      name: "zl-theme-storage",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ tema: state.tema }),
      onRehydrateStorage: () => (state) => {
        aplicarTemaNoDOM(state?.tema ?? "light");
      },
    }
  )
);
