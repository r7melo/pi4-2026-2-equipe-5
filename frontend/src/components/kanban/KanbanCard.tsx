import { useState, useMemo, memo } from "react";
import { useDraggable } from "@dnd-kit/core";
import { Zap, Trash2, Calendar, User } from "lucide-react";
import axios from "axios";
import type { ObraCard } from "@/types";
import { useAuthStore } from "@/stores/useAuthStore";
import { cn } from "@/lib/utils";
import ModalExcluirObra from "./ModalExcluirObra";
import { useExcluirObra } from "@/hooks/api/useObras";
import { useProgramacoes } from "@/hooks/api/useProgramacoes";
import { toast } from "sonner";
import { getCategoriaBadgeStyle, getIniciaisNome, calcularDiasRestantes, obterHojeLocalISO } from "./kanbanUtils";

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

  // Bloqueio conforme UC-11 RN2 / FA2: apenas alocações ativas ou futuras (data local imune a UTC)
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

  const valorFormatado = useMemo(() => {
    const valor = card.valorTotal || card.quantidadePaineis * 1300;
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      maximumFractionDigits: 0,
    }).format(valor);
  }, [card.valorTotal, card.quantidadePaineis]);

  const prazoRestante = useMemo(
    () => calcularDiasRestantes(card.dataFimEstimada, card.status),
    [card.dataFimEstimada, card.status]
  );

  const iniciaisAutor = useMemo(
    () => getIniciaisNome(card.atualizadoPor || "Carlos Administrador"),
    [card.atualizadoPor]
  );

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
          canDrag ? "cursor-pointer hover:shadow-md hover:border-slate-300 active:cursor-grabbing hover:-translate-y-0.5" : "cursor-default",
          isDragging && "shadow-xl border-blue-400 ring-2 ring-blue-400/20"
        )}
      >
        {/* Linha 1: Categoria e Botão Excluir */}
        <div className="flex items-center justify-between gap-1 mb-1">
          <span
            className={cn(
              "inline-block px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded-md border",
              getCategoriaBadgeStyle(card.categoria)
            )}
          >
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
              className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-red-600 rounded transition-opacity cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Linha 2: Nome do Cliente */}
        <h4 className="text-xs font-semibold text-slate-800 line-clamp-1 mb-1" title={card.clienteNome}>
          {card.clienteNome}
        </h4>

        {/* Linha 3: Valor Total da Obra */}
        <div className="flex items-center justify-between mb-1.5">
          <span className="font-bold text-slate-700 text-[11px]">
            {valorFormatado}
          </span>
          <span className="text-[10px] text-slate-500 font-medium flex items-center gap-1">
            <Zap className="w-3 h-3 text-slate-400 shrink-0" />
            {card.quantidadePaineis} painéis
          </span>
        </div>

        {/* Linha 4: Prazos e Micro-Avatar do Autor com Ícone */}
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

          {/* Micro-avatar de autoria: ícone de usuário + iniciais */}
          <div
            title={`Última alteração por: ${card.atualizadoPor || "Carlos Administrador"}`}
            className="flex items-center gap-1 font-medium"
          >
            <User className="w-3 h-3 text-slate-400 shrink-0" />
            <span>{iniciaisAutor}</span>
          </div>
        </div>
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
