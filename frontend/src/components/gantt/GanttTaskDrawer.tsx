// frontend/src/components/gantt/GanttTaskDrawer.tsx
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  X,
  Package,
  Zap,
  Calendar,
  Clock,
  ExternalLink,
  Trash2,
  Tag,
  Sun,
  FileCheck,
  Loader2,
  AlertTriangle,
  Users,
  Pencil,
  Check,
} from "lucide-react";
import type { ObraCard } from "@/types";
import { COLUNAS_KANBAN } from "@/constants/kanbanStatus";
import {
  formatarDiasUteis,
  formatarDataBR,
  dataFimExclusivaParaUltimoDiaUtil,
  ultimoDiaUtilParaDataFimExclusiva,
} from "@/lib/formatters";
import { useHomologacao } from "@/hooks/api/useObras";
import { ConfirmDialog } from "@/components/feedback/ConfirmDialog";
import { toast } from "sonner";

export interface TarefaDetalhes {
  id: number;
  obraId: number;
  equipeId: number;
  nomeEquipe: string;
  nomeCliente: string;
  dataInicio: string;
  dataFim: string;
  duracaoDias: number;
  paineis?: number;
  obra?: ObraCard;
}

interface GanttTaskDrawerProps {
  tarefa: TarefaDetalhes | null;
  onClose: () => void;
  canEdit: boolean;
  onDesalocar: (id: number) => void;
  equipes?: { id: number; nome: string }[];
  onMudarEquipe?: (id: number, novaEquipeId: number) => Promise<void>;
  onReorder?: (id: number, novaDataInicio: string, novaDataFim: string) => void;
}

