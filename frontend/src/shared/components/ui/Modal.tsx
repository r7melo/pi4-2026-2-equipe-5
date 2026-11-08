import { useEffect, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { cn } from "@/shared/lib/utils";

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  titulo?: string;
  subtitulo?: string;
  icone?: ReactNode;
  children: ReactNode;
  zIndex?: string;
  fecharBloqueado?: boolean;
  className?: string;
  ariaLabelledBy?: string;
  gerenciarFoco?: boolean;
}

export function Modal({
  isOpen,
  onClose,
  titulo,
  subtitulo,
  icone,
  children,
  zIndex = "z-50",
  fecharBloqueado = false,
  className,
  ariaLabelledBy,
  gerenciarFoco = false,
}: ModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const tituloId = ariaLabelledBy || (titulo ? "modal-titulo" : undefined);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopImmediatePropagation();
        if (!fecharBloqueado) {
          onClose();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown, true);
    const scrollAnterior = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      window.removeEventListener("keydown", handleKeyDown, true);
      document.body.style.overflow = scrollAnterior;
    };
  }, [isOpen, fecharBloqueado, onClose]);

  // Opt-in para este fluxo: os consumidores existentes mantêm seu comportamento.
  useEffect(() => {
    if (!isOpen || !gerenciarFoco) return;
    const modal = modalRef.current;
    if (!modal) return;
    const anterior = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const focaveis = () => Array.from(modal.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
    )).filter(el => el.getClientRects().length > 0 && !el.closest("[inert]"));
    const focar = () => {
      const inicial = modal.querySelector<HTMLElement>("[data-autofocus]:not([disabled])");
      (inicial ?? focaveis()[0] ?? modal).focus();
    };
    const conterTab = (evento: KeyboardEvent) => {
      if (evento.key !== "Tab") return;
      const elementos = focaveis();
      const posicao = elementos.indexOf(document.activeElement as HTMLElement);
      if (!elementos.length) { evento.preventDefault(); modal.focus(); return; }
      if ((evento.shiftKey && posicao <= 0) || (!evento.shiftKey && (posicao < 0 || posicao === elementos.length - 1))) {
        evento.preventDefault();
        (evento.shiftKey ? elementos[elementos.length - 1] : elementos[0]).focus();
      }
    };
    const conterFoco = (evento: FocusEvent) => {
      if (evento.target instanceof Node && !modal.contains(evento.target)) focar();
    };
    focar();
    window.addEventListener("keydown", conterTab, true);
    window.addEventListener("focusin", conterFoco, true);
    return () => {
      window.removeEventListener("keydown", conterTab, true);
      window.removeEventListener("focusin", conterFoco, true);
      const atual = document.activeElement;
      if (anterior?.isConnected && !anterior.closest("[inert]") &&
          !anterior.matches(":disabled") && (atual === document.body || (atual && modal.contains(atual)))) anterior.focus();
    };
  }, [isOpen, gerenciarFoco]);

  useEffect(() => {
    if (isOpen && gerenciarFoco && fecharBloqueado && document.activeElement?.matches(":disabled")) modalRef.current?.focus();
  }, [isOpen, gerenciarFoco, fecharBloqueado]);

  if (!isOpen || typeof document === "undefined") return null;

  return createPortal(
    <div
      className={cn(
        "fixed inset-0 flex items-center justify-center p-4 bg-surface-overlay backdrop-blur-xs animate-in fade-in duration-200 select-none",
        zIndex
      )}
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => {
        e.stopPropagation();
        if (e.target === e.currentTarget && !fecharBloqueado) {
          onClose();
        }
      }}
    >
      <div
        ref={modalRef}
        role="dialog"
        tabIndex={gerenciarFoco ? -1 : undefined}
        aria-modal="true"
        aria-labelledby={tituloId}
        onClick={(e) => e.stopPropagation()}
        className={cn(
          "w-full max-w-lg bg-surface rounded-xl shadow-2xl border border-border-subtle overflow-hidden transform transition-all",
          className
        )}
      >
        {(titulo || icone) && (
          <div className="flex items-center justify-between px-5 py-4 border-b border-border-subtle bg-surface-subtle/50">
            <div className="flex items-center gap-2.5">
              {icone}
              <div>
                {titulo && (
                  <h3 id={tituloId} className="text-base font-semibold text-foreground-secondary">
                    {titulo}
                  </h3>
                )}
                {subtitulo && <p className="text-xs text-muted-foreground">{subtitulo}</p>}
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              disabled={fecharBloqueado}
              className={cn("text-subtle-foreground hover:text-muted-foreground p-1 rounded-md transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed",
                gerenciarFoco && "text-foreground-muted focus-visible:outline-2 focus-visible:outline-info")}
              aria-label="Fechar modal"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
        {children}
      </div>
    </div>,
    document.body
  );
}

export default Modal;
