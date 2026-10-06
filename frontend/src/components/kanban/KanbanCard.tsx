import { useState } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Zap, ExternalLink, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import type { ObraCard } from "@/types";
import { useAuthStore } from "@/stores/useAuthStore";
import { cn } from "@/lib/utils";
import ModalExcluirObra from "./ModalExcluirObra";
import { useExcluirObra } from "@/hooks/api/useObras";
import { useProgramacoes } from "@/hooks/api/useProgramacoes";
import { toast } from "sonner";

interface KanbanCardProps {
  card: ObraCard;
}

export default function KanbanCard({ card }: KanbanCardProps) {
  const navigate = useNavigate();
  const [modalExcluirAberto, setModalExcluirAberto] = useState(false);
  const perfil = useAuthStore((s) => s.usuario?.perfil?.nomePerfil);
  const canDrag = perfil === "Administrador" || perfil === "EngenhariaObras";
  const canDelete = canDrag;

  const { data: programacoes } = useProgramacoes();
  const temAlocacaoAtiva = Boolean(
    programacoes?.some((p) => Number(p.obraId) === Number(card.id))
  );

  const { mutateAsync: excluir, isPending: excluindo } = useExcluirObra();

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

  const handleDetalheClick = (e: React.MouseEvent) => {
    // Evita conflito com o drag — só navega se foi um clique simples (sem arrastar)
    e.stopPropagation();
    void navigate(`/obras/${card.id}`, { state: { from: "/kanban" } });
  };

  const handleConfirmarExclusao = async () => {
    try {
      await excluir(card.id);
      toast.success("Obra excluída com sucesso.");
      setModalExcluirAberto(false);
    } catch (err: any) {
      const msg =
        err?.response?.data?.error?.message ||
        err?.message ||
        "Não foi possível excluir a obra.";
      toast.error(msg);
    }
  };

  return (
    <>
      <div
        ref={setNodeRef}
        style={style}
        {...attributes}
        {...listeners}
        className={cn(
          "bg-white border border-slate-200 p-2.5 rounded-lg shadow-sm transition-all select-none group relative",
          canDrag && "hover:shadow-md hover:border-slate-300 cursor-grab active:cursor-grabbing hover:-translate-y-0.5",
          isDragging && "shadow-xl border-slate-400"
        )}
      >
        <div className="flex items-start justify-between gap-1 mb-1.5">
          <span className={cn("inline-block px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-full", getBadgeStyle(card.categoria))}>
            {card.categoria}
          </span>
          {canDelete && (
            <button
              type="button"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                setModalExcluirAberto(true);
              }}
              title="Excluir obra"
              aria-label="Excluir obra"
              className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-red-50 text-slate-400 hover:text-red-600 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <p className="text-xs font-semibold text-slate-800 leading-snug">{card.clienteNome}</p>
        <div className="flex items-center justify-between gap-1 text-[11px] font-semibold text-slate-500 mt-1.5 pt-1.5 border-t border-slate-100">
          <span className="flex items-center gap-1">
            <Zap className="w-3 h-3 text-amber-500" />
            {card.quantidadePaineis} Painéis
          </span>
          {/* Botão de detalhes visível ao hover */}
          <button
            onPointerDown={(e) => e.stopPropagation()}
            onClick={handleDetalheClick}
            title="Ver detalhes da obra"
            className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-700 cursor-pointer"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <ModalExcluirObra
        card={card}
        isOpen={modalExcluirAberto}
        onClose={() => setModalExcluirAberto(false)}
        onConfirm={handleConfirmarExclusao}
        isLoading={excluindo}
        temAlocacaoAtiva={temAlocacaoAtiva}
      />
    </>
  );
}

