import { useState, useEffect, useRef, useMemo } from "react";
import { createPortal } from "react-dom";
import {
  X,
  ExternalLink,
  Zap,
  Calendar,
  User,
  Clock,
  DollarSign,
  Users,
  Package,
  Trash2,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import axios from "axios";
import type { ObraCard } from "@/types";
import { Button } from "@/components/ui/Button";
import { getCategoriaBadgeStyle, obterHojeLocalISO } from "./kanbanUtils";
import ModalExcluirObra from "./ModalExcluirObra";
import { useProgramacoes } from "@/hooks/api/useProgramacoes";
import { useEquipes } from "@/hooks/api/useEquipes";
import { useMateriais } from "@/hooks/api/useMateriais";
import { useObras, useExcluirObra } from "@/hooks/api/useObras";
import { useAuthStore } from "@/stores/useAuthStore";
import { formatarDataBR } from "@/lib/formatters";
import { cn } from "@/lib/utils";

interface KanbanTaskDrawerProps {
  card: ObraCard | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function KanbanTaskDrawer({ card, isOpen, onClose }: KanbanTaskDrawerProps) {
  const navigate = useNavigate();
  const drawerRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  const [modalExcluirAberto, setModalExcluirAberto] = useState(false);
  const excluirObraMutation = useExcluirObra();

  const perfil = useAuthStore((s) => s.usuario?.perfil?.nomePerfil);
  const canDelete = perfil === "Administrador" || perfil === "EngenhariaObras";

  const { data: obrasData } = useObras();
  const cardAtualizado = useMemo(() => {
    if (!card) return null;
    return obrasData?.itens.find((o) => Number(o.id) === Number(card.id)) || card;
  }, [card, obrasData]);

  // Objeto reativo para refletir movimentações de status e edições em tempo real
  const cardEfetivo = cardAtualizado || card;

  const { data: programacoes } = useProgramacoes();
  const { data: equipes } = useEquipes();
  const { data: materiais, isLoading: loadingMateriais } = useMateriais(
    cardEfetivo?.id ? Number(cardEfetivo.id) : 0
  );

  const alocacao = useMemo(() => {
    if (!cardEfetivo || !programacoes) return null;
    return programacoes.find((p) => Number(p.obraId) === Number(cardEfetivo.id)) || null;
  }, [cardEfetivo, programacoes]);

  const equipeAlocada = useMemo(() => {
    if (!alocacao || !equipes) return null;
    return equipes.find((e) => e.id === alocacao.equipeId) || null;
  }, [alocacao, equipes]);

  // Bloqueio seguro imune a offset UTC: apenas alocações ativas ou futuras
  const temAlocacaoAtiva = useMemo(() => {
    if (!cardEfetivo || !programacoes) return false;
    const hojeStr = obterHojeLocalISO();
    return programacoes.some((p) => {
      if (Number(p.obraId) !== Number(cardEfetivo.id)) return false;
      const fimStr = p.dataFim ? String(p.dataFim).split("T")[0] : "";
      return fimStr >= hojeStr;
    });
  }, [cardEfetivo, programacoes]);

  useEffect(() => {
    if (!isOpen) return;
    closeButtonRef.current?.focus();
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !cardEfetivo) return null;

  const valorFormatado = new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(cardEfetivo.valorTotal || cardEfetivo.quantidadePaineis * 1300);

  const potenciaEstimada = ((cardEfetivo.quantidadePaineis * 550) / 1000).toFixed(1);

  const handleConfirmarExclusao = async () => {
    try {
      await excluirObraMutation.mutateAsync(cardEfetivo.id);
      toast.success("Obra excluída com sucesso.");
      setModalExcluirAberto(false);
      onClose();
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

  const drawerContent = (
    <>
      <div
        className="fixed inset-0 z-[60] flex justify-end bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-200"
        onClick={onClose}
      >
        <div
          ref={drawerRef}
          role="dialog"
          aria-modal="true"
          aria-label="Detalhes da Obra"
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-md bg-white h-full shadow-2xl border-l border-slate-200 flex flex-col animate-in slide-in-from-right duration-250"
        >
          {/* Header do Drawer */}
          <div className="flex items-center justify-between p-4 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  "px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-md border",
                  getCategoriaBadgeStyle(cardEfetivo.categoria)
                )}
              >
                {cardEfetivo.categoria}
              </span>
              <span className="text-xs text-slate-400 font-mono">#{cardEfetivo.id}</span>
            </div>

            <button
              ref={closeButtonRef}
              type="button"
              onClick={onClose}
              aria-label="Fechar painel"
              className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 cursor-pointer focus:outline-hidden focus:ring-2 focus:ring-slate-300"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Corpo do Drawer */}
          <div className="flex-1 overflow-y-auto p-5 space-y-5">
            <div>
              <h2 className="text-lg font-bold text-slate-900">{cardEfetivo.clienteNome}</h2>
              <p className="text-xs text-slate-500 mt-0.5">{cardEfetivo.cidade || "Campinas, SP"}</p>
            </div>

            {/* Destaque Financeiro */}
            <div className="bg-emerald-50 border border-emerald-200/80 rounded-xl p-3.5 flex items-center justify-between">
              <div>
                <span className="text-[11px] font-semibold text-emerald-800 uppercase tracking-wide block">
                  Valor Total Contratual
                </span>
                <span className="text-xl font-bold text-emerald-700">{valorFormatado}</span>
              </div>
              <div className="w-10 h-10 rounded-full bg-emerald-100/80 text-emerald-700 flex items-center justify-center shrink-0">
                <DollarSign className="w-5 h-5" />
              </div>
            </div>

            {/* Métricas Técnicas */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-slate-50 border border-slate-100 rounded-lg p-3">
                <span className="text-[10px] font-semibold uppercase text-slate-400 flex items-center gap-1">
                  <Zap className="w-3.5 h-3.5 text-amber-500" /> Painéis Solares
                </span>
                <span className="text-base font-bold text-slate-800 mt-1 block">
                  {cardEfetivo.quantidadePaineis} unidades
                </span>
                <span className="text-[10px] text-slate-500">~{potenciaEstimada} kWp estimados</span>
              </div>

              <div className="bg-slate-50 border border-slate-100 rounded-lg p-3">
                <span className="text-[10px] font-semibold uppercase text-slate-400 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-blue-500" /> Prazo Contratual
                </span>
                <span className="text-base font-bold text-slate-800 mt-1 block">
                  {cardEfetivo.prazoContratualDias || 30} dias
                </span>
                <span className="text-[10px] text-slate-500">Término: {formatarDataBR(cardEfetivo.dataFimEstimada)}</span>
              </div>
            </div>

            {/* Seção de Alocação e Cronograma */}
            <div className="border-t border-slate-100 pt-4 space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <Users className="w-4 h-4 text-slate-400" />
                <span>Cronograma & Equipe de Campo</span>
              </h3>
              {alocacao ? (
                <div className="bg-slate-50 border border-slate-200/80 p-3 rounded-xl space-y-1.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Equipe Responsável:</span>
                    <span className="font-semibold text-slate-800">
                      {equipeAlocada?.nome || `Equipe #${alocacao.equipeId}`}
                    </span>
                  </div>
                  <div className="flex items-center justify-between pt-1 border-t border-slate-200/60">
                    <span className="text-slate-500">Período de Execução:</span>
                    <span className="font-medium text-slate-700">
                      {formatarDataBR(alocacao.dataInicio)} até {formatarDataBR(alocacao.dataFim)}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="bg-slate-50/70 border border-dashed border-slate-200 p-3 rounded-xl text-center">
                  <p className="text-xs text-slate-500">Nenhuma equipe alocada no momento.</p>
                </div>
              )}
            </div>

            {/* Seção de Materiais da Obra */}
            <div className="border-t border-slate-100 pt-4 space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <Package className="w-4 h-4 text-slate-400" />
                <span>Materiais da Obra</span>
              </h3>
              {loadingMateriais ? (
                <div className="space-y-2 py-1">
                  <div className="h-4 bg-slate-100 rounded-sm animate-pulse w-3/4" />
                  <div className="h-4 bg-slate-100 rounded-sm animate-pulse w-1/2" />
                </div>
              ) : materiais && materiais.length > 0 ? (
                <div className="divide-y divide-slate-100 border border-slate-200/80 rounded-xl overflow-hidden bg-white shadow-2xs">
                  {materiais.slice(0, 4).map((mat) => (
                    <div key={mat.id} className="p-2.5 text-xs flex items-center justify-between">
                      <span className="text-slate-700 font-medium truncate pr-2">
                        {mat.descricao || mat.tipo || "Material"}
                      </span>
                      <span className="text-slate-500 font-semibold shrink-0">
                        {mat.quantidade} {mat.unidade || "un."}
                      </span>
                    </div>
                  ))}
                  {materiais.length > 4 && (
                    <div className="p-2 text-center text-[11px] text-blue-600 bg-slate-50 font-medium">
                      +{materiais.length - 4} outros itens cadastrados
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-slate-50/70 border border-dashed border-slate-200 p-3 rounded-xl text-center">
                  <p className="text-xs text-slate-400">Nenhum material registrado para esta obra.</p>
                </div>
              )}
            </div>

            {/* Seção de Autoria e Auditoria */}
            <div className="border-t border-slate-100 pt-4">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-slate-400" /> Auditoria e Histórico
              </h3>
              <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Última alteração:</span>
                  <span className="font-semibold text-slate-800 flex items-center gap-1">
                    <User className="w-3 h-3 text-slate-400" /> {cardEfetivo.atualizadoPor || "Ana Souza"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Status atual:</span>
                  <span
                    className={cn(
                      "font-semibold px-2 py-0.5 rounded-sm border text-[11px]",
                      cardEfetivo.status === "Concluido"
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                        : "bg-blue-50 text-blue-700 border-blue-200"
                    )}
                  >
                    {cardEfetivo.status}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Rodapé do Drawer com Ações */}
          <div className="p-4 border-t border-slate-100 bg-slate-50/60 flex items-center justify-end gap-2">
            {canDelete && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setModalExcluirAberto(true)}
                className="text-red-600 hover:bg-red-50 hover:text-red-700 mr-auto flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Excluir</span>
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={onClose}>
              Fechar
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                onClose();
                void navigate(`/obras/${cardEfetivo.id}`, { state: { from: "/kanban" } });
              }}
              className="flex items-center gap-1.5"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Página da Obra</span>
            </Button>
          </div>
        </div>
      </div>

      <ModalExcluirObra
        obra={cardEfetivo}
        isOpen={modalExcluirAberto}
        onClose={() => setModalExcluirAberto(false)}
        onConfirm={handleConfirmarExclusao}
        isLoading={excluirObraMutation.isPending}
        temAlocacaoAtiva={temAlocacaoAtiva}
      />
    </>
  );

  return createPortal(drawerContent, document.body);
}
