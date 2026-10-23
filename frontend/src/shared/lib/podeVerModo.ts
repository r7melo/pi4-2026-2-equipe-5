export function podeVerModo(perfil: string | null | undefined): boolean {
  return perfil === "Administrador" || perfil === "Engenharia" || perfil === "Financeiro";
}
