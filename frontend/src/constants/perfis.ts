// Constantes de perfis RBAC (RF-02) — Fonte única de verdade
import type { NomePerfil } from "@/types";

export const PERFIS = {
  ADMIN: "Administrador" as NomePerfil,
  ENGENHARIA: "EngenhariaObras" as NomePerfil,
  FINANCEIRO: "Financeiro" as NomePerfil,
  LEITOR: "VisualizadorLeitor" as NomePerfil,
  INSTALADOR: "InstaladorCampo" as NomePerfil,
} as const;

/** Lista de todos os perfis para iteração em UIs de administração */
export const TODOS_PERFIS: NomePerfil[] = Object.values(PERFIS);
