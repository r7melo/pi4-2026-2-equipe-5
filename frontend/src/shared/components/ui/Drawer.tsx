import { useEffect, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { cn } from "@/shared/lib/utils";

export interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  titulo?: string;
  subtitulo?: string;
  icone?: ReactNode;
  acoesHeader?: ReactNode;
  headerCustomizado?: ReactNode;
  tamanho?: "sm" | "md" | "lg" | "xl";
  zIndex?: string;
  bloquearEscape?: boolean;
  children: ReactNode;
  className?: string;
  ariaLabel?: string;
}

const TAMANHOS = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-xl",
};

export function Drawer({
  isOpen,
  onClose,
  titulo,
  subtitulo,
  icone,
  acoesHeader,
  headerCustomizado,
  tamanho = "md",
  zIndex = "z-[60]",
  bloquearEscape = false,
  children,
  className,
  ariaLabel,
}: DrawerProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!isOpen) return;
    const scrollAnterior = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = scrollAnterior;
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !bloquearEscape) {
        onCloseRef.current();
      }
    };

    window.addEventListener("keydown", handleKeyDown, false);
    return () => {
      window.removeEventListener("keydown", handleKeyDown, false);
    };
  }, [isOpen, bloquearEscape]);

  if (!isOpen || typeof document === "undefined") return null;

  return createPortal(
    <div
      className={cn(
        "fixed inset-0 flex justify-end bg-surface-overlay backdrop-blur-xs animate-in fade-in duration-200 select-none",
        zIndex
      )}
      onClick={(e) => {
        if (e.target === e.currentTarget && !bloquearEscape) {
          onClose();
        }
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel || titulo || "Painel lateral"}
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
        className={cn(
          "w-full bg-surface h-full shadow-2xl border-l border-border-subtle flex flex-col animate-in slide-in-from-right duration-250 select-text",
          TAMANHOS[tamanho],
          className
        )}
      >
        {headerCustomizado ? (
          <div className="flex items-center justify-between p-4 border-b border-border-subtle bg-surface-subtle/50 shrink-0 gap-3">
            <div className="min-w-0 flex-1">{headerCustomizado}</div>
            <div className="flex items-center gap-2 shrink-0">
              {acoesHeader}
              <button
                type="button"
                onClick={onClose}
                disabled={bloquearEscape}
                aria-label="Fechar painel"
                className="p-1 text-subtle-foreground hover:text-muted-foreground rounded-lg hover:bg-muted cursor-pointer focus:outline-hidden focus:ring-2 focus:ring-border-strong disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        ) : (titulo || icone) ? (
          <div className="flex items-center justify-between px-5 py-4 border-b border-border-subtle bg-surface-subtle/70 shrink-0 gap-3">
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              {icone}
              <div className="min-w-0">
                {titulo && (
                  <h2 className="text-base font-bold text-foreground-secondary leading-snug truncate">
                    {titulo}
                  </h2>
                )}
                {subtitulo && <p className="text-xs text-muted-foreground mt-0.5 truncate">{subtitulo}</p>}
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {acoesHeader}
              <button
                type="button"
                onClick={onClose}
                disabled={bloquearEscape}
                aria-label="Fechar painel"
                className="p-1 text-subtle-foreground hover:text-muted-foreground rounded-lg hover:bg-muted cursor-pointer focus:outline-hidden focus:ring-2 focus:ring-border-strong disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        ) : null}

        {children}
      </div>
    </div>,
    document.body
  );
}

export default Drawer;
