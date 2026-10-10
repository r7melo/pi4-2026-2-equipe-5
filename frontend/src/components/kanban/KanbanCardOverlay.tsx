import { Zap, Calendar, User } from "lucide-react";
import type { ObraCard } from "@/types";
import { cn } from "@/lib/utils";
import { getCategoriaBadgeStyle, getIniciaisNome, calcularDiasRestantes } from "./kanbanUtils";

interface KanbanCardOverlayProps {
  card: ObraCard;
}

export default function KanbanCardOverlay({ card }: KanbanCardOverlayProps) {
  const valorFormatado = new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(card.valorTotal || card.quantidadePaineis * 1300);

  const prazoRestante = calcularDiasRestantes(card.dataFimEstimada, card.status);
  const iniciaisAutor = getIniciaisNome(card.atualizadoPor || "Carlos Administrador");

  return (
    <div className="w-[272px] bg-white border-2 border-blue-500 rounded-lg p-2.5 shadow-2xl rotate-2 select-none pointer-events-none opacity-95">
      <div className="flex items-center justify-between gap-1 mb-1">
        <span
          className={cn(
            "inline-block px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded-md border",
            getCategoriaBadgeStyle(card.categoria)
          )}
        >
          {card.categoria}
        </span>
      </div>

      <h4 className="text-xs font-semibold text-slate-800 line-clamp-1 mb-1">
        {card.clienteNome}
      </h4>

      <div className="flex items-center justify-between mb-1.5">
        <span className="font-bold text-slate-700 text-[11px]">
          {valorFormatado}
        </span>
        <span className="text-[10px] text-slate-500 font-medium flex items-center gap-1">
          <Zap className="w-3 h-3 text-slate-400 shrink-0" />
          {card.quantidadePaineis} painéis
        </span>
      </div>

      <div className="flex items-center justify-between text-[10px] pt-1 border-t border-slate-100 text-slate-500">
        <div className="flex items-center gap-1 font-medium">
          <Calendar className="w-3 h-3 text-slate-400 shrink-0" />
          <span>{card.prazoContratualDias || 30}d •</span>
          <span
            className={cn(
              "font-semibold",
              prazoRestante.concluido
                ? "text-slate-500"
                : prazoRestante.urgente
                ? "text-red-600"
                : "text-slate-500"
            )}
          >
            {prazoRestante.texto}
          </span>
        </div>

        <div className="flex items-center gap-1 font-medium">
          <User className="w-3 h-3 text-slate-400 shrink-0" />
          <span>{iniciaisAutor}</span>
        </div>
      </div>
    </div>
  );
}
