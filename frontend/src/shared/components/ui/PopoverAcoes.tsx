import { useLayoutEffect, useRef, type ReactNode } from "react";

export interface PopoverAcoesProps {
  id: string;
  ancora: string;
  onFechar: () => void;
  children: ReactNode;
}

/** Grupo de botões: Tab nativo; não promete o contrato de role=menu. */
export function PopoverAcoes({ id, ancora, onFechar, children }: PopoverAcoesProps) {
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const painel = ref.current;
    if (!painel) return;
    if (typeof painel.showPopover === "function") painel.showPopover();
    else painel.classList.add("mwg-popover-fallback");
    painel.querySelector<HTMLButtonElement>("button")?.focus();
    const fora = (e: PointerEvent) => { if (e.target instanceof Node && !painel.contains(e.target)) onFechar(); };
    document.addEventListener("pointerdown", fora);
    return () => document.removeEventListener("pointerdown", fora);
  }, [onFechar]);
  return <div id={id} ref={ref} popover="auto" role="group" aria-label="Mover para"
    onToggle={e => { if (e.newState === "closed") onFechar(); }}
    onPointerDown={e => e.stopPropagation()} onClick={e => e.stopPropagation()}
    onKeyDown={e => { if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); onFechar(); } }}
    style={{ positionAnchor: ancora }}
    className="mwg-popover w-44 max-h-[80dvh] overflow-y-auto bg-surface text-foreground border border-border-subtle rounded-lg shadow-lg py-1 text-xs">
    {children}
  </div>;
}
