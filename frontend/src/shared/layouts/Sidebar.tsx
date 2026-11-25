import { Link, useLocation } from "react-router-dom";
import {
  LogOut,
  Settings,
  LayoutDashboard,
  CalendarDays,
  Users,
  Building2,
  DollarSign,
  BarChart2,
  Package,
  ChevronLeft,
  ChevronRight,
  Menu,
} from "lucide-react";
import { Drawer } from "@/shared/components/ui/Drawer";
import { cn } from "@/shared/lib/utils";
import { ROTULOS_PERFIS } from "@/shared/constants/perfis";
import { perfilCanonico } from "@/shared/lib/rotasSessao";
import { useSidebar } from "@/shared/contexts/SidebarContext";
import { useAuthStore } from "@/shared/stores/useAuthStore";
import type { NomePerfil } from "@/shared/types/autorizacao";
import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";

function iniciaisUsuario(nome?: string): string {
  const partes = (nome || "").trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return "ZL";
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
  return `${partes[0][0]}${partes[partes.length - 1][0]}`.toUpperCase();
}

export function SidebarTrigger({ className }: { className?: string }) {
  const { toggleMobile, isMobileOpen } = useSidebar();

  return (
    <button
      onClick={toggleMobile}
      aria-label="Abrir menu lateral"
      aria-expanded={isMobileOpen}
      className={cn(
        "shrink-0 w-8 h-8 inline-flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary cursor-pointer",
        className
      )}
    >
      <Menu className="w-4 h-4" aria-hidden="true" />
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
      icon: CalendarDays,
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

  const usuario = useAuthStore((s) => s.usuario);
  const perfil = usuario?.perfil?.nomePerfil;
  const rotuloPerfil = perfilCanonico(perfil) ? ROTULOS_PERFIS[perfil] : perfil || "Conta ativa";
  const nomeConta = usuario?.nome?.trim() || "Usuário autenticado";
  const iniciais = iniciaisUsuario(usuario?.nome);
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
        aria-label="Barra lateral de navegação"
        className={cn(
          "hidden md:flex flex-col justify-between shrink-0 transition-[width] duration-150 overflow-hidden border-r border-border-subtle bg-surface",
          isCollapsed ? "w-16" : "w-60"
        )}
      >
        <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
          <div
            className={cn(
              "h-14 shrink-0 border-b border-border-subtle flex items-center px-3",
              isCollapsed ? "justify-center" : "justify-between gap-2"
            )}
          >
            {!isCollapsed && (
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="w-8 h-8 rounded-lg bg-primary text-primary-foreground inline-flex items-center justify-center text-xs font-semibold shrink-0">
                  ZL
                </span>
                <span className="text-sm font-semibold text-foreground truncate">
                  ZL Engenharia
                </span>
              </div>
            )}

            <button
              type="button"
              onClick={toggleCollapse}
              aria-expanded={!isCollapsed}
              aria-label={isCollapsed ? "Expandir menu lateral" : "Recolher menu lateral"}
              title={isCollapsed ? "Expandir menu" : "Recolher menu"}
              className="w-8 h-8 rounded-lg inline-flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-surface-subtle cursor-pointer shrink-0 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              {isCollapsed ? <ChevronRight className="w-4 h-4" aria-hidden="true" /> : <ChevronLeft className="w-4 h-4" aria-hidden="true" />}
            </button>
          </div>

          <nav aria-label="Menu principal de navegação" className="p-2.5 space-y-1 flex-1 overflow-y-auto custom-scrollbar">
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
                    "w-full min-h-10 flex items-center rounded-lg text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                    isCollapsed ? "justify-center px-0" : "gap-3 px-3",
                    isActive
                      ? "bg-muted text-foreground font-semibold"
                      : "text-muted-foreground hover:bg-surface-subtle hover:text-foreground font-medium"
                  )}
                >
                  <item.icon className="size-[18px] shrink-0" aria-hidden="true" />
                  {!isCollapsed && <span className="truncate">{item.label}</span>}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="p-2.5 shrink-0 border-t border-border-subtle space-y-1">
          {mostrarConfiguracoes && <Link to="/configuracoes" aria-label="Configurações" title={isCollapsed ? "Configurações" : undefined}
            aria-current={location.pathname === "/configuracoes" ? "page" : undefined}
            className={cn(
              "w-full min-h-10 flex items-center rounded-lg text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
              isCollapsed ? "justify-center px-0" : "gap-3 px-3",
              location.pathname === "/configuracoes"
                ? "bg-muted text-foreground font-semibold"
                : "text-muted-foreground hover:bg-surface-subtle hover:text-foreground font-medium"
            )}>
            <Settings className="size-[18px] shrink-0" aria-hidden="true" />
            {!isCollapsed && <span className="truncate">Configurações</span>}
          </Link>}

          <button
            type="button"
            onClick={() => {
              queryClient.clear();
              useAuthStore.getState().logout();
            }}
            title={isCollapsed ? "Sair" : ""}
            aria-label="Sair do sistema"
            className={cn(
              "w-full min-h-10 flex items-center text-muted-foreground hover:bg-destructive-light hover:text-destructive rounded-lg font-medium text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary cursor-pointer",
              isCollapsed ? "justify-center px-0" : "gap-3 px-3"
            )}
          >
            <LogOut className="size-[18px] shrink-0" aria-hidden="true" />
            {!isCollapsed && <span>Sair</span>}
          </button>

          <div
            className={cn(
              "pt-2 mt-1 border-t border-border-subtle flex items-center",
              isCollapsed ? "justify-center px-0 py-1.5" : "gap-2.5 px-2 py-1.5"
            )}
            title={isCollapsed ? `${nomeConta} (${rotuloPerfil})` : undefined}
          >
            <span className="size-8 rounded-full bg-muted text-foreground text-xs font-semibold inline-flex items-center justify-center shrink-0" aria-hidden="true">
              {iniciais}
            </span>
            {!isCollapsed && (
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-foreground truncate">{nomeConta}</p>
                <p className="text-xs text-muted-foreground truncate">{rotuloPerfil}</p>
              </div>
            )}
          </div>
        </div>
      </aside>

      <Drawer
        isOpen={isMobileOpen}
        onClose={closeMobile}
        focoRetorno={() => document.querySelector<HTMLElement>('aside a[aria-current="page"]') ?? document.getElementById("conteudo-principal")}
        ariaLabel="Menu de Navegação Mobile"
        labelFechar="Fechar menu lateral"
        headerCustomizado={
          <div className="flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-lg bg-primary text-primary-foreground inline-flex items-center justify-center text-xs font-semibold shrink-0">
              ZL
            </span>
            <span className="font-semibold text-sm text-foreground truncate">
              ZL Engenharia
            </span>
          </div>
        }
        className="left-0 right-auto ml-0 max-w-[80vw] md:hidden"
      >
        <nav aria-label="Navegação principal móvel" className="flex-1 min-h-0 overflow-y-auto p-3 space-y-1">
          {allowedItems.map(item => <Link key={item.path} to={item.path} onClick={closeMobile}
            aria-current={checkIsActive(item.path) ? "page" : undefined}
            className={cn("min-h-11 flex items-center gap-3 px-3 rounded-lg text-sm transition-colors", checkIsActive(item.path) ? "bg-muted text-foreground font-semibold" : "text-muted-foreground hover:bg-surface-subtle hover:text-foreground font-medium")}>
            <item.icon aria-hidden="true" className="size-[18px] shrink-0" />{item.label}
          </Link>)}
        </nav>
        <div className="p-3 border-t border-border-subtle space-y-1">
          {mostrarConfiguracoes && (
            <Link
              to="/configuracoes"
              onClick={closeMobile}
              aria-current={location.pathname === "/configuracoes" ? "page" : undefined}
              className={cn(
                "min-h-11 flex items-center gap-3 px-3 rounded-lg text-sm transition-colors",
                location.pathname === "/configuracoes"
                  ? "bg-muted text-foreground font-semibold"
                  : "text-muted-foreground hover:bg-surface-subtle hover:text-foreground font-medium"
              )}
            >
              <Settings aria-hidden="true" className="size-[18px] shrink-0" />Configurações
            </Link>
          )}
          <button
            type="button"
            aria-label="Sair do sistema"
            className="w-full min-h-11 flex items-center gap-3 px-3 rounded-lg text-sm font-medium text-destructive hover:bg-destructive-light cursor-pointer transition-colors"
            onClick={() => { closeMobile(); queryClient.clear(); useAuthStore.getState().logout(); }}
          >
            <LogOut aria-hidden="true" className="size-[18px] shrink-0" />Sair
          </button>
          <div className="pt-2 mt-1 border-t border-border-subtle flex items-center gap-2.5 px-2 py-1.5">
            <span className="size-8 rounded-full bg-muted text-foreground text-xs font-semibold inline-flex items-center justify-center shrink-0" aria-hidden="true">
              {iniciais}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-foreground truncate">{nomeConta}</p>
              <p className="text-xs text-muted-foreground truncate">{rotuloPerfil}</p>
            </div>
          </div>
        </div>
      </Drawer>
    </>
  );
}
