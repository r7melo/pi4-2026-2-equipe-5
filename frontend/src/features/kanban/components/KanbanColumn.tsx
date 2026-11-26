import { memo } from "react";
import { useDroppable } from "@dnd-kit/core";
import type { ObraKanbanCard } from "../types/kanban";
import type { Material } from "@/shared/types/materiais";
import type { StatusObra } from "@/shared/constants/kanbanStatus";
import KanbanCard from "./KanbanCard";
import { cn } from "@/shared/lib/utils";

interface KanbanColumnProps {
  id: StatusObra;
  title: string;
  badge?: string | null;
  cards: ObraKanbanCard[];
  onSelectCard?: (card: ObraKanbanCard) => void;
  onMoverCard?: (card: ObraKanbanCard, novoStatus: StatusObra) => void;
  headerAction?: React.ReactNode;
  isDestinoValido?: boolean;
  isDestinoInvalido?: boolean;
  mapaMateriais?: Map<number, Material[]>;
  alocacoesAtivasSet?: Set<number>;
  onExcluirCard?: (obraId: number) => Promise<void>;
  isVisivelMobile?: boolean;
  somenteLeitura?: boolean;
}

export default memo(function KanbanColumn({
  id,
  title,
  badge,
  cards,
  onSelectCard,
  onMoverCard,
  headerAction,
  isDestinoValido,
  isDestinoInvalido,
  mapaMateriais,
  isVisivelMobile = true,
  somenteLeitura = false,
}: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <div
      ref={setNodeRef}
      data-column-id={id}
      className={cn(
        "flex flex-col bg-surface-subtle rounded-xl p-2 transition-colors border border-border-subtle w-full min-w-[254px]",
        !isVisivelMobile && "hidden md:flex",
        isDestinoValido && "border-success/80 bg-success-light/40 ring-1 ring-success-border",
        isDestinoInvalido && "opacity-45 grayscale-[20%]",
        isOver && isDestinoValido && "bg-success-light border-success ring-2 ring-success/50",
        isOver && isDestinoInvalido && "bg-destructive-light border-destructive ring-2 ring-destructive/40"
      )}
    >
      <div className="flex items-center justify-between gap-1.5 px-1 pb-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <span aria-hidden="true" className={cn(
            "w-2 h-2 rounded-full shrink-0",
            id === "Assistencia" ? "bg-warning" : "bg-info"
          )} />
          <h3 className="font-semibold text-foreground-secondary text-xs tracking-tight truncate" title={title}>
            {title}
          </h3>
          {badge && (
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-warning-light text-warning border border-warning-border shrink-0">
              {badge}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {headerAction}
          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-surface text-muted-foreground border border-border-subtle tabular-nums shrink-0">
            {cards.length}
          </span>
        </div>
      </div>

      <div className="flex-1 space-y-2 min-h-[140px]">
        {cards.map((card) => (
          <KanbanCard
            key={card.id}
            card={card}
            somenteLeitura={somenteLeitura}
            onSelect={onSelectCard}
            onMover={onMoverCard}
            materiaisObra={mapaMateriais?.get(Number(card.id))}
          />
        ))}

        {cards.length === 0 && (
          <div className="h-28 border border-dashed border-border-strong/80 rounded-lg flex items-center justify-center p-3 text-center">
            <p className="text-[11px] text-muted-foreground">Nenhuma obra nesta etapa</p>
          </div>
        )}
      </div>
    </div>
  );
});