export function GanttTaskDrawer({
  tarefa,
  onClose,
  canEdit,
  onDesalocar,
  equipes,
  onMudarEquipe,
  onReorder,
}: GanttTaskDrawerProps) {
  const navigate = useNavigate();
  const [confirmarDesalocacao, setConfirmarDesalocacao] = useState(false);
  const [mudandoEquipe, setMudandoEquipe] = useState(false);
  const [editandoTermino, setEditandoTermino] = useState(false);
  const [novoTerminoInput, setNovoTerminoInput] = useState("");

  // Limpa o modo de edição se a tarefa selecionada mudar
  const [prevTarefaId, setPrevTarefaId] = useState<number | undefined>(tarefa?.id);
  if (tarefa?.id !== prevTarefaId) {
    setPrevTarefaId(tarefa?.id);
    setEditandoTermino(false);
    setNovoTerminoInput("");
  }

  const handleIniciarEdicaoTermino = () => {
    if (!tarefa) return;
    setNovoTerminoInput(dataFimExclusivaParaUltimoDiaUtil(tarefa.dataFim));
    setEditandoTermino(true);
  };

  const handleSalvarTermino = () => {
    if (!tarefa || !novoTerminoInput) return;
    const dataInicioLimpa = String(tarefa.dataInicio).split(/[T ]/)[0];
    if (novoTerminoInput < dataInicioLimpa) {
      toast.error("Data de término não pode ser anterior à data de início.");
      return;
    }
    const dataFimExclusiva = ultimoDiaUtilParaDataFimExclusiva(novoTerminoInput);
    onReorder?.(tarefa.id, tarefa.dataInicio, dataFimExclusiva);
    setEditandoTermino(false);
  };

  const handleCancelarEdicaoTermino = () => {
    setEditandoTermino(false);
    setNovoTerminoInput("");
  };

  const { data: homologacao, isLoading: carregandoHomologacao } = useHomologacao(
    tarefa?.obraId
  );

  useEffect(() => {
    if (!tarefa) return;
    document.querySelectorAll(".gantt_tooltip").forEach((el) => el.remove());
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !confirmarDesalocacao) onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [tarefa, confirmarDesalocacao, onClose]);

  if (!tarefa) return null;

  const { obra } = tarefa;

  const materialStatus = obra?.status;
  const materialSeparado =
    materialStatus === "Separado" ||
    materialStatus === "EmAndamento" ||
    materialStatus === "Concluido";
  const materialNoDeposito = materialStatus === "NoDeposito";
  const materialComprado = materialStatus === "MaterialComprado";
  const materialAssistencia = materialStatus === "Assistencia";

  const parecerStatus = homologacao?.parecerAcesso || "Pendente";
  const homologacaoAprovada = parecerStatus === "Aprovado";
  const homologacaoEmAnalise = parecerStatus === "EmAnalise";
  const homologacaoReprovada = parecerStatus === "Reprovado";

  const statusObraLabel = obra
    ? COLUNAS_KANBAN.find((c) => c.id === obra.status)?.label ||
      (obra.status === "Assistencia" ? "Assistência / Manutenção" : obra.status)
    : "Obra não encontrada";

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 overflow-hidden bg-slate-900/30 backdrop-blur-xs transition-opacity animate-fade-in"
    >
      <div className="absolute inset-y-0 right-0 max-w-full flex pl-10 pointer-events-none">
        <div
          onClick={(e) => e.stopPropagation()}
          className="pointer-events-auto w-screen max-w-md bg-white shadow-2xl border-l border-slate-200 flex flex-col animate-slide-in-right"
        >
          {/* Header do Drawer */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50/70">
            <div>
              <span className="text-[11px] font-semibold text-blue-600 tracking-wider uppercase">
                {tarefa.nomeEquipe}
              </span>
              <h2 className="text-base font-bold text-slate-800 leading-snug">
                {tarefa.nomeCliente}
              </h2>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Conteúdo */}
          <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-5">
            {/* Seletor de Equipe Rápido */}
            <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3.5 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-600 shrink-0" />
                <div>
                  <span className="text-[10px] text-slate-400 block font-semibold uppercase">
                    Equipe Responsável
                  </span>
                  <span className="text-xs font-semibold text-slate-800">
                    {tarefa.nomeEquipe}
                  </span>
                </div>
              </div>

              {canEdit && equipes && equipes.length > 0 && onMudarEquipe && (
                <div className="flex items-center gap-1.5">
                  <select
                    disabled={mudandoEquipe}
                    value={tarefa.equipeId}
                    onChange={async (e) => {
                      const novaEq = Number(e.target.value);
                      if (novaEq && novaEq !== tarefa.equipeId) {
                        try {
                          setMudandoEquipe(true);
                          await onMudarEquipe(tarefa.id, novaEq);
                        } finally {
                          setMudandoEquipe(false);
                        }
                      }
                    }}
                    className="bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-xs font-medium text-slate-700 hover:border-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer disabled:opacity-50"
                  >
                    {equipes.map((eq) => (
                      <option key={eq.id} value={eq.id}>
                        {eq.nome}
                      </option>
                    ))}
                  </select>
                  {mudandoEquipe && <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600" />}
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              {/* Card Materiais */}
              <div
                className={`p-3 rounded-xl border flex flex-col gap-1.5 ${
                  !obra
                    ? "bg-slate-50 border-slate-200 text-slate-600"
                    : materialSeparado
                    ? "bg-emerald-50/60 border-emerald-200 text-emerald-900"
                    : materialNoDeposito
                    ? "bg-amber-50/60 border-amber-200 text-amber-900"
                    : materialAssistencia
                    ? "bg-purple-50/60 border-purple-200 text-purple-900"
                    : "bg-blue-50/60 border-blue-200 text-blue-900"
                }`}
              >
                <div className="flex items-center gap-1.5 text-xs font-semibold">
                  <Package className="w-4 h-4" />
                  <span>Materiais</span>
                </div>
                <p className="text-[11px] font-medium">
                  {!obra
                    ? "Dados indisponíveis"
                    : materialSeparado
                    ? "Separados p/ Obra"
                    : materialNoDeposito
                    ? "No Depósito (Aguardando)"
                    : materialComprado
                    ? "Comprados (Em trânsito)"
                    : materialAssistencia
                    ? "Peças p/ Manutenção"
                    : "Status não definido"}
                </p>
              </div>

              {/* Card Homologação */}
              <div
                className={`p-3 rounded-xl border flex flex-col gap-1.5 ${
                  carregandoHomologacao
                    ? "bg-slate-50/70 border-slate-200 text-slate-700"
                    : homologacaoAprovada
                    ? "bg-emerald-50/60 border-emerald-200 text-emerald-900"
                    : homologacaoEmAnalise
                    ? "bg-blue-50/60 border-blue-200 text-blue-900"
                    : homologacaoReprovada
                    ? "bg-red-50/60 border-red-200 text-red-900"
                    : "bg-amber-50/60 border-amber-200 text-amber-900"
                }`}
              >
                <div className="flex items-center gap-1.5 text-xs font-semibold">
                  {carregandoHomologacao ? (
                    <Zap className="w-4 h-4 text-slate-400" />
                  ) : homologacaoReprovada ? (
                    <AlertTriangle className="w-4 h-4 text-red-600" />
                  ) : (
                    <Zap className="w-4 h-4" />
                  )}
                  <span>Homologação</span>
                  {carregandoHomologacao && (
                    <Loader2 className="w-3 h-3 animate-spin text-slate-400 ml-auto" />
                  )}
                </div>
                <p className="text-[11px] font-medium">
                  {carregandoHomologacao
                    ? "Consultando concessionária..."
                    : homologacaoAprovada
                    ? "Aprovado na Concessionária"
                    : homologacaoEmAnalise
                    ? "Em Análise pela Rede"
                    : homologacaoReprovada
                    ? "Reprovado pela Concessionária"
                    : "Pendente de Envio"}
                </p>
              </div>
            </div>

            {/* Dados do Cronograma */}
            <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-4 flex flex-col gap-3">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Dados do Cronograma
              </h4>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="flex items-center gap-2 text-slate-600">
                  <Calendar className="w-4 h-4 text-slate-400" />
                  <div>
                    <span className="text-[10px] text-slate-400 block">Início</span>
                    <strong className="text-slate-800">{formatarDataBR(tarefa.dataInicio)}</strong>
                  </div>
                </div>

                <div
                  className={`flex items-center gap-2 text-slate-600 transition-all ${
                    editandoTermino
                      ? "col-span-2 bg-blue-50/60 p-2.5 rounded-xl border border-blue-200 shadow-xs"
                      : ""
                  }`}
                >
                  <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <span className="text-[10px] text-slate-400 block font-semibold uppercase">
                      Término Previsto
                    </span>
                    {editandoTermino ? (
                      <div className="flex items-center gap-2 mt-1">
                        <input
                          type="date"
                          min={String(tarefa.dataInicio).split(/[T ]/)[0]}
                          value={novoTerminoInput}
                          onChange={(e) => setNovoTerminoInput(e.target.value)}
                          className="flex-1 min-w-0 px-2 py-1 text-xs border border-blue-400 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                        />
                        <button
                          type="button"
                          onClick={handleSalvarTermino}
                          title="Salvar término"
                          className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-emerald-700 bg-emerald-100 hover:bg-emerald-200 rounded-lg cursor-pointer transition-colors shrink-0"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Salvar</span>
                        </button>
                        <button
                          type="button"
                          onClick={handleCancelarEdicaoTermino}
                          title="Cancelar"
                          className="p-1 text-slate-400 hover:bg-slate-200 rounded-lg cursor-pointer transition-colors shrink-0"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        <strong className="text-slate-800">
                          {formatarDataBR(dataFimExclusivaParaUltimoDiaUtil(tarefa.dataFim))}
                        </strong>
                        {canEdit && (
                          <button
                            type="button"
                            onClick={handleIniciarEdicaoTermino}
                            title="Ajustar data de término"
                            className="p-0.5 text-slate-400 hover:text-blue-600 rounded transition-colors cursor-pointer"
                          >
                            <Pencil className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 text-slate-600">
                  <Clock className="w-4 h-4 text-slate-400" />
                  <div>
                    <span className="text-[10px] text-slate-400 block">Duração</span>
                    <strong className="text-slate-800">{formatarDiasUteis(tarefa.duracaoDias)}</strong>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-slate-600">
                  <Sun className="w-4 h-4 text-amber-500" />
                  <div>
                    <span className="text-[10px] text-slate-400 block">Módulos</span>
                    <strong className="text-slate-800">{tarefa.paineis !== undefined ? `${tarefa.paineis} un.` : "—"}</strong>
                  </div>
                </div>
              </div>
            </div>

            {/* Dados da Obra */}
            {obra && (
              <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-4 flex flex-col gap-2.5 text-xs">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Ficha da Obra
                </h4>
                <div className="flex items-center justify-between text-slate-600">
                  <span className="flex items-center gap-1.5">
                    <Tag className="w-3.5 h-3.5 text-slate-400" />
                    <span>Categoria:</span>
                  </span>
                  <span className="font-semibold text-slate-900">{obra.categoria}</span>
                </div>
                <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between text-slate-600">
                  <span>Status do Funil:</span>
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-blue-100 text-blue-800">
                    {statusObraLabel}
                  </span>
                </div>
                <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between text-slate-600">
                  <span>Término Contratual:</span>
                  <strong className="text-slate-900">{formatarDataBR(obra.dataFimEstimada)}</strong>
                </div>
                {homologacao?.artTrt && (
                  <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between text-slate-600">
                    <span>Registro Técnico:</span>
                    <strong className="text-slate-900 font-mono text-[11px]">{homologacao.artTrt}</strong>
                  </div>
                )}
                {homologacao?.prazoVistoria && (
                  <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between text-slate-600">
                    <span>Prazo de Vistoria:</span>
                    <strong className="text-slate-900">{formatarDataBR(homologacao.prazoVistoria)}</strong>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer de Ações */}
          <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  void navigate("/kanban");
                  onClose();
                }}
                className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors cursor-pointer"
                title="Abrir no Kanban"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Kanban</span>
              </button>

              {canEdit && (
                <button
                  onClick={() => {
                    void navigate(`/acompanharhomologacao?obraId=${tarefa.obraId}`);
                    onClose();
                  }}
                  className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors cursor-pointer"
                  title="Acompanhar Homologação"
                >
                  <FileCheck className="w-3.5 h-3.5" />
                  <span>Homologação</span>
                </button>
              )}
            </div>

            {canEdit && (
              <button
                onClick={() => setConfirmarDesalocacao(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Desalocar</span>
              </button>
            )}
          </div>

          <ConfirmDialog
            aberto={confirmarDesalocacao}
            titulo="Confirmar Desalocação"
            descricao={`Deseja realmente remover a alocação da obra "${tarefa.nomeCliente}" da equipe ${tarefa.nomeEquipe}? A obra continuará cadastrada no sistema.`}
            labelConfirmar="Sim, Desalocar"
            variant="danger"
            onConfirmar={() => {
              onDesalocar(tarefa.id);
              setConfirmarDesalocacao(false);
              onClose();
            }}
            onCancelar={() => setConfirmarDesalocacao(false)}
          />
        </div>
      </div>
    </div>
  );
}
