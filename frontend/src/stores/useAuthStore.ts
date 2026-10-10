import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { NomePerfil } from "@/types";

export interface UsuarioPerfil {
  id: number;
  nomePerfil: NomePerfil;
  permissoes: string[];
}

export interface Usuario {
  id: number;
  nome: string;
  email: string;
  perfil: UsuarioPerfil;
  equipeId: number | null;
}

interface AuthState {
  token: string | null;
  usuario: Usuario | null;
  login: (token: string, usuario: Usuario) => void;
  logout: () => void;
}

// Migração defensiva ativa: se houver chave nova, garante precedência e expurga resíduos;
// se houver apenas chaves legadas, migra estruturado para "auth-storage" imediatamente.
function migrarEstadoLegado(): void {
  if (typeof window === "undefined") return;
  try {
    const authStorage = localStorage.getItem("auth-storage");
    if (authStorage) {
      // Chave moderna já existe: expurga qualquer resíduo legado antigo
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
          // Ignora JSON legado se corrompido
        }
      }
      // Cria a estrutura canônica do Zustand persist
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
    // Silencia eventuais restrições de storage em modo anônimo estrito
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
        window.location.href = "/login";
      },
    }),
    {
      name: "auth-storage",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ token: state.token, usuario: state.usuario }),
    }
  )
);
