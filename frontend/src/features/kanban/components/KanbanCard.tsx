import { useState, useMemo, useLayoutEffect, useRef, memo } from "react";
import { useModoDisplay } from "@/shared/contexts/ModoDisplayContext";
import { useDraggable } from "@dnd-kit/core";
import { Trash2, MoreVertical, ArrowRight, Lock } from "lucide-react";
import axios from "axios";
import type { ObraCard, Material } from "@/types";
import { TRANSICOES_VALIDAS, COLUNAS_KANBAN, type StatusObra } from "@/shared/constants/kanbanStatus";
import { useAuthStore } from "@/features/auth/stores/useAuthStore";
import { cn } from "@/shared/lib/utils";
import ModalExcluirObra from "./ModalExcluirObra";
import { useExcluirObra } from "@/features/obras/hooks/useObras";
import { useProgramacoes } from "@/features/cronograma/hooks/useProgramacoes";
import { toast } from "sonner";
import { obterHojeLocalISO } from "./kanbanUtils";
import { KanbanCardVisual } from "./KanbanCardVisual";

interface KanbanCardProps {
  card: ObraCard;
  onSelect?: (card: ObraCard) => void;
  onMover?: (card: ObraCard, novoStatus: StatusObra) => void;
  materiaisObra?: Material[];
  somenteLeitura?: boolean;
}

export default memo(function KanbanCard({
  card,
  onSelect,
  onMover,
  materiaisObra,
  somenteLeitura = false,
}: KanbanCardProps) {
  const [modalExcluirAberto, setModalExcluirAberto] = useState(false);
  const [menuMoverAberto, setMenuMoverAberto] = useState(false);

  const perfil = useAuthStore((s) => s.usuario?.perfil?.nomePerfil);
  const { lerEpoch, podeInteragir } = useModoDisplay();
  const epochRender = lerEpoch();
  const montadoRef = useRef(true);
  const perfilRef = useRef(perfil);
  const [epochLocal, setEpochLocal] = useState(epochRender);
  if (epochLocal !== epochRender) {
    setEpochLocal(epochRender);
    setMenuMoverAberto(false);
    setModalExcluirAberto(false);
  }
  useLayoutEffect(() => { perfilRef.current = perfil; }, [perfil]);
  useLayoutEffect(() => {
    montadoRef.current = true;
    return () => { montadoRef.current = false; };
  }, []);
  const podeAbrirAgora = () => montadoRef.current && !somenteLeitura && podeInteragir(epochRender);
  const podeEditarAgora = () => podeAbrirAgora() &&
    (perfilRef.current === "Administrador" || perfilRef.current === "Engenharia");
  const isFinanceiro = perfil === "Financeiro";
  const canDrag = !somenteLeitura && !isFinanceiro && (perfil === "Administrador" || perfil === "Engenharia");
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
    opacity: !somenteLeitura && isDragging ? 0.25 : 1,
  };

  const handleCardClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!podeAbrirAgora()) return;
    onSelect?.(card);
  };

  const handleConfirmarExclusao = async () => {
    if (!podeEditarAgora()) return;
    try {
      await excluir(card.id);
      toast.success("Obra excluída com sucesso.");
      if (montadoRef.current && podeInteragir(epochRender)) setModalExcluirAberto(false);
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

  const statusMaterial = useMemo(() => {
    if (!materiaisObra || materiaisObra.length === 0) {
      if (card.status === "MaterialComprado") return "Comprado";
      if (card.status === "NoDeposito") return "Disponivel";
      return undefined;
    }
    if (materiaisObra.every((m) => m.statusLogistico === "Utilizado")) return "Utilizado";
    if (materiaisObra.some((m) => m.statusLogistico === "Disponivel")) return "Disponivel";
    if (materiaisObra.some((m) => m.statusLogistico === "EmTransito")) return "EmTransito";
    return "Comprado";
  }, [materiaisObra, card.status]);

  const proximosStatusValidos = useMemo(() => {
    return TRANSICOES_VALIDAS[card.status] || [];
  }, [card.status]);

  return (
    <>
      <div
        ref={setNodeRef}
        style={style}
        {...(somenteLeitura ? {} : attributes)}
        {...(somenteLeitura ? {} : listeners)}
        onClick={somenteLeitura ? undefined : handleCardClick}
        className={cn(
          "bg-surface border border-border-subtle/90 rounded-lg p-2.5 shadow-xs transition-all select-none group relative",
          canDrag
            ? "cursor-pointer hover:shadow-md hover:border-border-strong active:cursor-grabbing hover:-translate-y-0.5"
            : "cursor-default",
          !somenteLeitura && isDragging && "shadow-xl border-info ring-2 ring-info/20"
        )}
      >
        <KanbanCardVisual
          card={card}
          statusMaterial={statusMaterial}
          acaoDireita={
            <div className="flex items-center gap-0.5">
              {isFinanceiro && (
                <span
                  title="Somente leitura para o seu perfil"
                  className="p-1 text-subtle-foreground"
                >
                  <Lock className="w-3.5 h-3.5" />
                </span>
              )}

              {canDrag && proximosStatusValidos.length > 0 && (
                <div className="relative">
                  <button
                    type="button"
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!podeEditarAgora()) return;
                      setMenuMoverAberto((prev) => !prev);
                    }}
                    title="Mover para..."
                    className="p-1 text-subtle-foreground hover:text-info hover:bg-info-light rounded transition-colors cursor-pointer"
                  >
                    <MoreVertical className="w-3.5 h-3.5" />
                  </button>

                  {menuMoverAberto && (
                    <div
                      onPointerDown={(e) => e.stopPropagation()}
                      onClick={(e) => e.stopPropagation()}
                      className="absolute right-0 top-6 z-30 w-44 bg-surface border border-border-subtle rounded-lg shadow-lg py-1 text-xs"
                    >
                      <div className="px-2.5 py-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider border-b border-border-subtle">
                        Mover para
                      </div>
                      {proximosStatusValidos.map((st) => {
                        const labelDest = COLUNAS_KANBAN.find((c) => c.id === st)?.label || st;
                        return (
                          <button
                            key={st}
                            type="button"
                            onClick={() => {
                              if (!podeEditarAgora()) return;
                              setMenuMoverAberto(false);
                              onMover?.(card, st);
                            }}
                            className="w-full text-left px-2.5 py-1.5 hover:bg-info-light hover:text-info text-foreground-muted flex items-center justify-between transition-colors cursor-pointer"
                          >
                            <span>{labelDest}</span>
                            <ArrowRight className="w-3 h-3 text-subtle-foreground" />
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {canDelete && (
                <button
                  type="button"
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!podeEditarAgora()) return;
                    setModalExcluirAberto(true);
                  }}
                  title="Excluir obra"
                  className="opacity-0 group-hover:opacity-100 p-1 text-subtle-foreground hover:text-destructive hover:bg-destructive-light rounded transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          }
        />
      </div>

      {!somenteLeitura && (
        <ModalExcluirObra obra={card} isOpen={modalExcluirAberto}
          onClose={() => { if (podeAbrirAgora()) setModalExcluirAberto(false); }}
          onConfirm={handleConfirmarExclusao} isLoading={excluindo}
          temAlocacaoAtiva={temAlocacaoAtiva} />
      )}
    </>
  );
});
