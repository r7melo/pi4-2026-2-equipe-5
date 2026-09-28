import { create } from "zustand";
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

export const useAuthStore = create<AuthState>((set) => ({
  token: typeof window !== "undefined" ? localStorage.getItem("token") : null,
  usuario: (() => {
    if (typeof window === "undefined") return null;
    try {
      const salvo = localStorage.getItem("usuario");
      return salvo ? (JSON.parse(salvo) as Usuario) : null;
    } catch {
      return null;
    }
  })(),
  login: (token, usuario) => {
    localStorage.setItem("token", token);
    localStorage.setItem("usuario", JSON.stringify(usuario));
    set({ token, usuario });
  },
  logout: () => {
    localStorage.removeItem("token");
    localStorage.removeItem("usuario");
    set({ token: null, usuario: null });
    window.location.href = "/login";
  },
}));
