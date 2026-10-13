import { useState, useMemo, memo } from "react";
import { useDraggable } from "@dnd-kit/core";
import { Trash2 } from "lucide-react";
import axios from "axios";
import type { ObraCard } from "@/types";
import { useAuthStore } from "@/stores/useAuthStore";
import { cn } from "@/lib/utils";
import ModalExcluirObra from "./ModalExcluirObra";
import { useExcluirObra } from "@/hooks/api/useObras";
import { useProgramacoes } from "@/hooks/api/useProgramacoes";
import { toast } from "sonner";
import { obterHojeLocalISO } from "./kanbanUtils";
import { KanbanCardVisual } from "./KanbanCardVisual";

interface KanbanCardProps {
  card: ObraCard;
  onSelect?: (card: ObraCard) => void;
}

export default memo(function KanbanCard({ card, onSelect }: KanbanCardProps) {
  const [modalExcluirAberto, setModalExcluirAberto] = useState(false);
  const perfil = useAuthStore((s) => s.usuario?.perfil?.nomePerfil);
  const isFinanceiro = perfil === "Financeiro";
  const canDrag = !isFinanceiro && (perfil === "Administrador" || perfil === "EngenhariaObras");
  const canDelete = !isFinanceiro && canDrag;

  const { data: programacoes } = useProgramacoes();

  const temAlocacaoAtiva = useMemo(() => {
    if (!programacoes) return false;
    const hojeStr = obterHojeLocalISO();
    return programacoes.some((p) => {
      if (Number(p.obraId) !== Number(card.id)) return false;
      const fimStr = p.dataFim ? String(p.dataFim).split("T")[0] : "";
      return fimStr >= hojeStr;
    });
  }, [programacoes, card.id]);

  const { mutateAsync: excluir, isPending: excluindo } = useExcluirObra();

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
    opacity: isDragging ? 0.25 : 1,
  };

  const handleCardClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelect?.(card);
  };

  const handleConfirmarExclusao = async () => {
    try {
      await excluir(card.id);
      toast.success("Obra excluída com sucesso.");
      setModalExcluirAberto(false);
    } catch (err: unknown) {
      let msg = "Não foi possível excluir a obra.";
      if (axios.isAxiosError<{ error?: { message?: string } }>(err)) {
        msg = err.response?.data?.error?.message || err.message;
      } else if (err instanceof Error) {
        msg = err.message;
      }
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
        onClick={handleCardClick}
        className={cn(
          "bg-white border border-slate-200/90 rounded-lg p-2.5 shadow-xs transition-all select-none group relative",
          canDrag
            ? "cursor-pointer hover:shadow-md hover:border-slate-300 active:cursor-grabbing hover:-translate-y-0.5"
            : "cursor-default",
          isDragging && "shadow-xl border-blue-400 ring-2 ring-blue-400/20"
        )}
      >
        <KanbanCardVisual
          card={card}
          acaoDireita={
            canDelete ? (
              <button
                type="button"
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation();
                  setModalExcluirAberto(true);
                }}
                title="Excluir obra"
                className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-red-600 rounded transition-opacity cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            ) : null
          }
        />
      </div>

      <ModalExcluirObra
        obra={card}
        isOpen={modalExcluirAberto}
        onClose={() => setModalExcluirAberto(false)}
        onConfirm={handleConfirmarExclusao}
        isLoading={excluindo}
        temAlocacaoAtiva={temAlocacaoAtiva}
      />
    </>
  );
});
