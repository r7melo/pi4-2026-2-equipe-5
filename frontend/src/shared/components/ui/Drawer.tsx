import { useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { cn } from "@/shared/lib/utils";
import { useDialogNativo } from "@/shared/hooks/useDialogNativo";

export interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  titulo?: string;
  subtitulo?: string;
  icone?: ReactNode;
  acoesHeader?: ReactNode;
  headerCustomizado?: ReactNode;
  tamanho?: "sm" | "md" | "lg" | "xl";
  bloquearEscape?: boolean;
  children: ReactNode;
  className?: string;
  ariaLabel?: string;
  labelFechar?: string;
  focoSuspenso?: boolean;
  focoRetorno?: () => HTMLElement | null;
}

const TAMANHOS = { sm: "max-w-sm", md: "max-w-md", lg: "max-w-lg", xl: "max-w-xl" };

export function Drawer({ isOpen, onClose, titulo, subtitulo, icone, acoesHeader,
  headerCustomizado, tamanho = "md", bloquearEscape = false, children, className,
  ariaLabel, labelFechar = "Fechar painel", focoSuspenso = false, focoRetorno }: DrawerProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const iniciouFora = useRef(false);
  useDialogNativo(ref, isOpen, focoRetorno);
  if (!isOpen || typeof document === "undefined") return null;
  const fora = (e: React.PointerEvent<HTMLDialogElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    return e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom;
  };
  return createPortal(<dialog ref={ref} closedby={bloquearEscape || focoSuspenso ? "none" : "any"} aria-label={ariaLabel || titulo || "Painel lateral"}
    onCancel={e => { e.preventDefault(); if (!bloquearEscape && !focoSuspenso) onClose(); }}
    onPointerDown={e => { iniciouFora.current = e.target === e.currentTarget && fora(e); e.stopPropagation(); }}
    onPointerUp={e => { if (iniciouFora.current && e.target === e.currentTarget && fora(e) && !bloquearEscape && !focoSuspenso) onClose(); }}
    onClick={e => e.stopPropagation()}
    className={cn("mwg-dialog fixed inset-y-0 left-auto right-0 m-0 ml-auto w-full h-dvh max-h-dvh p-0 bg-surface text-foreground border-0 border-l border-border-subtle shadow-2xl", TAMANHOS[tamanho], className)}>
    <div className="h-full min-h-0 flex flex-col">
      {(headerCustomizado || titulo || icone) && <div className="flex items-center justify-between p-4 border-b border-border-subtle bg-surface shrink-0 gap-3">
        <div className="min-w-0 flex-1">{headerCustomizado || <div className="flex items-center gap-2.5">{icone}<div className="min-w-0">
          {titulo && <h2 className="text-base font-bold text-foreground-secondary truncate">{titulo}</h2>}
          {subtitulo && <p className="text-xs text-muted-foreground truncate">{subtitulo}</p>}
        </div></div>}</div>
        <div className="flex items-center gap-2 shrink-0">{acoesHeader}
          <button type="button" onClick={onClose} disabled={bloquearEscape} aria-label={labelFechar}
            className="w-8 h-8 inline-flex items-center justify-center rounded-lg border border-border-subtle text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-50 cursor-pointer transition-colors">
            <X aria-hidden="true" className="w-4 h-4" />
          </button>
        </div>
      </div>}
      {children}
    </div>
  </dialog>, document.body);
}

export default Drawer;
