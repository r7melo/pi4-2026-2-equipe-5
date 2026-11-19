// Perfis RBAC (RF-02).
export const NOMES_PERFIS = [
  "Administrador", "Engenharia", "Financeiro", "InstaladorCampo",
] as const;

export const ROTULOS_PERFIS: Record<(typeof NOMES_PERFIS)[number], string> = {
  Administrador: "Administrador",
  Engenharia: "Engenharia",
  Financeiro: "Financeiro",
  InstaladorCampo: "Instalador de Campo",
};
