import * as React from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { SidebarTrigger } from "@/shared/layouts/Sidebar";
import { Button } from "@/shared/components/ui/Button";
import { useHeaderPortal } from "@/shared/contexts/HeaderPortalContext";

export interface PageHeaderProps {
  title: string;
  subtitle?: string;
  backTo?: string;
  backState?: unknown;
  onBack?: () => void;
  children?: React.ReactNode;
  ocultarMenuLateral?: boolean;
}

export function PageHeader({ title, subtitle, backTo, backState, onBack, children, ocultarMenuLateral = false }: PageHeaderProps) {
  const navigate = useNavigate();
  const contextNode = useHeaderPortal();
  const targetNode =
    contextNode ||
    (typeof document !== "undefined"
      ? document.getElementById("dashboard-header-slot")
      : null);

  const headerContent = (
    <>
      <div className="flex items-center gap-2 md:gap-3 flex-1 min-w-[min(100%,12rem)]">
        {!ocultarMenuLateral && <SidebarTrigger className="md:hidden shrink-0" />}
        <div className="min-w-0">
          <h1 className="text-base sm:text-lg font-bold text-foreground-secondary tracking-tight leading-tight break-words">
            {title}
          </h1>
          {subtitle && (
            <p className="text-[11px] text-muted-foreground font-medium break-words hidden md:block leading-snug mt-0.5">
              {subtitle}
            </p>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 min-w-0 max-w-full justify-end ml-auto">
        {children}

        {(backTo || onBack) && (
          <Button
            type="button"
            variant="outline"
            size="md"
            onClick={() => {
              if (onBack) {
                onBack();
              } else if (backTo) {
                void navigate(backTo, { state: backState });
              }
            }}
            className="shrink-0 cursor-pointer px-3 md:px-4 gap-2 text-foreground-muted hover:text-foreground"
            title="Voltar" aria-label="Voltar"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden md:inline">Voltar</span>
          </Button>
        )}
      </div>
    </>
  );

  if (!targetNode) return null;
  return createPortal(headerContent, targetNode);
}

export default PageHeader;
