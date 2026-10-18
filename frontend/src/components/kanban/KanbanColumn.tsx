import { memo, useMemo } from "react";
import { useDroppable } from "@dnd-kit/core";
import type { ObraCard, Material } from "@/types";
import type { StatusObra } from "@/constants/kanbanStatus";
import KanbanCard from "./KanbanCard";
import { cn } from "@/lib/utils";
import { formatarMoeda } from "@/lib/formatters";
import { obterValorObra } from "./kanbanUtils";

interface KanbanColumnProps {
  id?: StatusObra;
  title?: string;
  columnId?: string;
  label?: string;
  badge?: string | null;
  cards: ObraCard[];
  onSelectCard?: (card: ObraCard) => void;
  onMoverCard?: (card: ObraCard, novoStatus: StatusObra) => void;
  horizontal?: boolean;
  headerAction?: React.ReactNode;
  isDestinoValido?: boolean;
  isDestinoInvalido?: boolean;
  mapaMateriais?: Map<number, Material[]>;
  isVisivelMobile?: boolean;
}

export default memo(function KanbanColumn({
  id,
  title,
  columnId,
  label,
  badge,
  cards,
  onSelectCard,
  onMoverCard,
  headerAction,
  isDestinoValido,
  isDestinoInvalido,
  mapaMateriais,
  isVisivelMobile = true,
}: KanbanColumnProps) {
  const colId = (id || columnId || "") as StatusObra;
  const colTitle = title || label || "";
  const { setNodeRef, isOver } = useDroppable({ id: colId });

  const valorTotalColuna = useMemo(() => {
    const soma = cards.reduce((acc, curr) => acc + obterValorObra(curr), 0);
    return formatarMoeda(soma, { semCentavos: true });
  }, [cards]);

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex flex-col bg-muted/90 rounded-xl p-2.5 transition-all border border-border-subtle/80 w-full min-w-[240px]",
        !isVisivelMobile && "hidden md:flex",
        isDestinoValido && "border-success/80 bg-success-light/40 ring-1 ring-success-border",
        isDestinoInvalido && "opacity-45 grayscale-[20%]",
        isOver && isDestinoValido && "bg-success-light border-success ring-2 ring-success/50",
        isOver && isDestinoInvalido && "bg-destructive-light border-destructive ring-2 ring-destructive/40"
      )}
    >
      <div className="flex items-center justify-between pb-2 mb-2 border-b border-border-subtle/70">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className={cn(
            "w-2 h-2 rounded-full shrink-0",
            colId === "Assistencia" ? "bg-warning" : "bg-info"
          )} />
          <h3 className="font-semibold text-foreground-secondary text-xs tracking-tight truncate" title={colTitle}>
            {colTitle}
          </h3>
          {badge && (
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-warning-light text-warning border border-warning-border shrink-0">
              {badge}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {headerAction}
          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-surface text-muted-foreground border border-border-subtle shrink-0">
            {cards.length}
          </span>
        </div>
      </div>

      <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-2 px-0.5">
        <span>Total da etapa:</span>
        <span className="font-bold text-foreground-muted">{valorTotalColuna}</span>
      </div>

      <div className="flex-1 space-y-2 min-h-[140px]">
        {cards.map((card) => (
          <KanbanCard
            key={card.id}
            card={card}
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
