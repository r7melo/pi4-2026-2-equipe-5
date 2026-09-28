import { Navigate, Outlet } from "react-router-dom";
import { ShieldAlert } from "lucide-react";
import { useAuthStore } from "@/stores/useAuthStore";
import type { NomePerfil } from "@/types";

interface ProtectedRouteProps {
  allowedRoles?: NomePerfil[];
}

export function ProtectedRoute({ allowedRoles }: ProtectedRouteProps = {}) {
  const token = useAuthStore((s) => s.token);
  const perfil = useAuthStore((s) => s.usuario?.perfil?.nomePerfil);

  if (!token) return <Navigate to="/login" replace />;

  // Segurança (Fail Closed): Se exige role, mas o perfil é indefinido ou não autorizado -> Bloqueia.
  if (allowedRoles) {
    if (!perfil || !allowedRoles.includes(perfil)) {
      return (
        <div className="flex-1 flex flex-col items-center justify-center h-full p-6 text-center">
          <div className="w-14 h-14 rounded-full bg-red-50 text-red-500 flex items-center justify-center mb-4">
            <ShieldAlert className="w-7 h-7" />
          </div>
          <h2 className="text-2xl font-bold text-slate-800">403 - Acesso Negado</h2>
          <p className="text-slate-500 mt-2 max-w-md">
            Você não tem permissão para visualizar esta página.
          </p>
        </div>
      );
    }
  }

  return <Outlet />;
}

export default ProtectedRoute;
