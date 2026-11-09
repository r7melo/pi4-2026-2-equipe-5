import { useState, useEffect, useRef } from "react";
import { Loader2, AlertTriangle } from "lucide-react";
import { cn } from "@/shared/lib/utils";
import {
  dataCivilValida,
  proximoDiaUtilCivil,
} from "@/shared/lib/datasCivis";
import {
  capturarSessaoOperacional,
  sessaoOperacionalVigente,
} from "@/shared/lib/sessaoOperacao";
import type { FormularioReagendamentoProps } from "@/features/cronograma/types/gavetaGantt";

export function FormularioReagendamento({
  tarefaId,
  dataInicio,
  canEdit,
  onCancelar,
  onReagendar,
  reagendamentoBloqueado = false,
  reagendamentoFase = "livre",
  avisoReagendamento = null,
}: FormularioReagendamentoProps) {
  const [dataInicioRascunho, setDataInicioRascunho] = useState(dataInicio);
  const [erroDataInicio, setErroDataInicio] = useState<string | null>(null);
  const [avisoAjuste, setAvisoAjuste] = useState<string | null>(null);
  const [mensagemSucesso, setMensagemSucesso] = useState<string | null>(null);
  const [salvandoLocal, setSalvandoLocal] = useState(false);
  const [prevTarefaInfo, setPrevTarefaInfo] = useState(() => ({
    id: tarefaId,
    dataInicio,
  }));

  const inputDataInicioRef = useRef<HTMLInputElement>(null);
  const operacaoContador = useRef<number>(0);

  if (tarefaId !== prevTarefaInfo.id) {
    setPrevTarefaInfo({
      id: tarefaId,
      dataInicio,
    });
    setDataInicioRascunho(dataInicio);
    setErroDataInicio(null);
    setAvisoAjuste(null);
    setMensagemSucesso(null);
    setSalvandoLocal(false);
  } else if (dataInicio !== prevTarefaInfo.dataInicio) {
    setPrevTarefaInfo({
      id: tarefaId,
      dataInicio,
    });
    setDataInicioRascunho(dataInicio);
  }

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
    setDataInicioRascunho(dataInicio);
    setErroDataInicio(null);
    setAvisoAjuste(null);
    onCancelar();
  };

  const handleSubmitReagendamento = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEdit || !onReagendar || salvandoLocal || reagendamentoBloqueado || reagendamentoFase !== "livre") {
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

    if (dataFinal === dataInicio) {
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
    const tarefaIdOrigem = tarefaId;

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

  return (
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
  );
}
