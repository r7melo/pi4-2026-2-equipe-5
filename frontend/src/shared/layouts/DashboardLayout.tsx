import { useState, useLayoutEffect } from "react";
import { ModoDisplayProvider, useModoDisplay } from "@/shared/contexts/ModoDisplayContext";
import { SeloModoDisplay } from "@/shared/components/display/SeloModoDisplay";
import { podeVerModo } from "@/shared/lib/podeVerModo";
import { useSidebar } from "@/shared/contexts/SidebarContext";
import { Outlet, Navigate, useLocation } from "react-router-dom";
import { perfilEscritorio } from "@/shared/lib/rotasSessao";
import Sidebar from "./Sidebar";
import { SidebarProvider } from "@/shared/contexts/SidebarProvider";
import { HeaderPortalContext } from "@/shared/contexts/HeaderPortalContext";
import { SignalRProvider } from "@/shared/contexts/SignalRContext";
import { useAuthStore } from "@/features/auth/stores/useAuthStore";

export default function DashboardLayout() {
  const perfil = useAuthStore((s) => s.usuario?.perfil?.nomePerfil);
  const location = useLocation();
  const token = useAuthStore((s) => s.token);
  const [headerNode, setHeaderNode] = useState<HTMLElement | null>(null);

  if (!perfilEscritorio(perfil)) {
    return <Navigate to="/sem-permissao" state={{ de: location.pathname }} replace />;
  }

  return (
    <SignalRProvider>
      <SidebarProvider>
        <ModoDisplayProvider autorizado={Boolean(token) && podeVerModo(perfil)} identidadeSessao={token} perfil={perfil}>
        <HeaderPortalContext.Provider value={headerNode}>
          <DashboardConteudo onHeader={setHeaderNode} />
        </HeaderPortalContext.Provider>
        </ModoDisplayProvider>
      </SidebarProvider>
    </SignalRProvider>
  );
}

function DashboardConteudo({ onHeader }: { onHeader: (no: HTMLElement | null) => void }) {
  const { ativo } = useModoDisplay();
  const { closeMobile } = useSidebar();
  useLayoutEffect(() => {
    if (ativo) closeMobile();
  }, [ativo, closeMobile]);
  return (
    <div className="h-screen w-full flex flex-col overflow-hidden bg-background-app font-sans">
      <header id="dashboard-header-slot" ref={onHeader}
        className="h-14 w-full bg-surface border-b border-border-subtle px-4 md:px-6 flex items-center justify-between shrink-0 z-10 relative" />
      <div className="flex flex-1 overflow-hidden">
        {!ativo && <Sidebar />}
        <div className="flex-1 flex flex-col overflow-hidden min-w-0"><Outlet /></div>
      </div>
      {ativo && <SeloModoDisplay />}
    </div>
  );
}

