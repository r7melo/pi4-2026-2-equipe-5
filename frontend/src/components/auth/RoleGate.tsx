import type { ReactNode } from "react";
import { useAuthStore } from "@/stores/useAuthStore";
import type { NomePerfil } from "@/types";

interface RoleGateProps {
  allowedRoles: NomePerfil[];
  children: ReactNode;
}

export function RoleGate({ allowedRoles, children }: RoleGateProps) {
  const perfil = useAuthStore((s) => s.usuario?.perfil?.nomePerfil);
  if (!perfil || !allowedRoles.includes(perfil)) return null;
  return <>{children}</>;
}
