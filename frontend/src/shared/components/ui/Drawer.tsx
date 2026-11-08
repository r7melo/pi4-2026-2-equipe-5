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
  gerenciarFoco?: boolean;
  focoSuspenso?: boolean;
  focoRetorno?: () => HTMLElement | null;
}

const TAMANHOS = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-xl",
};

function elementoFocavelValido(el: unknown): el is HTMLElement {
  if (!(el instanceof HTMLElement)) return false;
  if (!el.isConnected) return false;
  if (el.closest("[inert]")) return false;
  if (el.matches(":disabled") || el.getAttribute("aria-disabled") === "true") return false;
  return el.getClientRects().length > 0;
}

function obterElementosFocaveis(container: HTMLElement): HTMLElement[] {
  return Array.from(
    container.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    )
  ).filter(elementoFocavelValido);
}

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
  gerenciarFoco = false,
  focoSuspenso = false,
  focoRetorno,
}: DrawerProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  const focoRetornoRef = useRef(focoRetorno);
  const focoSuspensoRef = useRef(focoSuspenso);
  const focoSuspensoAnteriorRef = useRef(focoSuspenso);
  const origemRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    focoRetornoRef.current = focoRetorno;
  }, [focoRetorno]);

  useEffect(() => {
    focoSuspensoRef.current = focoSuspenso;
  }, [focoSuspenso]);

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
      if (e.key === "Escape" && !bloquearEscape && !focoSuspenso) {
        onCloseRef.current();
      }
    };

    window.addEventListener("keydown", handleKeyDown, false);
    return () => {
      window.removeEventListener("keydown", handleKeyDown, false);
    };
  }, [isOpen, bloquearEscape, focoSuspenso]);

  useEffect(() => {
    if (!isOpen || !gerenciarFoco || typeof document === "undefined") return;

    const rootEl = document.getElementById("root");
    if (!rootEl) return;

    const tinhaInert = rootEl.hasAttribute("inert");
    if (!tinhaInert) {
      rootEl.setAttribute("inert", "");
    }

    return () => {
      if (!tinhaInert) {
        rootEl.removeAttribute("inert");
      }
    };
  }, [isOpen, gerenciarFoco]);

  useEffect(() => {
    if (!isOpen || !gerenciarFoco) return;

    const painel = panelRef.current;
    if (!painel) return;

    if (document.activeElement instanceof HTMLElement) {
      origemRef.current = document.activeElement;
    }

    const inicial = painel.querySelector<HTMLElement>("[data-autofocus]:not([disabled])");
    const primeiro = (inicial && elementoFocavelValido(inicial) ? inicial : null) ?? obterElementosFocaveis(painel)[0] ?? painel;
    primeiro.focus();

    const conterTab = (e: KeyboardEvent) => {
      if (e.key !== "Tab" || focoSuspensoRef.current) return;
      const elementos = obterElementosFocaveis(painel);
      if (elementos.length === 0) {
        e.preventDefault();
        painel.focus();
        return;
      }
      const ativo = document.activeElement as HTMLElement | null;
      const indice = ativo ? elementos.indexOf(ativo) : -1;

      if (e.shiftKey) {
        if (indice <= 0) {
          e.preventDefault();
          elementos[elementos.length - 1].focus();
        }
      } else {
        if (indice < 0 || indice >= elementos.length - 1) {
          e.preventDefault();
          elementos[0].focus();
        }
      }
    };

    const conterFoco = (e: FocusEvent) => {
      if (focoSuspensoRef.current) return;
      if (e.target instanceof Node && !painel.contains(e.target)) {
        const elementos = obterElementosFocaveis(painel);
        (elementos[0] ?? painel).focus();
      }
    };

    window.addEventListener("keydown", conterTab, true);
    window.addEventListener("focusin", conterFoco, true);

    return () => {
      window.removeEventListener("keydown", conterTab, true);
      window.removeEventListener("focusin", conterFoco, true);

      try {
        const origem = origemRef.current;
        if (elementoFocavelValido(origem)) {
          origem.focus();
          return;
        }
        const fallback = focoRetornoRef.current?.();
        if (elementoFocavelValido(fallback)) {
          fallback.focus();
        }
      } catch {
        // Fallback inexistente ou com erro não causa throw
      } finally {
        origemRef.current = null;
      }
    };
  }, [isOpen, gerenciarFoco]);

  useEffect(() => {
    if (!isOpen || !gerenciarFoco) return;
    if (focoSuspensoAnteriorRef.current && !focoSuspenso) {
      const painel = panelRef.current;
      if (painel) {
        const ativo = document.activeElement;
        const focoJaNoDrawer = ativo instanceof Node && painel.contains(ativo);
        if (!focoJaNoDrawer) {
          const elementos = obterElementosFocaveis(painel);
          (elementos[0] ?? painel).focus();
        }
      }
    }
    focoSuspensoAnteriorRef.current = focoSuspenso;
  }, [isOpen, gerenciarFoco, focoSuspenso]);

  useEffect(() => {
    if (!isOpen || !gerenciarFoco || focoSuspenso) return;
    const painel = panelRef.current;
    if (!painel) return;
    const ativo = document.activeElement;
    if (ativo instanceof HTMLElement && painel.contains(ativo)) {
      if (ativo.matches(":disabled") || ativo.getAttribute("aria-disabled") === "true") {
        const elementos = obterElementosFocaveis(painel);
        (elementos[0] ?? painel).focus();
      }
    }
  });

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
        tabIndex={gerenciarFoco ? -1 : undefined}
        aria-modal="true"
        aria-label={ariaLabel || titulo || "Painel lateral"}
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
        className={cn(
          "w-full bg-surface h-full shadow-2xl border-l border-border-subtle flex flex-col animate-in slide-in-from-right duration-250 select-text outline-hidden",
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
                className={cn(
                  "rounded-lg cursor-pointer transition-colors disabled:opacity-40 disabled:cursor-not-allowed",
                  gerenciarFoco
                    ? "min-w-[44px] min-h-[44px] inline-flex items-center justify-center text-text-secondary hover:text-text-primary hover:bg-background-hover focus:outline-hidden focus-visible:ring-2 focus-visible:ring-border-strong"
                    : "p-1 text-subtle-foreground hover:text-muted-foreground hover:bg-muted focus:outline-hidden focus:ring-2 focus:ring-border-strong"
                )}
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
                className={cn(
                  "rounded-lg cursor-pointer transition-colors disabled:opacity-40 disabled:cursor-not-allowed",
                  gerenciarFoco
                    ? "min-w-[44px] min-h-[44px] inline-flex items-center justify-center text-text-secondary hover:text-text-primary hover:bg-background-hover focus:outline-hidden focus-visible:ring-2 focus-visible:ring-border-strong"
                    : "p-1 text-subtle-foreground hover:text-muted-foreground hover:bg-muted focus:outline-hidden focus:ring-2 focus:ring-border-strong"
                )}
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
