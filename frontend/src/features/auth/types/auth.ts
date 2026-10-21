// Tipos do domínio de Autenticação e Perfis (RF-01, RF-02)
export type NomePerfil =
  | "Administrador"
  | "Engenharia"
  | "Financeiro"
  | "InstaladorCampo";

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

export interface AuthState {
  token: string | null;
  usuario: Usuario | null;
  expiresAt: string | null;
  login: (token: string, usuario: Usuario, expiresAt?: string) => void;
  logout: () => void;
}
