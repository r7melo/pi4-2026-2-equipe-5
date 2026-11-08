import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuthStore } from "@/features/auth/stores/useAuthStore";
import type { NomePerfil } from "@/types";

interface ProtectedRouteProps {
  allowedRoles?: NomePerfil[];
}

export function ProtectedRoute({ allowedRoles }: ProtectedRouteProps = {}) {
  const token = useAuthStore((s) => s.token);
  const perfil = useAuthStore((s) => s.usuario?.perfil?.nomePerfil);
  const location = useLocation();

  if (!token) {
    return (
      <Navigate
        to="/login"
        state={location.pathname.replace(/\/+$/, "") === "/sem-permissao" ? undefined : { from: location.pathname + location.search }}
        replace
      />
    );
  }

  // Segurança (Fail Closed): Se exige role, mas o perfil é indefinido ou não autorizado -> Bloqueia.
  if (allowedRoles) {
    if (!perfil || !allowedRoles.includes(perfil)) {
      return location.pathname !== "/sem-permissao" ? (
        <Navigate to="/sem-permissao" state={{ de: location.pathname }} replace />
      ) : <Outlet />;
    }
  }

  return <Outlet />;
}

export default ProtectedRoute;
