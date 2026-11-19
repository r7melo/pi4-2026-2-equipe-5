import type { NomePerfil } from "@/shared/types/autorizacao";

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
