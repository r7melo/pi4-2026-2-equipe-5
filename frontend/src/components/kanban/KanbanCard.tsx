import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Zap } from "lucide-react";
import type { ObraCard } from "@/types";
import { useAuthStore } from "@/stores/useAuthStore";
import { cn } from "@/lib/utils";

interface KanbanCardProps {
  card: ObraCard;
}

export default function KanbanCard({ card }: KanbanCardProps) {
  const perfil = useAuthStore((s) => s.usuario?.perfil?.nomePerfil);
  const canDrag = perfil === "Administrador" || perfil === "EngenhariaObras";

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: String(card.id),
    disabled: !canDrag,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
  };

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
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={cn(
        "bg-white border border-slate-200 p-2.5 rounded-lg shadow-sm transition-all select-none",
        canDrag && "hover:shadow-md hover:border-slate-300 cursor-grab active:cursor-grabbing hover:-translate-y-0.5",
        isDragging && "shadow-xl border-slate-400"
      )}
    >
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
