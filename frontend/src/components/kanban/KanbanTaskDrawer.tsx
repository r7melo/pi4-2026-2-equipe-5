import { useState, useMemo } from "react";
import {
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
import { Drawer } from "@/components/ui/Drawer";
import { getCategoriaBadgeStyle, obterHojeLocalISO, obterValorObra } from "./kanbanUtils";
import { formatarMoeda, formatarDataBR } from "@/lib/formatters";
import ModalExcluirObra from "./ModalExcluirObra";
import { useProgramacoes } from "@/hooks/api/useProgramacoes";
import { useEquipes } from "@/hooks/api/useEquipes";
import { useMateriais } from "@/hooks/api/useMateriais";
import { useObras, useExcluirObra } from "@/hooks/api/useObras";
import { useAuthStore } from "@/stores/useAuthStore";
import { cn } from "@/lib/utils";

interface KanbanTaskDrawerProps {
  card: ObraCard | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function KanbanTaskDrawer({ card, isOpen, onClose }: KanbanTaskDrawerProps) {
  const navigate = useNavigate();

  const [modalExcluirAberto, setModalExcluirAberto] = useState(false);
  const excluirObraMutation = useExcluirObra();

  const perfil = useAuthStore((s) => s.usuario?.perfil?.nomePerfil);
  const canDelete = perfil === "Administrador" || perfil === "EngenhariaObras";

  const { data: obrasData } = useObras();
  const cardAtualizado = useMemo(() => {
    if (!card) return null;
    return obrasData?.itens.find((o) => Number(o.id) === Number(card.id)) || card;
  }, [card, obrasData]);

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

  if (!cardEfetivo) return null;

  const valorFormatado = formatarMoeda(obterValorObra(cardEfetivo), { semCentavos: true });
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

  return (
    <>
      <Drawer
        isOpen={isOpen}
        onClose={onClose}
        tamanho="md"
        headerCustomizado={
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
        }
      >
        {/* Corpo do Drawer com scroll suave */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          <div>
            <h2 className="text-lg font-bold text-slate-900">{cardEfetivo.clienteNome}</h2>
            <p className="text-xs text-slate-500 mt-0.5">{cardEfetivo.cidade || "Campinas, SP"}</p>
          </div>

          {/* Destaque Financeiro */}
          <div className="bg-emerald-50 border border-emerald-200/80 rounded-xl p-3.5 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-semibold text-emerald-800 uppercase tracking-wider block">
                Valor Total do Contrato
              </span>
              <span className="text-xl font-bold text-emerald-950 font-mono mt-0.5 block">
                {valorFormatado}
              </span>
            </div>
            <div className="w-9 h-9 rounded-lg bg-emerald-100/80 flex items-center justify-center text-emerald-700">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
              Especificações Técnicas
            </h3>
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-100 flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-500 shrink-0" />
                <div>
                  <p className="text-slate-400 text-[10px]">Potência</p>
                  <p className="font-semibold text-slate-800">{potenciaEstimada} kWp</p>
                </div>
              </div>
              <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-100 flex items-center gap-2">
                <Package className="w-4 h-4 text-blue-500 shrink-0" />
                <div>
                  <p className="text-slate-400 text-[10px]">Módulos</p>
                  <p className="font-semibold text-slate-800">
                    {cardEfetivo.quantidadePaineis} un.
                  </p>
                </div>
              </div>
              <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-100 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-emerald-500 shrink-0" />
                <div>
                  <p className="text-slate-400 text-[10px]">Prazo</p>
                  <p className="font-semibold text-slate-800">
                    {cardEfetivo.prazoContratualDias || 30} dias
                  </p>
                  {cardEfetivo.dataFimEstimada && (
                    <p className="text-[10px] text-slate-500 mt-0.5">
                      Término: {formatarDataBR(cardEfetivo.dataFimEstimada)}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
              Cronograma & Equipe
            </h3>
            {alocacao ? (
              <div className="p-3 bg-blue-50/60 border border-blue-100 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-blue-900">
                    <Users className="w-4 h-4 text-blue-600" />
                    <span>{equipeAlocada?.nome || `Equipe #${alocacao.equipeId}`}</span>
                  </div>
                  <span className="text-[10px] bg-blue-100 text-blue-800 px-2 py-0.5 rounded font-medium">
                    Programada
                  </span>
                </div>
                <div className="text-[11px] text-blue-800 flex items-center gap-2">
                  <Calendar className="w-3.5 h-3.5 text-blue-500" />
                  <span>
                    {formatarDataBR(alocacao.dataInicio)} até {formatarDataBR(alocacao.dataFim)}
                  </span>
                </div>
              </div>
            ) : (
              <div className="p-3 bg-slate-50 border border-dashed border-slate-200 rounded-xl text-center">
                <Clock className="w-4 h-4 text-slate-400 mx-auto mb-1" />
                <p className="text-xs text-slate-500 font-medium">Nenhuma equipe alocada</p>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  Arraste no Cronograma Gantt para agendar a instalação
                </p>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
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

        <div className="p-4 border-t border-slate-100 bg-slate-50/60 flex items-center justify-end gap-2 shrink-0">
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
      </Drawer>

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
}
