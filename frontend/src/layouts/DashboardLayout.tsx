import { useState } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "@/components/Sidebar";
import { SidebarProvider } from "@/contexts/SidebarProvider";
import { HeaderPortalContext } from "@/contexts/HeaderPortalContext";
import { useSignalR } from "@/hooks/useSignalR";

export default function DashboardLayout() {
  useSignalR();
  const [headerNode, setHeaderNode] = useState<HTMLElement | null>(null);


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
