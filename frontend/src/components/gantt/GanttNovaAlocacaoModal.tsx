import { useState, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Calendar, Clock, Sun, AlertTriangle, Package } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import type { ObraCard, Equipe, Programacao } from "@/types";
import {
  mapearDisponibilidadeEquipes,
  type EquipeDisponibilidadeStatus,
} from "@/lib/ganttCalculos";
import {
  formatarDiasUteis,
  formatarDataBR,
  formatarDataISO,
  proximoDiaUtil,
  adicionarDiasUteis,
  obterProximoDiaUtilISO,
  normalizarDataMeioDiaUTC,
  ultimoDiaUtilParaDataFimExclusiva,
  dataFimExclusivaParaUltimoDiaUtil,
} from "@/lib/formatters";
import { toast } from "sonner";

interface GanttNovaAlocacaoModalProps {
  isOpen: boolean;
  onClose: () => void;
  obrasElegiveis: ObraCard[];
  equipes: Equipe[];
  programacoes?: Programacao[];
  onConfirmar: (dados: {
    obraId: number;
    equipeId: number;
    dataInicio: string;
    dataFim?: string;
  }) => Promise<void>;
  isLoading?: boolean;
}

const DEFAULT_PROGRAMACOES: Programacao[] = [];

export function GanttNovaAlocacaoModal({
  isOpen,
  onClose,
  obrasElegiveis,
  equipes,
  programacoes = DEFAULT_PROGRAMACOES,
  onConfirmar,
  isLoading = false,
}: GanttNovaAlocacaoModalProps) {
  const navigate = useNavigate();
  const [obraId, setObraId] = useState<number | "">("");
  const [equipeId, setEquipeId] = useState<number | "">("");
  const [dataInicio, setDataInicio] = useState(obterProximoDiaUtilISO);
  const [dataFimManual, setDataFimManual] = useState<string>("");
  const [editouFimManualmente, setEditouFimManualmente] = useState(false);

  const obraSelecionada = useMemo(
    () => obrasElegiveis.find((o) => Number(o.id) === Number(obraId)),
    [obrasElegiveis, obraId]
  );

  const paineis = obraSelecionada?.quantidadePaineis || 9;
  const duracaoEstimadaDias = Math.max(1, Math.ceil(paineis / 9));
  const potenciaEstimadaKwp = (paineis * 0.55).toFixed(1);

  const dataFimSugeridaISO = useMemo(() => {
    if (!dataInicio) return "";
    const inicioSanitizado = proximoDiaUtil(normalizarDataMeioDiaUTC(dataInicio));
    const fimCalculado = adicionarDiasUteis(inicioSanitizado, duracaoEstimadaDias);
    return dataFimExclusivaParaUltimoDiaUtil(fimCalculado);
  }, [dataInicio, duracaoEstimadaDias]);

  // Formata o término sugerido ou manual para exibição sincronizada no card de produtividade
  const dataFimEfetiva = editouFimManualmente ? dataFimManual : dataFimSugeridaISO;

  const dataFimExibicaoCard = useMemo(() => {
    return dataFimEfetiva ? formatarDataBR(dataFimEfetiva) : "—";
  }, [dataFimEfetiva]);

  const mapaDisponibilidade = useMemo(() => {
    if (!equipes || !programacoes || !dataInicio || !dataFimEfetiva) {
      return new Map<number, EquipeDisponibilidadeStatus>();
    }
    const lista = mapearDisponibilidadeEquipes(
      equipes,
      programacoes,
      dataInicio,
      dataFimEfetiva,
      true // dataFimEfetiva no input do form é inclusiva (último dia útil)
    );
    return new Map(lista.map((item) => [item.equipe.id, item]));
  }, [equipes, programacoes, dataInicio, dataFimEfetiva]);

  const equipeSelecionadaStatus = useMemo(() => {
    if (!equipeId) return null;
    return mapaDisponibilidade.get(Number(equipeId)) || null;
  }, [equipeId, mapaDisponibilidade]);

  const handleFechar = useCallback(() => {
    if (isLoading) return;
    setObraId("");
    setEquipeId("");
    setDataInicio(obterProximoDiaUtilISO());
    setDataFimManual("");
    setEditouFimManualmente(false);
    onClose();
  }, [isLoading, onClose]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!obraId || !equipeId || !dataInicio || isLoading) return;

    const dataInicioLimpa = String(dataInicio).split(/[T ]/)[0];
    const dataFimAlvo = editouFimManualmente ? dataFimManual : dataFimSugeridaISO;
    if (dataFimAlvo && dataFimAlvo < dataInicioLimpa) {
      toast.error("A Data de Término não pode ser anterior à Data de Início.");
      return;
    }

    try {
      const inicioAjustado = proximoDiaUtil(normalizarDataMeioDiaUTC(dataInicioLimpa));
      const dataFimExclusiva = dataFimAlvo
        ? ultimoDiaUtilParaDataFimExclusiva(dataFimAlvo)
        : undefined;

      await onConfirmar({
        obraId: Number(obraId),
        equipeId: Number(equipeId),
        dataInicio: formatarDataISO(inicioAjustado),
        dataFim: dataFimExclusiva,
      });
      handleFechar();
    } catch {
      /* noop */
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleFechar}
      fecharBloqueado={isLoading}
      titulo="Nova Alocação no Cronograma"
      subtitulo="Agende uma equipe para execução de obra"
      className="max-w-lg"
    >
      <form onSubmit={(e) => { void handleSubmit(e); }} className="p-5 flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-foreground-muted">
              Obra a ser executada *
            </label>
            {obrasElegiveis.length === 0 ? (
              <div className="flex flex-col gap-2 p-3.5 bg-warning-light border border-warning-border rounded-xl text-warning text-xs">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-warning" />
                  <span className="font-semibold">Nenhuma obra ativa disponível para agendamento.</span>
                </div>
                <p className="text-warning">Todas as obras cadastradas estão no status Concluído.</p>
                <button
                  type="button"
                  onClick={() => {
                    handleFechar();
                    void navigate("/kanban");
                  }}
                  className="self-start text-xs font-semibold text-info hover:text-info-hover underline cursor-pointer"
                >
                  Ir para o Funil Kanban para cadastrar nova obra →
                </button>
              </div>
            ) : (
              <select
                value={obraId}
                onChange={(e) => {
                  setObraId(e.target.value ? Number(e.target.value) : "");
                  setEditouFimManualmente(false);
                }}
                required
                disabled={isLoading}
                className="text-xs px-3 py-2 bg-surface-subtle border border-border-subtle rounded-lg text-foreground-secondary font-medium focus:bg-surface focus:outline-none focus:ring-2 focus:ring-info/20 focus:border-info disabled:opacity-60"
              >
                <option value="">Selecione uma obra...</option>
                {obrasElegiveis.map((o) => {
                  const isApta = o.status === "Separado" || o.status === "EmAndamento";
                  const badge = isApta ? "✓ Apta" : "[Aguardando Separação de Kit]";
                  return (
                    <option key={o.id} value={o.id}>
                      {o.clienteNome} ({o.quantidadePaineis} painéis · {o.categoria}) — {badge}
                    </option>
                  );
                })}
              </select>
            )}
            {obraSelecionada && (obraSelecionada.status === "MaterialComprado" || obraSelecionada.status === "NoDeposito") && (
              <div className="p-2.5 bg-surface-subtle border border-border-subtle rounded-lg flex items-center gap-2 text-[11px] text-muted-foreground animate-fade-in">
                <Package className="w-3.5 h-3.5 text-subtle-foreground shrink-0" />
                <span>
                  Esta obra ainda está na etapa de <strong>{obraSelecionada.status === "MaterialComprado" ? "Material Comprado" : "Depósito Central"}</strong>. Recomenda-se a separação física do kit antes do início dos trabalhos.
                </span>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-foreground-muted">
              Equipe Responsável *
            </label>
            <select
              value={equipeId}
              onChange={(e) => setEquipeId(e.target.value ? Number(e.target.value) : "")}
              required
              disabled={isLoading}
              className={`text-xs px-3 py-2 bg-surface-subtle border rounded-lg font-medium focus:bg-surface focus:outline-none focus:ring-2 disabled:opacity-60 ${
                equipeSelecionadaStatus?.estaOcupada
                  ? "border-warning focus:ring-warning/20 focus:border-warning text-warning"
                  : "border-border-subtle text-foreground-secondary focus:ring-info/20 focus:border-info"
              }`}
            >
              <option value="">Selecione uma equipe...</option>
              {equipes.map((eq) => {
                const status = mapaDisponibilidade.get(eq.id);
                const ocupada = Boolean(status?.estaOcupada);
                return (
                  <option key={eq.id} value={eq.id}>
                    {eq.nome} {eq.especialidade ? `(${eq.especialidade})` : ""} {ocupada ? "— [Ocupada no período]" : "— Disponível"}
                  </option>
                );
              })}
            </select>
            {equipeSelecionadaStatus?.estaOcupada && (
              <div className="p-3 bg-warning-light border border-warning-border rounded-xl text-xs text-warning flex flex-col gap-1.5 animate-fade-in">
                <div className="flex items-center gap-2 font-semibold text-warning">
                  <AlertTriangle className="w-4 h-4 text-warning shrink-0" />
                  <span>Atenção: Equipe Ocupada no Período</span>
                </div>
                {equipeSelecionadaStatus.conflitos.map((c) => (
                  <p key={c.programacao.id} className="text-[11px] text-warning leading-relaxed">
                    A equipe já possui a <strong>Obra #{c.programacao.obraId}</strong> agendada de <strong>{c.periodoFormatado}</strong> neste período.
                  </p>
                ))}
              </div>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-foreground-muted">
              Data de Início Prevista *
            </label>
            <input
              type="date"
              value={dataInicio}
              onChange={(e) => {
                const valor = e.target.value;
                if (!valor) {
                  setDataInicio("");
                  return;
                }
                const dataObj = normalizarDataMeioDiaUTC(valor);
                const dataAjustada = proximoDiaUtil(dataObj);
                setDataInicio(formatarDataISO(dataAjustada));
              }}
              required
              disabled={isLoading}
              className="text-xs px-3 py-2 bg-surface-subtle border border-border-subtle rounded-lg text-foreground-secondary font-medium focus:bg-surface focus:outline-none focus:ring-2 focus:ring-info/20 focus:border-info disabled:opacity-60"
            />
            <span className="text-[11px] text-muted-foreground">
              Finais de semana são automaticamente ajustados para o próximo dia útil.
            </span>
          </div>

          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-foreground-muted">
                Data de Término Prevista *
              </label>
              {editouFimManualmente ? (
                <button
                  type="button"
                  onClick={() => {
                    setEditouFimManualmente(false);
                    setDataFimManual("");
                  }}
                  className="text-[10px] text-info hover:text-info-hover hover:underline cursor-pointer"
                >
                  Restaurar sugestão (~9 painéis/dia)
                </button>
              ) : (
                <span className="text-[10px] text-muted-foreground">
                  Sugerido: {duracaoEstimadaDias} {duracaoEstimadaDias === 1 ? "dia útil" : "dias úteis"}
                </span>
              )}
            </div>
            <input
              type="date"
              required
              min={String(dataInicio).split(/[T ]/)[0]}
              value={dataFimEfetiva}
              onChange={(e) => {
                setEditouFimManualmente(true);
                setDataFimManual(e.target.value);
              }}
              className="w-full px-3 py-2 text-xs bg-surface-subtle border border-border-subtle text-foreground-secondary rounded-lg focus:bg-surface focus:outline-none focus:ring-2 focus:ring-info/20 focus:border-info transition-colors"
            />
          </div>

          {obraSelecionada && (
            <div className="p-3.5 bg-info-light/70 border border-info-border rounded-xl flex flex-col gap-2">
              <div className="flex items-center gap-2 text-info font-semibold text-xs">
                <Sun className="w-4 h-4 text-warning" />
                <span>Cálculo Automático de Produtividade</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs text-info">
                <div className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-info" />
                  <span>Duração: <strong>{formatarDiasUteis(duracaoEstimadaDias)}</strong></span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-info" />
                  <span>Término: <strong>{dataFimExibicaoCard}</strong></span>
                </div>
              </div>
              <p className="text-[11px] text-info leading-relaxed">
                Estimado com base em {obraSelecionada.quantidadePaineis} painéis (~{potenciaEstimadaKwp} kWp a ~9 painéis/dia útil). Finais de semana desconsiderados.
              </p>
            </div>
          )}

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-border-subtle">
            <button
              type="button"
              onClick={handleFechar}
              disabled={isLoading}
              className="px-4 py-2 text-xs font-medium text-muted-foreground hover:text-foreground-secondary rounded-lg transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!obraId || !equipeId || !dataInicio || isLoading}
              className="px-4 py-2 bg-info hover:bg-info-hover disabled:opacity-50 text-primary-foreground text-xs font-semibold rounded-lg shadow-sm transition-colors cursor-pointer disabled:cursor-not-allowed"
            >
              {isLoading ? "Alocando..." : "Confirmar Alocação"}
            </button>
          </div>
        </form>
    </Modal>
  );
}
