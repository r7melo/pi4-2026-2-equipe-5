// Constantes de perfis RBAC (RF-02)
import type { NomePerfil } from "@/types";

export const PERFIS = {
  ADMIN: "Administrador" as NomePerfil,
  ENGENHARIA: "Engenharia" as NomePerfil,
  FINANCEIRO: "Financeiro" as NomePerfil,
  INSTALADOR: "InstaladorCampo" as NomePerfil,
} as const;

/** Lista de todos os perfis para iteração em UIs de administração */
export const TODOS_PERFIS: NomePerfil[] = Object.values(PERFIS);
