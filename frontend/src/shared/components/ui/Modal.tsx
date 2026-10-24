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
              className="text-subtle-foreground hover:text-muted-foreground p-1 rounded-md transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
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
