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
  badge?: React.ReactNode;
  backTo?: string;
  backState?: unknown;
  onBack?: () => void;
  children?: React.ReactNode;
  extraRow?: React.ReactNode;
  ocultarMenuLateral?: boolean;
  voltarCompacto?: boolean;
}

export function PageHeader({
  title,
  subtitle,
  badge,
  backTo,
  backState,
  onBack,
  children,
  extraRow,
  ocultarMenuLateral = false,
  voltarCompacto = false,
}: PageHeaderProps) {
  const navigate = useNavigate();
  const contextNode = useHeaderPortal();
  const targetNode =
    contextNode ||
    (typeof document !== "undefined"
      ? document.getElementById("dashboard-header-slot")
      : null);

  const headerContent = (
    <>
      <div className="flex items-center gap-2 md:gap-3 flex-1 min-w-0">
        {!ocultarMenuLateral && <SidebarTrigger className="md:hidden shrink-0" />}
        {(backTo || onBack) && (
          <Button
            type="button"
            variant="outline"
            size={voltarCompacto ? "sm" : "md"}
            onClick={() => {
              if (onBack) {
                onBack();
              } else if (backTo) {
                void navigate(backTo, { state: backState });
              }
            }}
            className="shrink-0 cursor-pointer h-8 py-0 px-2.5 gap-1.5 rounded-lg border-border-subtle bg-surface-subtle text-xs font-medium text-foreground-muted hover:text-foreground hover:border-border-strong"
            title="Voltar" aria-label="Voltar"
          >
            <ArrowLeft className="w-4 h-4" aria-hidden="true" />
            <span className="hidden md:inline">Voltar</span>
          </Button>
        )}
        <div className="min-w-0">
          <div className="flex items-center gap-2 min-w-0">
            <h1 className="text-base sm:text-lg font-semibold text-foreground tracking-tight leading-tight break-words">
              {title}
            </h1>
            {badge}
          </div>
          {subtitle && (
            <p className="text-[11px] text-muted-foreground font-medium break-words hidden md:block leading-snug mt-0.5">
              {subtitle}
            </p>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 min-w-0 max-w-full justify-end ml-auto">
        {children}
      </div>
      {extraRow}
    </>
  );

  if (!targetNode) return null;
  return createPortal(headerContent, targetNode);
}

export default PageHeader;
