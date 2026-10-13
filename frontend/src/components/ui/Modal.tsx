import { useEffect, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

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
  ariaLabelledBy = "modal-titulo",
}: ModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);

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
        "fixed inset-0 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200 select-none",
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
        aria-labelledby={titulo ? ariaLabelledBy : undefined}
        onClick={(e) => e.stopPropagation()}
        className={cn(
          "w-full max-w-lg bg-white rounded-xl shadow-2xl border border-slate-100 overflow-hidden transform transition-all",
          className
        )}
      >
        {(titulo || icone) && (
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50/50">
            <div className="flex items-center gap-2.5">
              {icone}
              <div>
                {titulo && (
                  <h3 id={ariaLabelledBy} className="text-base font-semibold text-slate-800">
                    {titulo}
                  </h3>
                )}
                {subtitulo && <p className="text-xs text-slate-500">{subtitulo}</p>}
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              disabled={fecharBloqueado}
              className="text-slate-400 hover:text-slate-600 p-1 rounded-md transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
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
