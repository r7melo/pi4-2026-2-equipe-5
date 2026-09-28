import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, horizontalListSortingStrategy } from "@dnd-kit/sortable";
import KanbanCard from "./KanbanCard";
import type { ObraCard } from "@/types";
import { cn } from "@/lib/utils";

interface Props {
  columnId: string;
  label: string;
  cards: ObraCard[];
  horizontal?: boolean;
}

export default function KanbanColumn({ columnId, label, cards, horizontal }: Props) {
  const { setNodeRef, isOver } = useDroppable({ id: columnId });
  const cardIds = cards.map((c) => String(c.id));

  if (horizontal) {
    return (
      <div className="mt-6 shrink-0 pb-4">
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4 pl-1">
          Raia — {label}
        </h3>
        <SortableContext id={columnId} items={cardIds} strategy={horizontalListSortingStrategy}>
          <div
            ref={setNodeRef}
            className={cn(
              "flex gap-4 p-2 rounded-xl transition-colors min-h-[120px] border border-dashed border-transparent",
              isOver && "bg-slate-100/60 border-slate-300"
            )}
          >
            {cards.length === 0 ? (
              <div className="w-72 h-24 border border-dashed border-slate-200 rounded-xl flex items-center justify-center text-xs text-slate-400">
                Arraste uma obra para cá
              </div>
            ) : (
              cards.map((card) => <KanbanCard key={card.id} card={card} />)
            )}
          </div>
        </SortableContext>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "w-72 shrink-0 flex flex-col bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden transition-colors",
        isOver && "border-slate-400 ring-2 ring-slate-200"
      )}
    >
      <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
        <h3 className="font-semibold text-slate-700 text-sm">{label}</h3>
        <span className="text-xs font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
          {cards.length}
        </span>
      </div>

      <SortableContext id={columnId} items={cardIds} strategy={verticalListSortingStrategy}>
        <div
          ref={setNodeRef}
          className="p-3 flex-1 overflow-y-auto space-y-3 custom-scrollbar bg-slate-50/30 min-h-[150px]"
        >
          {cards.map((card) => (
            <KanbanCard key={card.id} card={card} />
          ))}
          {cards.length === 0 && (
            <div className="h-24 border-2 border-dashed border-slate-200 rounded-xl flex items-center justify-center text-xs text-slate-400">
              Nenhuma obra
            </div>
          )}
        </div>
      </SortableContext>
    </div>
  );
}
