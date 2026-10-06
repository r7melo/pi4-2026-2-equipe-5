import { useState, useEffect } from "react";
import { Outlet, Navigate } from "react-router-dom";
import Sidebar from "@/components/Sidebar";
import { SidebarProvider } from "@/contexts/SidebarProvider";
import { HeaderPortalContext } from "@/contexts/HeaderPortalContext";
import { useSignalR } from "@/hooks/useSignalR";
import { useAuthStore } from "@/stores/useAuthStore";
import { toast } from "sonner";

export default function DashboardLayout() {
  const perfil = useAuthStore((s) => s.usuario?.perfil?.nomePerfil);
  useSignalR();
  const [headerNode, setHeaderNode] = useState<HTMLElement | null>(null);

  useEffect(() => {
    if (perfil === "InstaladorCampo") {
      toast.error(
        "Acesso Proibido: o perfil Instalador de Campo possui acesso exclusivo à interface móvel."
      );
    }
  }, [perfil]);

  // Instaladores de campo têm interface móvel exclusiva fora do layout desktop
  if (perfil === "InstaladorCampo") {
    return <Navigate to="/linkparainstaladores" replace />;
  }


  return (
    <SidebarProvider>
      <HeaderPortalContext.Provider value={headerNode}>
        <div className="h-screen w-full flex flex-col overflow-hidden bg-background-app font-sans">
          {/* Header Completo no Topo (100% de largura) */}
          <header
            id="dashboard-header-slot"
            ref={setHeaderNode}
            className="h-14 w-full bg-white border-b border-slate-200 px-4 md:px-6 flex items-center justify-between shrink-0 z-10 relative"
          />

          {/* Área Inferior: Sidebar na esquerda, Conteúdo na direita */}
          <div className="flex flex-1 overflow-hidden">
            <Sidebar />
            <div className="flex-1 flex flex-col overflow-hidden min-w-0">
              <Outlet />
            </div>
          </div>
        </div>
      </HeaderPortalContext.Provider>
    </SidebarProvider>
  );
}
