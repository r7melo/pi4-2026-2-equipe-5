import { Zap } from "lucide-react";
import type { ObraCard } from "@/types";
import { cn } from "@/lib/utils";

export default function KanbanCardOverlay({ card }: { card: ObraCard }) {
  const getBadgeStyle = (categoria: string) => {
    switch (categoria.toLowerCase()) {
      case "atenção":
        return "bg-amber-50 text-amber-600";
      case "em obra":
        return "bg-blue-50 text-blue-600";
      case "concluído":
        return "bg-emerald-50 text-emerald-600";
      default:
        return "bg-slate-100 text-slate-600";
    }
  };

  return (
    <div className="bg-white border-2 border-slate-300 p-2.5 rounded-lg shadow-2xl rotate-2 scale-105 opacity-95 w-72 cursor-grabbing pointer-events-none">
      <span className={cn("inline-block px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-full mb-1.5", getBadgeStyle(card.categoria))}>
        {card.categoria}
      </span>
      <p className="text-xs font-semibold text-slate-800 leading-snug">{card.clienteNome}</p>
      <div className="flex items-center gap-1 text-[11px] font-semibold text-slate-500 mt-1.5 pt-1.5 border-t border-slate-100">
        <Zap className="w-3 h-3 text-amber-500" />
        {card.quantidadePaineis} Painéis
      </div>
    </div>
  );
}
