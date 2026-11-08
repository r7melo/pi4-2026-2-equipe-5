import { useState, useEffect, useRef, useCallback, type ReactNode } from "react";
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
} from "lucide-react";
import type { ObraCard, Programacao } from "@/types";
import { obterConflitosEquipe } from "@/features/cronograma/lib/ganttCalculos";
import { COLUNAS_KANBAN } from "@/shared/constants/kanbanStatus";
import {
  formatarDiasUteis,
  formatarDataBR,
} from "@/shared/lib/formatters";
import { useHomologacao } from "@/features/obras/hooks/useObras";
import { ConfirmDialog } from "@/shared/components/feedback/ConfirmDialog";
import { Drawer } from "@/shared/components/ui/Drawer";
import { cn } from "@/shared/lib/utils";
import {
  dataCivilValida,
  proximoDiaUtilCivil,
  diasUteisCivis,
} from "@/shared/lib/datasCivis";
import {
  capturarSessaoOperacional,
  sessaoOperacionalVigente,
} from "@/shared/lib/sessaoOperacao";

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
  programacoes?: Programacao[];
  onMudarEquipe?: (id: number, novaEquipeId: number) => Promise<void>;
  renderizarAcoesObra?: (obraId: number) => ReactNode;
  onReagendar?: (id: number, novaDataInicio: string) => Promise<boolean | null>;
  reagendamentoBloqueado?: boolean;
  reagendamentoFase?: "livre" | "salvando" | "sincronizando" | "recuperacao";
  avisoReagendamento?: string | null;
  focoRetorno?: () => HTMLElement | null;
}

const DEFAULT_PROGRAMACOES: Programacao[] = [];

