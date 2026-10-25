import { create } from "zustand";
import { invalidarSessaoOperacional, sincronizarSessaoOperacional } from "@/shared/lib/sessaoOperacao";
import { persist, createJSONStorage } from "zustand/middleware";
import type { Usuario } from "@/types";
import type { AuthState } from "../types/auth";

function calcularFallback480Min(): string {
  return new Date(Date.now() + 480 * 60 * 1000).toISOString();
}

function migrarEstadoLegado(): void {
  if (typeof window === "undefined") return;
  try {
    const authStorage = localStorage.getItem("auth-storage");
    if (authStorage) {
      try {
        const parsed = JSON.parse(authStorage) as {
          state?: { token?: string | null; usuario?: Usuario | null; expiresAt?: string | null };
        };
        // Se existir sessão com token mas sem expiresAt, injeta deterministamente o fallback
        if (parsed?.state && parsed.state.token && !parsed.state.expiresAt) {
          parsed.state.expiresAt = calcularFallback480Min();
          localStorage.setItem("auth-storage", JSON.stringify(parsed));
        }
      } catch {
        // Ignora JSON corrompido
      }
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
          state: {
            token: tokenLegado || null,
            usuario: usuarioLegado,
            expiresAt: calcularFallback480Min(),
          },
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
      expiresAt: null,
      login: (token, usuario, expiresAt) => {
        const expiracaoValida =
          expiresAt && !Number.isNaN(new Date(expiresAt).getTime())
            ? expiresAt
            : calcularFallback480Min();

        invalidarSessaoOperacional();
        set({ token, usuario, expiresAt: expiracaoValida });
      },
      logout: () => {
        // Encerramento puramente em estado (SPA); sem recarga imperativa de window.location.href
        invalidarSessaoOperacional();
        set({ token: null, usuario: null, expiresAt: null });
      },
    }),
    {
      name: "auth-storage",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        token: state.token,
        usuario: state.usuario,
        expiresAt: state.expiresAt,
      }),
    }
  )
);

sincronizarSessaoOperacional(useAuthStore.getState());
useAuthStore.subscribe(sincronizarSessaoOperacional);
