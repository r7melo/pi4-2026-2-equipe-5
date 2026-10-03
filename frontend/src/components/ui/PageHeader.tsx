import * as React from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { SidebarTrigger } from "@/components/Sidebar";
import { Button } from "@/components/ui/Button";
import { useHeaderPortal } from "@/contexts/HeaderPortalContext";

export interface PageHeaderProps {
  title: string;
  subtitle?: string;
  backTo?: string;
  children?: React.ReactNode;
}

export function PageHeader({ title, subtitle, backTo, children }: PageHeaderProps) {
  const navigate = useNavigate();
  const contextNode = useHeaderPortal();
  const targetNode =
    contextNode ||
    (typeof document !== "undefined"
      ? document.getElementById("dashboard-header-slot")
      : null);

  const headerContent = (
    <>
      {/* Lado Esquerdo: Menu Mobile + Títulos (Blindado com shrink-0 e proporção controlada no mobile) */}
      <div className="flex items-center gap-2 md:gap-3 shrink-0 max-w-[55%] sm:max-w-none min-w-0">
        <SidebarTrigger className="md:hidden shrink-0" />
        <div className="min-w-0">
          <h1 className="text-base sm:text-lg font-bold text-slate-800 tracking-tight leading-tight truncate">
            {title}
          </h1>
          {subtitle && (
            <p className="text-[11px] text-slate-500 font-medium truncate hidden md:block leading-none mt-0.5">
              {subtitle}
            </p>
          )}
        </div>
      </div>

      {/* Lado Direito: Ações / Filtros (Alinhamento natural à direita preservado globalmente) */}
      <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 justify-end ml-auto">
        {children}

        {backTo && (
          <Button
            type="button"
            variant="outline"
            size="md"
            onClick={() => void navigate(backTo)}
            className="shrink-0 cursor-pointer px-3 md:px-4 gap-2 text-slate-700 hover:text-slate-900"
            title="Voltar"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden md:inline">Voltar</span>
          </Button>
        )}
      </div>
    </>
  );

  if (!targetNode) return null; // Evita duplo-render antes do Portal anexar
  return createPortal(headerContent, targetNode);
}

export default PageHeader;
