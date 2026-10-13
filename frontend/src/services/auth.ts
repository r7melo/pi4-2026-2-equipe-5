import { api } from "./api";
import type { LoginResposta, Usuario, NomePerfil } from "@/types";

const PERFIS_PADRAO: Record<NomePerfil, { id: number; permissoes: string[] }> = {
  Administrador: { id: 1, permissoes: ["*"] },
  EngenhariaObras: { id: 2, permissoes: ["obras:criar", "obras:mover", "programacoes:editar"] },
  Financeiro: { id: 3, permissoes: ["financeiro:visualizar", "relatorios:visualizar"] },
  InstaladorCampo: { id: 4, permissoes: ["obras:visualizar", "materiais:confirmar"] },
};

export function mapearRespostaParaUsuario(dados: LoginResposta["usuario"]): Usuario {
  const configPerfil = PERFIS_PADRAO[dados.perfil] || { id: 1, permissoes: [] };
  return {
    id: dados.id,
    nome: dados.nome,
    email: dados.email,
    perfil: {
      id: configPerfil.id,
      nomePerfil: dados.perfil,
      permissoes: configPerfil.permissoes,
    },
    equipeId: dados.equipeId,
  };
}

// Autenticação HTTP (RF-01)
export async function fazerLogin(email: string, senha: string): Promise<LoginResposta> {
  const { data } = await api.post<LoginResposta>("/auth/login", { email, senha });
  return data;
}

export async function buscarUsuarioLogado(): Promise<Usuario> {
  const { data } = await api.get<Usuario>("/auth/me");
  return data;
}

export async function fazerLogout(): Promise<void> {
  try {
    await api.post("/auth/logout");
  } catch {
    // Silencia falha de rede para não impedir a saída do usuário na UI
  }
}
