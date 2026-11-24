import { Link, useLocation } from "react-router-dom";
import { 
  LogOut,
  Settings, 
  LayoutDashboard, 
  Users, 
  Building2,
  DollarSign, 
  BarChart2,
  Package,
  Moon,
  Sun,
  ChevronLeft,
  ChevronRight,
  Menu,
} from "lucide-react";
import { Drawer } from "@/shared/components/ui/Drawer";
import { cn } from "@/shared/lib/utils";
import { useSidebar } from "@/shared/contexts/SidebarContext";
import { useAuthStore } from "@/shared/stores/useAuthStore";
import type { NomePerfil } from "@/shared/types/autorizacao";
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useThemeStore, resolverTemaEfetivo } from "@/shared/stores/useThemeStore";

export function SidebarTrigger({ className }: { className?: string }) {
  const { toggleMobile, isMobileOpen } = useSidebar();

  return (
    <button
      onClick={toggleMobile}
      aria-label="Abrir menu lateral"
      aria-expanded={isMobileOpen}
      className={cn(
        "shrink-0 p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary cursor-pointer",
        className
      )}
    >
      <Menu className="w-5 h-5" />
    </button>
  );
}

export default function Sidebar() {
  const queryClient = useQueryClient();
  const location = useLocation();
  const { isCollapsed, toggleCollapse, isMobileOpen, closeMobile } = useSidebar();

  useEffect(() => {
    const desktop = window.matchMedia("(min-width: 768px)");
    const fecharNoDesktop = () => { if (desktop.matches && isMobileOpen) closeMobile(); };
    fecharNoDesktop();
    desktop.addEventListener("change", fecharNoDesktop);
    return () => desktop.removeEventListener("change", fecharNoDesktop);
  }, [isMobileOpen, closeMobile]);

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
      roles: ["Administrador", "Engenharia", "Financeiro"],
    },
    {
      label: "Equipes",
      path: "/equipes",
      icon: Users,
      roles: ["Administrador", "Engenharia", "Financeiro"],
    },
    {
      label: "Clientes",
      path: "/clientes",
      icon: Building2,
      roles: ["Administrador", "Engenharia"],
    },
    {
      label: "Financeiro",
      path: "/financeiro",
      icon: DollarSign,
      roles: ["Administrador", "Financeiro"],
    },
    {
      label: "Produtos",
      path: "/produtos",
      icon: Package,
      roles: ["Administrador", "Financeiro"],
    },
    {
      label: "Relatórios",
      path: "/relatorios",
      icon: BarChart2,
      roles: ["Administrador", "Financeiro"],
    },
    {
      label: "Usuários",
      path: "/usuarios",
      icon: Users,
      roles: ["Administrador"],
    },
  ];

  const perfil = useAuthStore((s) => s.usuario?.perfil?.nomePerfil);
  const mostrarConfiguracoes = location.pathname.replace(/\/+$/, "") !== "/sem-permissao" &&
    Boolean(perfil && ["Administrador", "Engenharia", "Financeiro"].includes(perfil));
  const allowedItems = navItems.filter((item) => perfil && item.roles.includes(perfil));

  const checkIsActive = (path: string) => {
    return (
      location.pathname === path ||
      (path === "/kanban" && (location.pathname === "/kanban" || location.pathname === "/cadastrarobra")) ||
      (path === "/usuarios" && location.pathname.startsWith("/usuarios"))
    );
  };

  return (
    <>
      <aside
        className={cn(
          "hidden md:flex flex-col justify-between shrink-0 pt-8 pb-4 transition-colors relative border-r border-border-subtle bg-surface group",
          isCollapsed ? "w-16" : "w-64"
        )}
      >
        <button
          onClick={() => {
            toggleCollapse();
          }}
          aria-expanded={!isCollapsed}
          aria-label={isCollapsed ? "Expandir menu lateral" : "Recolher menu lateral"}
          title={isCollapsed ? "Expandir menu" : "Recolher menu"}
          className="absolute -right-3 top-6 bg-surface border border-border-subtle rounded-full p-1 text-muted-foreground hover:text-foreground-muted shadow-sm z-10 transition-colors opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 [@media(hover:none)]:opacity-100 focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary cursor-pointer"
        >
          {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>

        <div className="flex flex-col flex-1 overflow-hidden">
          <div className={cn("mb-8 flex shrink-0", isCollapsed ? "px-0 justify-center" : "px-8")}>
            <div className="bg-muted rounded-full px-4 py-1.5 inline-flex justify-center items-center text-micro font-bold text-foreground-muted tracking-wider h-7">
              {isCollapsed ? "ZL" : "LOGO"}
            </div>
          </div>

          <nav aria-label="Menu principal de navegação" className="px-3 space-y-1 flex-1 overflow-y-auto custom-scrollbar">
            {allowedItems.map((item) => {
              const isActive = checkIsActive(item.path);
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  aria-current={isActive ? "page" : undefined}
                  title={isCollapsed ? item.label : ""}
                  aria-label={item.label}
                  className={cn(
                    "w-full flex items-center py-2.5 rounded-lg font-medium text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                    isCollapsed ? "justify-center px-0" : "px-4",
                    isActive
                      ? "bg-muted text-foreground font-semibold"
                      : "text-muted-foreground hover:bg-surface-subtle hover:text-foreground"
                  )}
                >
                  {isCollapsed ? (
                    <item.icon className="w-5 h-5 shrink-0" aria-hidden="true" />
                  ) : (
                    <span className="truncate">{item.label}</span>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="px-3 shrink-0 pt-4 border-t border-border-subtle">
          {mostrarConfiguracoes && <Link to="/configuracoes" aria-label="Configurações" title={isCollapsed ? "Configurações" : undefined}
            aria-current={location.pathname === "/configuracoes" ? "page" : undefined}
            className={cn("w-full min-h-11 flex items-center gap-3 rounded-lg text-sm text-muted-foreground hover:bg-surface-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary", isCollapsed ? "justify-center" : "px-4")}>
            <Settings className="size-5" aria-hidden="true" />{!isCollapsed && <span>Configurações</span>}
          </Link>}
          <BotaoTema recolhido={isCollapsed} />
          <button
            onClick={() => {
              queryClient.clear();
              useAuthStore.getState().logout();
            }}
            title={isCollapsed ? "Sair" : ""}
            aria-label="Sair do sistema"
            className={cn(
              "w-full flex items-center py-2.5 text-muted-foreground hover:bg-destructive-light hover:text-destructive rounded-lg font-medium text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
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

      <Drawer isOpen={isMobileOpen} onClose={closeMobile} focoRetorno={() => document.querySelector<HTMLElement>('aside a[aria-current="page"]') ?? document.getElementById("conteudo-principal")} ariaLabel="Menu de Navegação Mobile"
        titulo="Menu" className="left-0 right-auto ml-0 max-w-[80vw] md:hidden">
        <nav aria-label="Navegação principal móvel" className="flex-1 min-h-0 overflow-y-auto p-4 space-y-2">
          {allowedItems.map(item => <Link key={item.path} to={item.path} onClick={closeMobile}
            aria-current={checkIsActive(item.path) ? "page" : undefined}
            className={cn("min-h-11 flex items-center gap-3 p-3 rounded-lg", checkIsActive(item.path) ? "bg-muted text-foreground font-bold" : "text-muted-foreground hover:bg-muted")}>
            <item.icon aria-hidden="true" className="size-5" />{item.label}
          </Link>)}
        </nav>
        <div className="p-4 border-t border-border-subtle">
          {mostrarConfiguracoes && <Link to="/configuracoes" onClick={closeMobile} className="min-h-11 flex items-center px-4">Configurações</Link>}
          <BotaoTema recolhido={false} />
          <button type="button" className="min-h-11 px-4 text-destructive" onClick={() => { closeMobile(); queryClient.clear(); useAuthStore.getState().logout(); }}>Sair</button>
        </div>
      </Drawer>
    </>
  );
}

function BotaoTema({ recolhido }: { recolhido: boolean }) {
  const tema = useThemeStore(s => s.tema);
  const alternar = useThemeStore(s => s.alternarTema);
  const [sistemaEscuro, setSistemaEscuro] = useState(() => window.matchMedia("(prefers-color-scheme: dark)").matches);
  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const atualizar = () => setSistemaEscuro(media.matches);
    media.addEventListener("change", atualizar);
    return () => media.removeEventListener("change", atualizar);
  }, []);
  const escuro = tema === "system" ? sistemaEscuro : resolverTemaEfetivo(tema) === "dark";
  const rotulo = escuro ? "Tema claro" : "Tema escuro";
  const Icone = escuro ? Sun : Moon;
  return <button type="button" onClick={alternar} aria-label={rotulo} title={recolhido ? rotulo : undefined}
    className={cn("w-full flex items-center gap-3 py-2.5 rounded-lg text-sm text-muted-foreground hover:bg-surface-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary", recolhido ? "justify-center" : "px-4")}>
    <Icone className="size-5 shrink-0" aria-hidden="true" />{!recolhido && <span>{rotulo}</span>}
  </button>;
}
