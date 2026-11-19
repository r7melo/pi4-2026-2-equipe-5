import { useId, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { cn } from "@/shared/lib/utils";
import { useDialogNativo } from "@/shared/hooks/useDialogNativo";

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  titulo?: string;
  subtitulo?: string;
  icone?: ReactNode;
  children: ReactNode;
  fecharBloqueado?: boolean;
  className?: string;
  ariaLabelledBy?: string;
  focoRetorno?: () => HTMLElement | null;
  podeRestaurarFoco?: () => boolean;
}

export function Modal({ isOpen, onClose, titulo, subtitulo, icone, children,
  fecharBloqueado = false, className, ariaLabelledBy, focoRetorno, podeRestaurarFoco }: ModalProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const id = useId();
  const tituloId = ariaLabelledBy || (titulo ? id : undefined);
  const iniciouFora = useRef(false);
  useDialogNativo(ref, isOpen, focoRetorno, podeRestaurarFoco);
  if (!isOpen || typeof document === "undefined") return null;
  const fora = (e: React.PointerEvent<HTMLDialogElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    return e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom;
  };
  return createPortal(<dialog ref={ref} closedby={fecharBloqueado ? "none" : "closerequest"}
    aria-labelledby={tituloId}
    aria-label={!titulo && !ariaLabelledBy ? "Janela" : undefined}
    onCancel={e => { e.preventDefault(); if (!fecharBloqueado) onClose(); }}
    onPointerDown={e => { iniciouFora.current = e.target === e.currentTarget && fora(e); e.stopPropagation(); }}
    onPointerUp={e => { if (iniciouFora.current && e.target === e.currentTarget && fora(e) && !fecharBloqueado) onClose(); }}
    onClick={e => e.stopPropagation()}
    className={cn("mwg-dialog m-auto w-[calc(100%-2rem)] max-w-lg max-h-[90dvh] p-0 bg-surface text-foreground rounded-xl border border-border-subtle overflow-y-auto", className)}>
    {(titulo || icone) && <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-border-subtle bg-surface-subtle">
      <div className="flex items-center gap-2.5">{icone}<div>
        {titulo && <h2 id={tituloId} className="text-base font-semibold text-foreground-secondary">{titulo}</h2>}
        {subtitulo && <p className="text-xs text-muted-foreground">{subtitulo}</p>}
      </div></div>
      <button type="button" onClick={onClose} disabled={fecharBloqueado} aria-label="Fechar modal"
        className="min-w-6 min-h-6 inline-flex items-center justify-center text-foreground-muted rounded-md hover:bg-muted disabled:opacity-50">
        <X aria-hidden="true" className="w-4 h-4" />
      </button>
    </div>}
    {children}
  </dialog>, document.body);
}

export default Modal;
