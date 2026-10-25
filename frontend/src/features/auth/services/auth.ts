import axios from "axios";
import { api, ApiErro } from "@/shared/api/api";
import type { LoginResposta, Usuario, NomePerfil } from "@/types";

const PERFIS_PADRAO: Record<NomePerfil, { id: number; permissoes: string[] }> = {
  Administrador: { id: 1, permissoes: ["*"] },
  Engenharia: { id: 2, permissoes: ["obras:criar", "obras:mover", "programacoes:editar"] },
  Financeiro: { id: 3, permissoes: ["financeiro:visualizar", "relatorios:visualizar"] },
  InstaladorCampo: { id: 4, permissoes: ["obras:visualizar", "materiais:confirmar"] },
};

// O banco/backend chamam o perfil de "EngenhariaObras"; a interface usa "Engenharia".
function normalizarPerfil(perfil: string): NomePerfil {
  return (perfil === "EngenhariaObras" ? "Engenharia" : perfil) as NomePerfil;
}

export function mapearRespostaParaUsuario(dados: LoginResposta["usuario"]): Usuario {
  const nomePerfil = normalizarPerfil(dados.perfil);
  const configPerfil = PERFIS_PADRAO[nomePerfil] || { id: 1, permissoes: [] };

  return {
    id: dados.id,
    nome: dados.nome,
    email: dados.email,
    perfil: {
      id: configPerfil.id,
      nomePerfil: nomePerfil,
      permissoes: configPerfil.permissoes,
    },
    equipeId: dados.equipeId,
  };
}

// Autenticação HTTP (RF-01 / CT-01)
export async function fazerLogin(email: string, senha: string): Promise<LoginResposta> {
  try {
    const { data } = await api.post<LoginResposta>("/auth/login", { email, senha });
    return data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      const status = error.response.status;
      const erroData = error.response.data as { error?: { code?: string; message?: string } } | undefined;
      const codigo = erroData?.error?.code || "";

      if (status === 401 || codigo === "INVALID_CREDENTIALS") {
        throw new ApiErro(401, "INVALID_CREDENTIALS", "E-mail ou senha incorretos");
      }
      if (status === 423 || codigo === "ACCOUNT_LOCKED") {
        throw new ApiErro(423, "ACCOUNT_LOCKED", "Conta temporariamente bloqueada por excesso de tentativas. Tente novamente mais tarde.");
      }
      throw new ApiErro(
        status,
        codigo || "ERRO_LOGIN",
        erroData?.error?.message || "Erro ao efetuar login. Tente novamente."
      );
    }
    throw new Error("Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente.", { cause: error });
  }
}

export async function buscarUsuarioLogado(): Promise<Usuario> {
  const { data } = await api.get<Usuario>("/auth/me");
  return { ...data, perfil: { ...data.perfil, nomePerfil: normalizarPerfil(data.perfil.nomePerfil) } };
}

export async function fazerLogout(): Promise<void> {
  try {
    await api.post("/auth/logout");
  } catch {
    // Silencia falha de rede para não impedir a saída do usuário na UI
  }
}
