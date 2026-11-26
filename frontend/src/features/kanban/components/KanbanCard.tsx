import { PopoverAcoes } from "@/shared/components/ui/PopoverAcoes";
import { useId, useCallback, useState, useMemo, useLayoutEffect, useRef, memo } from "react";
import { useModoDisplay } from "@/shared/contexts/ModoDisplayContext";
import { useDraggable } from "@dnd-kit/core";
import { MoreVertical, ArrowRight, Lock } from "lucide-react";
import type { ObraKanbanCard } from "../types/kanban";
import type { Material } from "@/shared/types/materiais";
import { TRANSICOES_VALIDAS, COLUNAS_KANBAN, type StatusObra } from "@/shared/constants/kanbanStatus";
import { useAuthStore } from "@/shared/stores/useAuthStore";
import { cn } from "@/shared/lib/utils";
import { calcularStatusGargalo } from "./kanbanUtils";
import { KanbanCardVisual } from "./KanbanCardVisual";

interface KanbanCardProps {
  card: ObraKanbanCard;
  onSelect?: (card: ObraKanbanCard) => void;
  onMover?: (card: ObraKanbanCard, novoStatus: StatusObra) => void;
  materiaisObra?: Material[];
  somenteLeitura?: boolean;
}

export default memo(function KanbanCard({
  card,
  onSelect,
  onMover,
  materiaisObra,
  somenteLeitura = false,
}: KanbanCardProps) {
  const menuId = useId();
  const ancoraMenu = "--mover-" + menuId.replace(/[^a-zA-Z0-9_-]/g, "");
  const fecharMenu = useCallback(() => setMenuMoverAberto(false), []);
  const [menuMoverAberto, setMenuMoverAberto] = useState(false);

  const perfil = useAuthStore((s) => s.usuario?.perfil?.nomePerfil);
  const { lerEpoch, podeInteragir } = useModoDisplay();
  const epochRender = lerEpoch();
  const montadoRef = useRef(true);
  const perfilRef = useRef(perfil);
  const [epochLocal, setEpochLocal] = useState(epochRender);
  if (epochLocal !== epochRender) {
    setEpochLocal(epochRender);
    setMenuMoverAberto(false);
  }
  useLayoutEffect(() => { perfilRef.current = perfil; }, [perfil]);
  useLayoutEffect(() => {
    montadoRef.current = true;
    return () => { montadoRef.current = false; };
  }, []);
  const podeAbrirAgora = () => montadoRef.current && !somenteLeitura && podeInteragir(epochRender);
  const podeEditarAgora = () => podeAbrirAgora() &&
    (perfilRef.current === "Administrador" || perfilRef.current === "Engenharia");
  const isFinanceiro = perfil === "Financeiro";
  const canDrag = !somenteLeitura && !isFinanceiro && (perfil === "Administrador" || perfil === "Engenharia");

  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: String(card.id),
    disabled: !canDrag,
    data: {
      type: "item",
      card,
      containerId: card.status,
    },
  });

  const style = {
    opacity: !somenteLeitura && isDragging ? 0.25 : 1,
  };

  const handleCardClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!podeAbrirAgora()) return;
    onSelect?.(card);
  };

  const statusMaterial = useMemo(() => {
    return materiaisObra ? calcularStatusGargalo(materiaisObra, card.status) : undefined;
  }, [materiaisObra, card.status]);

  const proximosStatusValidos = useMemo(() => {
    return TRANSICOES_VALIDAS[card.status] || [];
  }, [card.status]);

  const cardAtivavel = !somenteLeitura && podeInteragir(epochRender);

  return (
    <div
      ref={setNodeRef}
      style={style}
      onKeyDownCapture={e => { if (e.key === "Escape" && menuMoverAberto) { e.preventDefault(); e.stopPropagation(); setMenuMoverAberto(false); e.currentTarget.querySelector<HTMLButtonElement>('[aria-expanded]')?.focus(); } }}
      data-status={card.status}
      data-card-id={card.id}
      {...(canDrag ? attributes : {})}
      {...(canDrag ? listeners : {})}
      tabIndex={cardAtivavel ? -1 : undefined}
      role={cardAtivavel ? "group" : undefined}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          if (e.target !== e.currentTarget) return;
          e.preventDefault();
          if (podeAbrirAgora()) onSelect?.(card);
        }
      }}
      onClick={handleCardClick}
      className={cn(
        "bg-surface border border-border-subtle rounded-lg p-2.5 transition-colors duration-75 select-none group relative",
        canDrag
          ? "cursor-pointer hover:border-border-strong active:cursor-grabbing"
          : cardAtivavel
          ? "cursor-pointer hover:border-border-strong"
          : "cursor-default",
        !somenteLeitura && isDragging && "shadow-xl border-info ring-2 ring-info/20"
      )}
    >
      {cardAtivavel && <button type="button" aria-label={`Obra ${card.id}: ${card.clienteNome} - Etapa ${card.status}`}
        onClick={handleCardClick} className="absolute inset-0 z-0 rounded-lg cursor-pointer" />}
      <div className="relative pointer-events-none">
      <KanbanCardVisual
        card={card}
        statusMaterial={statusMaterial}
        acaoDireita={
          <div className="relative z-10 pointer-events-auto flex items-center gap-0.5 shrink-0">
            {isFinanceiro && (
              <span
                title="Somente leitura para o seu perfil"
                className="p-0.5 text-subtle-foreground"
              >
                <Lock className="w-3.5 h-3.5" aria-hidden="true" />
              </span>
            )}

            {canDrag && proximosStatusValidos.length > 0 && (
              <div className="relative">
                <button
                  type="button"
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!podeEditarAgora()) return;
                    setMenuMoverAberto((prev) => !prev);
                  }}
                  title="Mover para..." aria-label="Mover para..." aria-expanded={menuMoverAberto} aria-controls={menuId} style={{ anchorName: ancoraMenu }}
                  className="w-6 h-6 rounded text-muted-foreground hover:text-info hover:bg-info-light flex items-center justify-center transition-colors cursor-pointer"
                >
                  <MoreVertical className="w-3.5 h-3.5" aria-hidden="true" />
                </button>

                {menuMoverAberto && (
                  <PopoverAcoes id={menuId} ancora={ancoraMenu} onFechar={fecharMenu}>
                    <div className="px-2.5 py-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider border-b border-border-subtle">
                      Mover para
                    </div>
                    {proximosStatusValidos.map((st) => {
                      const labelDest = COLUNAS_KANBAN.find((c) => c.id === st)?.label || st;
                      return (
                        <button
                          key={st}
                          type="button"
                          onClick={() => {
                            if (!podeEditarAgora()) return;
                            setMenuMoverAberto(false);
                            onMover?.(card, st);
                          }}
                          className="w-full text-left px-2.5 py-1.5 hover:bg-info-light hover:text-info text-foreground-muted flex items-center justify-between transition-colors cursor-pointer"
                        >
                          <span>{labelDest}</span>
                          <ArrowRight className="w-3 h-3 text-subtle-foreground" />
                        </button>
                      );
                    })}
                  </PopoverAcoes>
                )}
              </div>
            )}
          </div>
        }
      />
      </div>
    </div>
  );
});
