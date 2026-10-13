import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
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
import { Drawer } from "@/components/ui/Drawer";
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
    if (tarefa) {
      document.querySelectorAll(".gantt_tooltip").forEach((el) => el.remove());
    }
  }, [tarefa]);

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
    <>
      <Drawer
        isOpen={Boolean(tarefa)}
        onClose={onClose}
        tamanho="md"
        headerCustomizado={
          <div className="flex items-center justify-between flex-1 pr-2">
            <div>
              <span className="text-[11px] font-semibold text-blue-600 tracking-wider uppercase">
                {tarefa.nomeEquipe}
              </span>
              <h2 className="text-base font-bold text-slate-800 leading-snug">
                {tarefa.nomeCliente}
              </h2>
            </div>
          </div>
        }
      >
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500 font-medium">Status da Obra</span>
              <span className="px-2.5 py-1 bg-white border border-slate-200 text-slate-700 font-semibold rounded-full shadow-2xs">
                {statusObraLabel}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-200/60">
              <div className="flex items-center gap-2 text-xs">
                <Sun className="w-4 h-4 text-amber-500 shrink-0" />
                <div>
                  <span className="text-slate-400 block text-[10px]">Painéis</span>
                  <span className="font-bold text-slate-700">
                    {tarefa.paineis ?? "N/D"} un.
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 text-xs">
                <Tag className="w-4 h-4 text-blue-500 shrink-0" />
                <div>
                  <span className="text-slate-400 block text-[10px]">Categoria</span>
                  <span className="font-bold text-slate-700">
                    {obra?.categoria ?? "N/D"}
                  </span>
                </div>
              </div>

              {obra?.dataFimEstimada && (
                <div className="col-span-2 flex items-center justify-between text-xs pt-2 border-t border-slate-200/60 text-slate-600">
                  <span className="text-[11px] text-slate-500">Término Contratual:</span>
                  <strong className="text-slate-800 font-semibold">{formatarDataBR(obra.dataFimEstimada)}</strong>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-slate-500" />
              <span>Datas Programadas</span>
            </h3>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-white border border-slate-200 rounded-xl shadow-2xs">
                <span className="text-slate-400 block text-[10px] mb-0.5">Início</span>
                <span className="font-semibold text-slate-800 text-sm">
                  {formatarDataBR(tarefa.dataInicio)}
                </span>
              </div>

              <div className="p-3 bg-white border border-slate-200 rounded-xl shadow-2xs relative group">
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-slate-400 block text-[10px]">Término (Último dia)</span>
                  {canEdit && !editandoTermino && (
                    <button
                      type="button"
                      onClick={handleIniciarEdicaoTermino}
                      className="text-slate-400 hover:text-blue-600 p-0.5 rounded transition-colors cursor-pointer"
                      title="Editar término"
                      aria-label="Editar data de término"
                    >
                      <Pencil className="w-3 h-3" />
                    </button>
                  )}
                </div>

                {editandoTermino ? (
                  <div className="flex items-center gap-1 mt-1">
                    <input
                      type="date"
                      value={novoTerminoInput}
                      onChange={(e) => setNovoTerminoInput(e.target.value)}
                      className="text-xs border border-blue-400 rounded px-1.5 py-0.5 font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500 w-full"
                    />
                    <button
                      type="button"
                      onClick={handleSalvarTermino}
                      className="p-1 bg-blue-600 text-white rounded hover:bg-blue-700 cursor-pointer"
                      title="Salvar término"
                    >
                      <Check className="w-3 h-3" />
                    </button>
                    <button
                      type="button"
                      onClick={handleCancelarEdicaoTermino}
                      className="p-1 bg-slate-200 text-slate-600 rounded hover:bg-slate-300 cursor-pointer"
                      title="Cancelar"
                    >
                      <span className="text-[10px] font-bold px-0.5">✕</span>
                    </button>
                  </div>
                ) : (
                  <span className="font-semibold text-slate-800 text-sm">
                    {formatarDataBR(dataFimExclusivaParaUltimoDiaUtil(tarefa.dataFim))}
                  </span>
                )}
              </div>
            </div>

            <div className="p-3 bg-blue-50/60 border border-blue-100 rounded-xl flex items-center justify-between text-xs text-blue-900">
              <span className="flex items-center gap-1.5 font-medium">
                <Clock className="w-4 h-4 text-blue-500" /> Duração Útil Estimada:
              </span>
              <span className="font-bold">{formatarDiasUteis(tarefa.duracaoDias)}</span>
            </div>
          </div>

          {/* Troca Rápida de Equipe */}
          {canEdit && equipes && equipes.length > 0 && onMudarEquipe && (
            <div className="space-y-2">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <Users className="w-4 h-4 text-slate-500" />
                <span>Reatribuir Equipe</span>
              </h3>
              <div className="flex items-center gap-2">
                <select
                  value={tarefa.equipeId}
                  disabled={mudandoEquipe}
                  onChange={async (e) => {
                    const novaEquipeId = Number(e.target.value);
                    if (novaEquipeId && novaEquipeId !== tarefa.equipeId) {
                      setMudandoEquipe(true);
                      try {
                        await onMudarEquipe(tarefa.id, novaEquipeId);
                      } finally {
                        setMudandoEquipe(false);
                      }
                    }
                  }}
                  className="flex-1 text-xs border border-slate-200 rounded-lg px-3 py-2 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer disabled:opacity-60"
                >
                  {equipes.map((eq) => (
                    <option key={eq.id} value={eq.id}>
                      {eq.nome}
                    </option>
                  ))}
                </select>
                {mudandoEquipe && <Loader2 className="w-4 h-4 animate-spin text-blue-600" />}
              </div>
            </div>
          )}

          {/* Prontidão para Execução */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <Package className="w-4 h-4 text-slate-500" />
              <span>Prontidão Operacional</span>
            </h3>

            <div className="space-y-2">
              {/* Card de Material */}
              <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-1 shadow-2xs">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500 font-medium flex items-center gap-1.5">
                    <Package className="w-3.5 h-3.5 text-slate-400" /> Insumos & Materiais
                  </span>
                  <span
                    className={`font-semibold px-2 py-0.5 rounded text-[11px] ${
                      materialSeparado
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        : materialNoDeposito
                        ? "bg-blue-50 text-blue-700 border border-blue-200"
                        : materialComprado
                        ? "bg-purple-50 text-purple-700 border border-purple-200"
                        : materialAssistencia
                        ? "bg-amber-50 text-amber-700 border border-amber-200"
                        : "bg-red-50 text-red-700 border border-red-200"
                    }`}
                  >
                    {materialSeparado
                      ? "Kit Pronto / Separado"
                      : materialNoDeposito
                      ? "No Depósito Central"
                      : materialComprado
                      ? "Comprado"
                      : materialAssistencia
                      ? "Assistência"
                      : "Pendente"}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">
                  {materialSeparado
                    ? "Todos os componentes estão prontos para saída a campo."
                    : materialNoDeposito
                    ? "Materiais recebidos no depósito central da empresa."
                    : materialComprado
                    ? "Insumos adquiridos pelo setor de compras em entrega."
                    : materialAssistencia
                    ? "Aguardando peças de reposição para manutenção."
                    : "Obra ainda não possui os kits separados para instalação."}
                </p>
              </div>

              <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-1 shadow-2xs">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500 font-medium flex items-center gap-1.5">
                    <FileCheck className="w-3.5 h-3.5 text-slate-400" /> Parecer de Acesso
                  </span>
                  <span
                    className={`font-semibold px-2 py-0.5 rounded text-[11px] flex items-center gap-1 ${
                      carregandoHomologacao
                        ? "bg-slate-100 text-slate-500"
                        : homologacaoAprovada
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        : homologacaoEmAnalise
                        ? "bg-blue-50 text-blue-700 border border-blue-200"
                        : homologacaoReprovada
                        ? "bg-red-50 text-red-700 border border-red-200"
                        : "bg-amber-50 text-amber-700 border border-amber-200"
                    }`}
                  >
                    {carregandoHomologacao ? (
                      <>
                        <Loader2 className="w-3 h-3 animate-spin" /> Verificando...
                      </>
                    ) : homologacaoReprovada ? (
                      <>
                        <AlertTriangle className="w-3 h-3 text-red-600" /> Reprovado
                      </>
                    ) : (
                      parecerStatus
                    )}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">
                  {carregandoHomologacao && "Consultando concessionária de energia..."}
                  {!carregandoHomologacao && homologacaoAprovada && (
                    "Projeto aprovado na concessionária. Instalação liberada para ligação."
                  )}
                  {!carregandoHomologacao && homologacaoEmAnalise && (
                    "Documentação em análise técnica junto à rede distribuidora."
                  )}
                  {!carregandoHomologacao && homologacaoReprovada && (
                    "Pendências técnicas apontadas. Acesso reprovado provisoriamente."
                  )}
                  {!carregandoHomologacao && parecerStatus === "Pendente" && (
                    "Aguardando submissão do projeto elétrico à concessionária."
                  )}
                </p>
                {(homologacao?.artTrt || homologacao?.prazoVistoria) && (
                  <div className="pt-2 mt-2 border-t border-slate-100 grid grid-cols-2 gap-2 text-[11px]">
                    {homologacao.artTrt && (
                      <div>
                        <span className="text-slate-400 block text-[10px]">Registro Técnico</span>
                        <span className="font-mono font-semibold text-slate-700">{homologacao.artTrt}</span>
                      </div>
                    )}
                    {homologacao.prazoVistoria && (
                      <div>
                        <span className="text-slate-400 block text-[10px]">Prazo de Vistoria</span>
                        <span className="font-semibold text-slate-700">{formatarDataBR(homologacao.prazoVistoria)}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-slate-100 bg-slate-50/60 flex items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                onClose();
                void navigate(`/obras/${tarefa.obraId}`);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Ver Obra</span>
            </button>

            {canEdit && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  void navigate(`/acompanharhomologacao?obraId=${tarefa.obraId}`);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors cursor-pointer"
                title="Acompanhar homologação na concessionária"
              >
                <Zap className="w-3.5 h-3.5" />
                <span>Homologação</span>
              </button>
            )}
          </div>

          {canEdit && (
            <button
              type="button"
              onClick={() => setConfirmarDesalocacao(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Desalocar</span>
            </button>
          )}
        </div>
      </Drawer>

      <ConfirmDialog
        isOpen={confirmarDesalocacao}
        onClose={() => setConfirmarDesalocacao(false)}
        onConfirm={() => {
          onDesalocar(tarefa.id);
          setConfirmarDesalocacao(false);
          onClose();
        }}
        titulo="Confirmar Desalocação"
        descricao={`Deseja realmente remover a alocação da obra "${tarefa.nomeCliente}" da equipe ${tarefa.nomeEquipe}? A obra continuará cadastrada no sistema.`}
        labelConfirmar="Sim, Desalocar"
        variant="danger"
      />
    </>
  );
}

export default GanttTaskDrawer;
