import { useNavigate, useLocation } from "react-router-dom";
import { 
  LogOut, 
  LayoutDashboard, 
  Users, 
  FileCheck, 
  DollarSign, 
  BarChart2, 
  Settings,
  ChevronLeft,
  ChevronRight,
  Menu,
  X
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useSidebar } from "@/contexts/SidebarContext";
import { useAuthStore } from "@/stores/useAuthStore";
import type { NomePerfil } from "@/types";

// Botão Hambúrguer para acionar a Sidebar no Mobile
export function SidebarTrigger({ className }: { className?: string }) {
  const { toggleMobile, isMobileOpen } = useSidebar();

  return (
    <button
      onClick={toggleMobile}
      aria-label="Abrir menu lateral"
      aria-expanded={isMobileOpen}
      className={cn(
        "p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-slate-400 cursor-pointer",
        className
      )}
    >
      <Menu className="w-5 h-5" />
    </button>
  );
}

export default function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isCollapsed, toggleCollapse, isMobileOpen, closeMobile } = useSidebar();

  interface NavItem {
    label: string;
    path: string;
    icon: typeof LayoutDashboard;
    roles: NomePerfil[];
  }

  const navItems: NavItem[] = [
    {
      label: "Obras",
      path: "/kanban",
      icon: LayoutDashboard,
      roles: ["Administrador", "EngenhariaObras", "Financeiro", "VisualizadorLeitor"],
    },
    {
      label: "Equipes",
      path: "/equipes",
      icon: Users,
      roles: ["Administrador", "EngenhariaObras", "Financeiro", "VisualizadorLeitor"],
    },
    {
      label: "Homologação",
      path: "/acompanharhomologacao",
      icon: FileCheck,
      roles: ["Administrador", "EngenhariaObras"],
    },
    {
      label: "Financeiro",
      path: "/financeiro",
      icon: DollarSign,
      roles: ["Administrador", "Financeiro"],
    },
    {
      label: "Relatórios",
      path: "/relatorios",
      icon: BarChart2,
      roles: ["Administrador", "Financeiro"],
    },
    {
      label: "Configurações",
      path: "/configuracoes",
      icon: Settings,
      roles: ["Administrador"],
    },
  ];

  const perfil = useAuthStore((s) => s.usuario?.perfil?.nomePerfil);
  const allowedItems = navItems.filter((item) => perfil && item.roles.includes(perfil));

  const checkIsActive = (path: string) => {
    return (
      location.pathname === path ||
      (path === "/kanban" && (location.pathname === "/kanban" || location.pathname === "/cadastrarobra")) ||
      (path === "/acompanharhomologacao" && location.pathname.startsWith("/acompanharhomologacao"))
    );
  };

  return (
    <>
      {/* ============================================================ */}
      {/* 1. SIDEBAR DESKTOP (md:flex)                                  */}
      {/* ============================================================ */}
      <aside
        role="navigation"
        aria-label="Menu principal de navegação"
        className={cn(
          "hidden md:flex flex-col justify-between shrink-0 pt-8 pb-4 transition-all duration-300 relative border-r border-slate-200 bg-white group",
          isCollapsed ? "w-16" : "w-64"
        )}
      >
        {/* Toggle Button (Desktop) */}
        <button
          onClick={(e) => {
            toggleCollapse();
            e.currentTarget.blur();
          }}
          aria-expanded={!isCollapsed}
          aria-label={isCollapsed ? "Expandir menu lateral" : "Recolher menu lateral"}
          title={isCollapsed ? "Expandir menu" : "Recolher menu"}
          className="absolute -right-3 top-6 bg-white border border-slate-200 rounded-full p-1 text-slate-400 hover:text-slate-700 shadow-sm z-10 transition-all duration-300 opacity-0 group-hover:opacity-100 focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-slate-400 cursor-pointer"
        >
          {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>

        <div className="flex flex-col flex-1 overflow-hidden">
          {/* Logo */}
          <div className={cn("mb-8 flex shrink-0", isCollapsed ? "px-0 justify-center" : "px-8")}>
            <div className="bg-slate-200 rounded-full px-4 py-1.5 inline-flex justify-center items-center text-micro font-bold text-slate-500 tracking-wider h-7">
              {isCollapsed ? "ZL" : "LOGO"}
            </div>
          </div>

          {/* 6. Isolamento de Scroll na lista de links */}
          <nav className="px-3 space-y-1 flex-1 overflow-y-auto custom-scrollbar">
            {allowedItems.map((item) => {
              const isActive = checkIsActive(item.path);
              return (
                <button
                  key={item.path}
                  onClick={() => void navigate(item.path)}
                  title={isCollapsed ? item.label : ""}
                  aria-label={item.label}
                  className={cn(
                    "w-full flex items-center py-2.5 rounded-lg font-medium text-sm transition-colors cursor-pointer",
                    isCollapsed ? "justify-center px-0" : "px-4",
                    isActive
                      ? "bg-slate-100 text-slate-900 font-semibold"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                  )}
                >
                  {isCollapsed ? (
                    <item.icon className="w-5 h-5 shrink-0" aria-hidden="true" />
                  ) : (
                    <span className="truncate">{item.label}</span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Rodapé / Sair */}
        <div className="px-3 shrink-0 pt-4 border-t border-slate-100">
          <button
            onClick={() => {
              (document.activeElement as HTMLElement)?.blur();
              useAuthStore.getState().logout();
            }}
            title={isCollapsed ? "Sair" : ""}
            aria-label="Sair do sistema"
            className={cn(
              "w-full flex items-center py-2.5 text-slate-600 hover:bg-red-50 hover:text-red-600 rounded-lg font-medium text-sm transition-colors cursor-pointer",
              isCollapsed ? "justify-center px-0" : "px-4"
            )}
          >
            {isCollapsed ? (
              <LogOut className="w-5 h-5 shrink-0" aria-hidden="true" />
            ) : (
              <span>Sair</span>
            )}
          </button>
        </div>
      </aside>

      {/* ============================================================ */}
      {/* 2. SIDEBAR MOBILE (Gaveta / Drawer com Overlay Backdrop)      */}
      {/* ============================================================ */}
      <div
        className={cn(
          "md:hidden fixed inset-0 z-50 transition-visibility duration-300",
          isMobileOpen ? "visible" : "invisible pointer-events-none"
        )}
        inert={!isMobileOpen ? true : undefined}
      >
        {/* Backdrop escuro com blur sutil */}
        <div
          onClick={() => {
            (document.activeElement as HTMLElement)?.blur();
            closeMobile();
          }}
          className={cn(
            "absolute inset-0 bg-slate-900/50 backdrop-blur-xs transition-opacity duration-300",
            isMobileOpen ? "opacity-100" : "opacity-0"
          )}
          aria-label="Fechar menu"
        />

        {/* Drawer Lateral */}
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Menu de Navegação Mobile"
          className={cn(
            "absolute inset-y-0 left-0 w-72 max-w-[80vw] bg-white shadow-2xl flex flex-col justify-between pt-6 pb-4 transition-transform duration-300 ease-in-out",
            isMobileOpen ? "translate-x-0" : "-translate-x-full"
          )}
        >
          <div className="flex flex-col flex-1 overflow-hidden">
            {/* Header do Drawer Mobile */}
            <div className="px-6 mb-6 flex items-center justify-between shrink-0">
              <div className="bg-slate-200 rounded-full px-4 py-1.5 inline-flex justify-center items-center text-micro font-bold text-slate-600 tracking-wider h-7">
                ZL ENGENHARIA
              </div>
              <button
                onClick={() => {
                  (document.activeElement as HTMLElement)?.blur();
                  closeMobile();
                }}
                aria-label="Fechar menu lateral"
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Lista de Navegação Mobile com Isolamento de Scroll */}
            <nav className="px-4 space-y-1.5 flex-1 overflow-y-auto custom-scrollbar">
              {allowedItems.map((item) => {
                const isActive = checkIsActive(item.path);
                return (
                  <button
                    key={item.path}
                    onClick={() => {
                      (document.activeElement as HTMLElement)?.blur();
                      closeMobile();
                      void navigate(item.path);
                    }}
                    className={cn(
                      "w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium text-sm transition-colors text-left cursor-pointer",
                      isActive
                        ? "bg-slate-100 text-slate-900 font-bold"
                        : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                    )}
                  >
                    <item.icon className="w-5 h-5 shrink-0 text-slate-500" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Sair Mobile */}
          <div className="px-4 shrink-0 pt-4 border-t border-slate-100">
            <button
              onClick={() => {
                (document.activeElement as HTMLElement)?.blur();
                closeMobile();
                useAuthStore.getState().logout();
              }}
              className="w-full flex items-center gap-3 px-4 py-3 text-slate-600 hover:bg-red-50 hover:text-red-600 rounded-xl font-medium text-sm transition-colors cursor-pointer"
            >
              <LogOut className="w-5 h-5 shrink-0" />
              <span>Sair</span>
            </button>
          </div>
        </div>
      </div>

    </>
  );
}
