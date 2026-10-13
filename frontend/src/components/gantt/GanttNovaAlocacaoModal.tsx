import { useState, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Calendar, Clock, Sun, AlertTriangle } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import type { ObraCard, Equipe } from "@/types";
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
  onConfirmar: (dados: {
    obraId: number;
    equipeId: number;
    dataInicio: string;
    dataFim?: string;
  }) => Promise<void>;
  isLoading?: boolean;
}

export function GanttNovaAlocacaoModal({
  isOpen,
  onClose,
  obrasElegiveis,
  equipes,
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
            <label className="text-xs font-semibold text-slate-700">
              Obra a ser executada *
            </label>
            {obrasElegiveis.length === 0 ? (
              <div className="flex flex-col gap-2 p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-xs">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600" />
                  <span className="font-semibold">Nenhuma obra ativa disponível para agendamento.</span>
                </div>
                <p className="text-amber-700">Todas as obras cadastradas estão no status Concluído.</p>
                <button
                  type="button"
                  onClick={() => {
                    handleFechar();
                    void navigate("/kanban");
                  }}
                  className="self-start text-xs font-semibold text-blue-600 hover:text-blue-800 underline cursor-pointer"
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
                className="text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 disabled:opacity-60"
              >
                <option value="">Selecione uma obra...</option>
                {obrasElegiveis.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.clienteNome} ({o.quantidadePaineis} painéis · {o.categoria})
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-700">
              Equipe Responsável *
            </label>
            <select
              value={equipeId}
              onChange={(e) => setEquipeId(e.target.value ? Number(e.target.value) : "")}
              required
              disabled={isLoading}
              className="text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 disabled:opacity-60"
            >
              <option value="">Selecione uma equipe...</option>
              {equipes.map((eq) => (
                <option key={eq.id} value={eq.id}>
                  {eq.nome} {eq.especialidade ? `(${eq.especialidade})` : ""}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-700">
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
              className="text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 disabled:opacity-60"
            />
            <span className="text-[11px] text-slate-400">
              Finais de semana são automaticamente ajustados para o próximo dia útil.
            </span>
          </div>

          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-700">
                Data de Término Prevista *
              </label>
              {editouFimManualmente ? (
                <button
                  type="button"
                  onClick={() => {
                    setEditouFimManualmente(false);
                    setDataFimManual("");
                  }}
                  className="text-[10px] text-blue-600 hover:underline cursor-pointer"
                >
                  Restaurar sugestão (~9 painéis/dia)
                </button>
              ) : (
                <span className="text-[10px] text-slate-400">
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
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
            />
          </div>

          {obraSelecionada && (
            <div className="p-3.5 bg-blue-50/70 border border-blue-100 rounded-xl flex flex-col gap-2">
              <div className="flex items-center gap-2 text-blue-900 font-semibold text-xs">
                <Sun className="w-4 h-4 text-amber-500" />
                <span>Cálculo Automático de Produtividade</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs text-blue-800">
                <div className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-blue-600" />
                  <span>Duração: <strong>{formatarDiasUteis(duracaoEstimadaDias)}</strong></span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-blue-600" />
                  <span>Término: <strong>{dataFimExibicaoCard}</strong></span>
                </div>
              </div>
              <p className="text-[11px] text-blue-600/90 leading-relaxed">
                Estimado com base em {obraSelecionada.quantidadePaineis} painéis (~{potenciaEstimadaKwp} kWp a ~9 painéis/dia útil). Finais de semana desconsiderados.
              </p>
            </div>
          )}

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={handleFechar}
              disabled={isLoading}
              className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-800 rounded-lg transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!obraId || !equipeId || !dataInicio || isLoading}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors cursor-pointer disabled:cursor-not-allowed"
            >
              {isLoading ? "Alocando..." : "Confirmar Alocação"}
            </button>
          </div>
        </form>
    </Modal>
  );
}
