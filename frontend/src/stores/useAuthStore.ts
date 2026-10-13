import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { Usuario } from "@/types";

interface AuthState {
  token: string | null;
  usuario: Usuario | null;
  login: (token: string, usuario: Usuario) => void;
  logout: () => void;
}

function migrarEstadoLegado(): void {
  if (typeof window === "undefined") return;
  try {
    const authStorage = localStorage.getItem("auth-storage");
    if (authStorage) {
      localStorage.removeItem("token");
      localStorage.removeItem("usuario");
      return;
    }

    const tokenLegado = localStorage.getItem("token");
    const usuarioLegadoStr = localStorage.getItem("usuario");
    if (tokenLegado || usuarioLegadoStr) {
      let usuarioLegado: Usuario | null = null;
      if (usuarioLegadoStr) {
        try {
          usuarioLegado = JSON.parse(usuarioLegadoStr) as Usuario;
        } catch {
          // Ignora JSON corrompido
        }
      }
      localStorage.setItem(
        "auth-storage",
        JSON.stringify({
          state: { token: tokenLegado || null, usuario: usuarioLegado },
          version: 0,
        })
      );
      localStorage.removeItem("token");
      localStorage.removeItem("usuario");
    }
  } catch {
    // Silencia restrições de storage
  }
}

migrarEstadoLegado();

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      usuario: null,
      login: (token, usuario) => {
        set({ token, usuario });
      },
      logout: () => {
        set({ token: null, usuario: null });
        if (typeof window !== "undefined") {
          window.location.href = "/login";
        }
      },
    }),
    {
      name: "auth-storage",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ token: state.token, usuario: state.usuario }),
    }
  )
);
