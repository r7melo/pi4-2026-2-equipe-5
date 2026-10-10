import { memo, useMemo } from "react";
import { useDroppable } from "@dnd-kit/core";
import type { ObraCard } from "@/types";
import type { StatusObra } from "@/constants/kanbanStatus";
import KanbanCard from "./KanbanCard";
import { cn } from "@/lib/utils";

interface KanbanColumnProps {
  id?: StatusObra;
  title?: string;
  columnId?: string;
  label?: string;
  cards: ObraCard[];
  onSelectCard?: (card: ObraCard) => void;
  horizontal?: boolean;
  headerAction?: React.ReactNode;
}

export default memo(function KanbanColumn({
  id,
  title,
  columnId,
  label,
  cards,
  onSelectCard,
  headerAction,
}: KanbanColumnProps) {
  const colId = (id || columnId || "") as StatusObra;
  const colTitle = title || label || "";
  const { setNodeRef, isOver } = useDroppable({ id: colId });

  // Métricas agregadas da coluna: quantidade e valor financeiro total
  const valorTotalColuna = useMemo(() => {
    const soma = cards.reduce(
      (acc, curr) => acc + (curr.valorTotal || curr.quantidadePaineis * 1300),
      0
    );
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      maximumFractionDigits: 0,
    }).format(soma);
  }, [cards]);

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex flex-col bg-slate-100/90 rounded-xl p-2.5 transition-colors border border-slate-200/80 w-full min-w-[240px]",
        isOver && "bg-blue-50/70 border-blue-300 ring-2 ring-blue-300/30"
      )}
    >
      {/* Cabeçalho da Coluna: Título, Quantidade de Obras e Valor Acumulado */}
      <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-200/70">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="w-2 h-2 rounded-full bg-blue-600 shrink-0" />
          <h3 className="font-semibold text-slate-800 text-xs tracking-tight truncate" title={colTitle}>
            {colTitle}
          </h3>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {headerAction}
          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-white text-slate-600 border border-slate-200 shrink-0">
            {cards.length}
          </span>
        </div>
      </div>

      {/* Sub-cabeçalho com valor total acumulado */}
      <div className="flex items-center justify-between text-[10px] text-slate-500 mb-2 px-0.5">
        <span>Total da etapa:</span>
        <span className="font-bold text-slate-700">{valorTotalColuna}</span>
      </div>

      {/* Lista de Cards com Layout Infinito (sem overflow-y interno) */}
      <div className="flex-1 space-y-2 min-h-[140px]">
        {cards.map((card) => (
          <KanbanCard key={card.id} card={card} onSelect={onSelectCard} />
        ))}

        {cards.length === 0 && (
          <div className="h-28 border border-dashed border-slate-300/80 rounded-lg flex items-center justify-center p-3 text-center">
            <p className="text-[11px] text-slate-400">Nenhuma obra nesta etapa</p>
          </div>
        )}
      </div>
    </div>
  );
});
