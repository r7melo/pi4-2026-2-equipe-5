import type { ReactNode } from "react";
import { RoleGate } from "./RoleGate";
import type { NomePerfil } from "@/types";

export interface RequireRoleProps {
  allowedRoles: NomePerfil[];
  children: ReactNode;
}

export function RequireRole({ allowedRoles, children }: RequireRoleProps) {
  return <RoleGate allowedRoles={allowedRoles}>{children}</RoleGate>;
}

export default RequireRole;