export function GanttTaskDrawer({
  tarefa,
  onClose,
  canEdit,
  onDesalocar,
  equipes,
  programacoes = DEFAULT_PROGRAMACOES,
  onMudarEquipe,
  renderizarAcoesObra,
  onReagendar,
  reagendamentoBloqueado = false,
  reagendamentoFase = "livre",
  avisoReagendamento = null,
  focoRetorno,
}: GanttTaskDrawerProps) {
  const navigate = useNavigate();
  const [confirmarDesalocacao, setConfirmarDesalocacao] = useState(false);
  const [mudandoEquipe, setMudandoEquipe] = useState(false);
  const [dataInicioRascunho, setDataInicioRascunho] = useState(tarefa?.dataInicio ?? "");
  const [erroDataInicio, setErroDataInicio] = useState<string | null>(null);
  const [avisoAjuste, setAvisoAjuste] = useState<string | null>(null);
  const [mensagemSucesso, setMensagemSucesso] = useState<string | null>(null);
  const [salvandoLocal, setSalvandoLocal] = useState(false);
  const [prevTarefaInfo, setPrevTarefaInfo] = useState(() => ({
    id: tarefa?.id ?? null,
    dataInicio: tarefa?.dataInicio ?? "",
  }));

  const inputDataInicioRef = useRef<HTMLInputElement>(null);
  const botaoDesalocarRef = useRef<HTMLButtonElement>(null);
  const desalocandoRef = useRef(false);
  const podeRestaurarFocoDesalocacao = useCallback(() => !desalocandoRef.current, []);
  const operacaoContador = useRef<number>(0);

  const tarefaIdAtual = tarefa?.id ?? null;
  const dataAutoritativaAtual = tarefa?.dataInicio ?? "";

  if (tarefaIdAtual !== prevTarefaInfo.id) {
    setPrevTarefaInfo({
      id: tarefaIdAtual,
      dataInicio: dataAutoritativaAtual,
    });
    setDataInicioRascunho(dataAutoritativaAtual);
    setErroDataInicio(null);
    setAvisoAjuste(null);
    setMensagemSucesso(null);
    setSalvandoLocal(false);
  } else if (tarefa && dataAutoritativaAtual !== prevTarefaInfo.dataInicio) {
    setPrevTarefaInfo({
      id: tarefaIdAtual,
      dataInicio: dataAutoritativaAtual,
    });
    setDataInicioRascunho(dataAutoritativaAtual);
  }

  const { data: homologacao, isLoading: carregandoHomologacao } = useHomologacao(
    tarefa?.obraId
  );

  useEffect(() => {
    if (tarefa) {
      document.querySelectorAll(".gantt_tooltip").forEach((el) => el.remove());
    }
  }, [tarefa]);

  useEffect(() => {
    const contador = operacaoContador;
    return () => {
      contador.current += 1;
    };
  }, []);

  const handleDataChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const valor = e.target.value;
    setMensagemSucesso(null);

    if (!valor) {
      setDataInicioRascunho("");
      setAvisoAjuste(null);
      setErroDataInicio("Data inicial é obrigatória.");
      return;
    }

    if (!dataCivilValida(valor)) {
      setDataInicioRascunho(valor);
      setAvisoAjuste(null);
      setErroDataInicio("Data inicial inválida. Use o formato AAAA-MM-DD.");
      return;
    }

    setErroDataInicio(null);
    const normalizada = proximoDiaUtilCivil(valor);
    if (normalizada !== valor) {
      setDataInicioRascunho(normalizada);
      setAvisoAjuste("Data ajustada para a próxima segunda-feira útil.");
    } else {
      setDataInicioRascunho(valor);
      setAvisoAjuste(null);
    }
  };

  const handleCancelarEdicao = () => {
    if (tarefa) {
      setDataInicioRascunho(tarefa.dataInicio);
    }
    setErroDataInicio(null);
    setAvisoAjuste(null);
    onClose();
  };

  const handleSubmitReagendamento = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tarefa || !canEdit || !onReagendar || salvandoLocal || reagendamentoBloqueado || reagendamentoFase !== "livre") {
      return;
    }

    if (!dataInicioRascunho || dataInicioRascunho.trim() === "") {
      setErroDataInicio("Data inicial é obrigatória.");
      inputDataInicioRef.current?.focus();
      return;
    }

    if (!dataCivilValida(dataInicioRascunho)) {
      setErroDataInicio("Data inicial inválida. Use o formato AAAA-MM-DD.");
      inputDataInicioRef.current?.focus();
      return;
    }

    const dataFinal = proximoDiaUtilCivil(dataInicioRascunho);
    if (dataFinal !== dataInicioRascunho) {
      setDataInicioRascunho(dataFinal);
      setAvisoAjuste("Data ajustada para a próxima segunda-feira útil.");
    }

    if (dataFinal === tarefa.dataInicio) {
      setErroDataInicio(null);
      setAvisoAjuste(null);
      setMensagemSucesso("Data inicial já está definida para este dia.");
      return;
    }

    setSalvandoLocal(true);
    setErroDataInicio(null);
    setMensagemSucesso(null);
    const operacaoAtual = ++operacaoContador.current;
    const sessaoOrigem = capturarSessaoOperacional();
    const tarefaIdOrigem = tarefa.id;

    try {
      const sucesso = await onReagendar(tarefaIdOrigem, dataFinal);
      if (!sessaoOperacionalVigente(sessaoOrigem) || operacaoContador.current !== operacaoAtual) {
        return;
      }
      if (sucesso === true) {
        setMensagemSucesso("Data inicial atualizada com sucesso.");
      } else if (sucesso === false) {
        setErroDataInicio("Não foi possível atualizar a data inicial.");
      }
    } catch {
      if (sessaoOperacionalVigente(sessaoOrigem) && operacaoContador.current === operacaoAtual) {
        setErroDataInicio("Não foi possível atualizar a data inicial.");
      }
    } finally {
      if (sessaoOperacionalVigente(sessaoOrigem) && operacaoContador.current === operacaoAtual) {
        setSalvandoLocal(false);
      }
    }
  };

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
        gerenciarFoco={true}
        focoSuspenso={confirmarDesalocacao}
        focoRetorno={focoRetorno}
        ariaLabel={`Detalhes da alocação: ${tarefa.nomeCliente} — Equipe ${tarefa.nomeEquipe}`}
        acoesHeader={renderizarAcoesObra && tarefa?.obraId ? renderizarAcoesObra(tarefa.obraId) : undefined}
        headerCustomizado={
          <div className="flex items-center justify-between flex-1 pr-2">
            <div>
              <span className="text-[11px] font-semibold text-info tracking-wider uppercase">
                {tarefa.nomeEquipe}
              </span>
              <h2 className="text-base font-bold text-foreground-secondary leading-snug">
                {tarefa.nomeCliente}
              </h2>
            </div>
          </div>
        }
      >
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          <div className="bg-surface-subtle rounded-xl p-4 border border-border-subtle space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground font-medium">Status da Obra</span>
              <span className="px-2.5 py-1 bg-surface border border-border-subtle text-foreground-muted font-semibold rounded-full shadow-2xs">
                {statusObraLabel}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-border-subtle/60">
              <div className="flex items-center gap-2 text-xs">
                <Sun className="w-4 h-4 text-warning shrink-0" />
                <div>
                  <span className="text-muted-foreground block text-[10px]">Painéis</span>
                  <span className="font-bold text-foreground-muted">
                    {tarefa.paineis ?? "N/D"} un.
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 text-xs">
                <Tag className="w-4 h-4 text-info shrink-0" />
                <div>
                  <span className="text-muted-foreground block text-[10px]">Categoria</span>
                  <span className="font-bold text-foreground-muted">
                    {obra?.categoria ?? "N/D"}
                  </span>
                </div>
              </div>

              {obra?.dataFimEstimada && (
                <div className="col-span-2 flex items-center justify-between text-xs pt-2 border-t border-border-subtle/60 text-muted-foreground">
                  <span className="text-[11px] text-muted-foreground">Término Contratual:</span>
                  <strong className="text-foreground-secondary font-semibold">{formatarDataBR(obra.dataFimEstimada)}</strong>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="text-xs font-bold text-foreground-secondary uppercase tracking-wider flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              <span>Datas Programadas</span>
            </h3>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-surface border border-border-subtle rounded-xl shadow-2xs">
                <span className="text-muted-foreground block text-[10px] mb-0.5">Início</span>
                <span className="font-semibold text-foreground-secondary text-sm">
                  {formatarDataBR(tarefa.dataInicio)}
                </span>
              </div>

              <div className="p-3 bg-surface border border-border-subtle rounded-xl shadow-2xs">
                <span className="text-muted-foreground block text-[10px] mb-0.5">Término (Último dia)</span>
                <span className="font-semibold text-foreground-secondary text-sm">
                  {formatarDataBR(tarefa.dataFim)}
                </span>
              </div>
            </div>

            <div className="p-3 bg-info-light/60 border border-info-border rounded-xl flex items-center justify-between text-xs text-info">
              <span className="flex items-center gap-1.5 font-medium">
                <Clock className="w-4 h-4 text-info" /> Duração Útil (pelas datas):
              </span>
              <span className="font-bold">
                {formatarDiasUteis(
                  diasUteisCivis(tarefa.dataInicio, tarefa.dataFim)
                )}
              </span>
            </div>

            {/* Formulário Acessível de Edição da Data Inicial */}
            <form onSubmit={handleSubmitReagendamento} className="p-3 bg-surface border border-border-subtle rounded-xl space-y-3">
              <div className="space-y-1.5">
                <label
                  htmlFor="gantt-input-data-inicio"
                  className="text-xs font-semibold text-foreground-secondary block"
                >
                  Data Inicial
                </label>
                <input
                  ref={inputDataInicioRef}
                  id="gantt-input-data-inicio"
                  type="date"
                  min="0001-01-01"
                  max="9999-12-31"
                  value={dataInicioRascunho}
                  readOnly={!canEdit}
                  disabled={salvandoLocal || reagendamentoBloqueado || reagendamentoFase !== "livre"}
                  aria-describedby={
                    erroDataInicio
                      ? "gantt-data-inicio-hint gantt-data-inicio-erro"
                      : "gantt-data-inicio-hint"
                  }
                  aria-invalid={Boolean(erroDataInicio)}
                  onChange={handleDataChange}
                  className={cn(
                    "w-full min-h-[44px] px-3 py-2 text-xs border rounded-lg bg-surface text-foreground-secondary focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-border-strong transition-colors",
                    erroDataInicio
                      ? "border-destructive focus-visible:ring-destructive"
                      : "border-border-subtle",
                    !canEdit ? "bg-muted cursor-not-allowed opacity-80" : "cursor-pointer"
                  )}
                />
                <p id="gantt-data-inicio-hint" className="text-[11px] text-muted-foreground">
                  Alocações iniciam em dias úteis. Datas em sábados ou domingos são ajustadas automaticamente para a segunda-feira seguinte.
                </p>
              </div>

              {avisoAjuste && !erroDataInicio && (
                <p
                  role="status"
                  aria-live="polite"
                  className="text-[11px] font-medium text-info flex items-center gap-1"
                >
                  <span>{avisoAjuste}</span>
                </p>
              )}

              {erroDataInicio && (
                <p
                  id="gantt-data-inicio-erro"
                  role="alert"
                  aria-live="assertive"
                  className="text-[11px] font-medium text-destructive flex items-center gap-1"
                >
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  <span>{erroDataInicio}</span>
                </p>
              )}

              {mensagemSucesso && !erroDataInicio && (
                <p
                  role="status"
                  aria-live="polite"
                  className="text-[11px] font-medium text-success flex items-center gap-1"
                >
                  <span>{mensagemSucesso}</span>
                </p>
              )}

              {avisoReagendamento && (
                <div
                  role="alert"
                  className="p-2.5 bg-warning-light/60 border border-warning-border rounded-lg text-xs text-warning flex items-start gap-2"
                >
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span className="flex-1">{avisoReagendamento}</span>
                </div>
              )}

              {(salvandoLocal || reagendamentoFase !== "livre") && (
                <div
                  role="status"
                  aria-live="polite"
                  className="flex items-center gap-2 text-xs text-info"
                >
                  {reagendamentoFase === "recuperacao" ? (
                    <>
                      <AlertTriangle className="w-3.5 h-3.5 text-warning shrink-0" />
                      <span className="text-warning">Em recuperação. Aguardando sincronização com o servidor...</span>
                    </>
                  ) : reagendamentoFase === "sincronizando" ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
                      <span>Sincronizando cronograma com o servidor...</span>
                    </>
                  ) : (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
                      <span>Salvando nova data da alocação...</span>
                    </>
                  )}
                </div>
              )}

              {canEdit && (
                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="submit"
                    disabled={
                      !onReagendar ||
                      salvandoLocal ||
                      reagendamentoBloqueado ||
                      reagendamentoFase !== "livre"
                    }
                    className="min-h-[44px] min-w-[44px] px-4 py-2 text-xs font-semibold text-primary-foreground bg-info hover:bg-info-hover rounded-lg transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-1.5 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-border-strong"
                  >
                    {salvandoLocal || reagendamentoFase === "salvando" ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Salvando...</span>
                      </>
                    ) : reagendamentoFase === "sincronizando" ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Sincronizando...</span>
                      </>
                    ) : (
                      <span>Salvar</span>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={handleCancelarEdicao}
                    className="min-h-[44px] min-w-[44px] px-4 py-2 text-xs font-semibold text-foreground-muted bg-surface border border-border-subtle hover:bg-surface-subtle rounded-lg transition-colors cursor-pointer inline-flex items-center justify-center focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-border-strong"
                  >
                    Cancelar
                  </button>
                </div>
              )}
            </form>
          </div>

          {/* Troca Rápida de Equipe */}
          {canEdit && equipes && equipes.length > 0 && onMudarEquipe && (
            <div className="space-y-2">
              <h3 className="text-xs font-bold text-foreground-secondary uppercase tracking-wider flex items-center gap-1.5">
                <Users className="w-4 h-4 text-muted-foreground" />
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
                  className="flex-1 text-xs border border-border-subtle rounded-lg px-3 py-2 bg-surface text-foreground-secondary focus:outline-none focus:ring-2 focus:ring-info cursor-pointer disabled:opacity-60"
                >
                  {equipes.map((eq) => {
                    const conflitos = programacoes
                      ? obterConflitosEquipe(eq.id, tarefa.dataInicio, tarefa.dataFim, programacoes, tarefa.id)
                      : [];
                    const ocupada = conflitos.length > 0;
                    return (
                      <option key={eq.id} value={eq.id}>
                        {eq.nome} {ocupada ? "— [Ocupada no período]" : ""}
                      </option>
                    );
                  })}
                </select>
                {mudandoEquipe && <Loader2 className="w-4 h-4 animate-spin text-info" />}
              </div>
            </div>
          )}

          {/* Prontidão para Execução */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-foreground-secondary uppercase tracking-wider flex items-center gap-1.5">
              <Package className="w-4 h-4 text-muted-foreground" />
              <span>Prontidão Operacional</span>
            </h3>

            <div className="space-y-2">
              {/* Card de Material */}
              <div className="p-3 bg-surface border border-border-subtle rounded-xl space-y-1 shadow-2xs">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground font-medium flex items-center gap-1.5">
                    <Package className="w-3.5 h-3.5 text-subtle-foreground" /> Insumos & Materiais
                  </span>
                  <span
                    className={`font-semibold px-2 py-0.5 rounded text-[11px] ${
                      materialSeparado
                        ? "bg-success-light text-success border border-success-border"
                        : materialNoDeposito
                        ? "bg-info-light text-info border border-info-border"
                        : materialComprado
                        ? "bg-warning-light text-warning border border-warning-border"
                        : materialAssistencia
                        ? "bg-warning-light text-warning border border-warning-border"
                        : "bg-destructive-light text-destructive border border-destructive-border"
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
                <p className="text-[11px] text-muted-foreground">
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

              <div className="p-3 bg-surface border border-border-subtle rounded-xl space-y-1 shadow-2xs">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground font-medium flex items-center gap-1.5">
                    <FileCheck className="w-3.5 h-3.5 text-subtle-foreground" /> Parecer de Acesso
                  </span>
                  <span
                    className={`font-semibold px-2 py-0.5 rounded text-[11px] flex items-center gap-1 ${
                      carregandoHomologacao
                        ? "bg-muted text-foreground-muted"
                        : homologacaoAprovada
                        ? "bg-success-light text-success border border-success-border"
                        : homologacaoEmAnalise
                        ? "bg-info-light text-info border border-info-border"
                        : homologacaoReprovada
                        ? "bg-destructive-light text-destructive border border-destructive-border"
                        : "bg-warning-light text-warning border border-warning-border"
                    }`}
                  >
                    {carregandoHomologacao ? (
                      <>
                        <Loader2 className="w-3 h-3 animate-spin" /> Verificando...
                      </>
                    ) : homologacaoReprovada ? (
                      <>
                        <AlertTriangle className="w-3 h-3 text-destructive" /> Reprovado
                      </>
                    ) : (
                      parecerStatus
                    )}
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground">
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
                  <div className="pt-2 mt-2 border-t border-border-subtle grid grid-cols-2 gap-2 text-[11px]">
                    {homologacao.artTrt && (
                      <div>
                        <span className="text-muted-foreground block text-[10px]">Registro Técnico</span>
                        <span className="font-mono font-semibold text-foreground-muted">{homologacao.artTrt}</span>
                      </div>
                    )}
                    {homologacao.prazoVistoria && (
                      <div>
                        <span className="text-muted-foreground block text-[10px]">Prazo de Vistoria</span>
                        <span className="font-semibold text-foreground-muted">{formatarDataBR(homologacao.prazoVistoria)}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-border-subtle bg-surface-subtle/60 flex items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                onClose();
                void navigate(`/obras/${tarefa.obraId}`);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-foreground-muted bg-surface border border-border-subtle rounded-lg hover:bg-surface-subtle transition-colors shadow-2xs cursor-pointer"
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
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-info bg-info-light border border-info-border rounded-lg hover:bg-info-border/40 transition-colors cursor-pointer"
                title="Acompanhar homologação na concessionária"
              >
                <Zap className="w-3.5 h-3.5" />
                <span>Homologação</span>
              </button>
            )}
          </div>

          {canEdit && (
            <button
              ref={botaoDesalocarRef}
              type="button"
              onClick={() => {
                desalocandoRef.current = false;
                setConfirmarDesalocacao(true);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-destructive bg-destructive-light hover:bg-destructive-border/40 border border-destructive-border rounded-lg transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Desalocar</span>
            </button>
          )}
        </div>
      </Drawer>

      <ConfirmDialog
        isOpen={confirmarDesalocacao}
        gerenciarFoco={true}
        origemFoco={botaoDesalocarRef}
        podeRestaurarFoco={podeRestaurarFocoDesalocacao}
        onClose={() => setConfirmarDesalocacao(false)}
        onConfirm={() => {
          desalocandoRef.current = true;
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
