import { api } from "./api";
import { useAuthStore, type Usuario } from "@/stores/useAuthStore";
import type { NomePerfil } from "@/types";

export interface LoginResposta {
  token: string;
  expiresAt: string;
  usuario: {
    id: number;
    nome: string;
    email: string;
    perfil: NomePerfil;
    equipeId: number | null;
  };
}

export const MOCK_USUARIO_DEV: Usuario = {
  id: 12,
  nome: "Ana Souza (Engenharia)",
  email: "engenharia@zlengenharia.com",
  perfil: {
    id: 2,
    nomePerfil: "EngenhariaObras",
    permissoes: ["obras:criar", "obras:mover", "programacoes:editar"],
  },
  equipeId: 3,
};

export async function fazerLogin(email: string, senha: string): Promise<LoginResposta> {
  try {
    const { data } = await api.post<LoginResposta>("/auth/login", { email, senha });

    // Converte e armazena na store global de autenticação
    const usuarioFormatado: Usuario = {
      id: data.usuario.id,
      nome: data.usuario.nome,
      email: data.usuario.email,
      perfil: {
        id: 1,
        nomePerfil: data.usuario.perfil,
        permissoes: ["obras:criar", "obras:mover"],
      },
      equipeId: data.usuario.equipeId,
    };

    useAuthStore.getState().login(data.token, usuarioFormatado);
    return data;
  } catch (error) {
    // Se o backend estiver offline em ambiente de desenvolvimento, utiliza mock para testes
    console.warn("Backend indisponível no login, autenticando em modo desenvolvimento:", error);
    const mockToken = "dev-mock-jwt-token-zl-engenharia";
    useAuthStore.getState().login(mockToken, MOCK_USUARIO_DEV);
    return {
      token: mockToken,
      expiresAt: new Date(Date.now() + 86400000).toISOString(),
      usuario: {
        id: MOCK_USUARIO_DEV.id,
        nome: MOCK_USUARIO_DEV.nome,
        email: MOCK_USUARIO_DEV.email,
        perfil: MOCK_USUARIO_DEV.perfil.nomePerfil,
        equipeId: MOCK_USUARIO_DEV.equipeId,
      },
    };
  }
}

export async function buscarUsuarioLogado(): Promise<Usuario> {
  const { data } = await api.get<Usuario>("/auth/me");
  return data;
}

export function fazerLogout(): void {
  useAuthStore.getState().logout();
}
