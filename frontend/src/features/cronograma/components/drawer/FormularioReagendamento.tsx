import { useState, useEffect, useRef } from "react";
import { Loader2, AlertTriangle } from "lucide-react";
import { AlertBanner } from "@/shared/components/ui/AlertBanner";
import { DateInputBR } from "@/shared/components/ui/DateInputBR";
import {
  dataCivilValida,
  proximoDiaUtilCivil,
} from "@/shared/lib/datasCivis";
import {
  dataBRParaIso,
  isoParaDataBR,
} from "@/shared/lib/datasBrasileiras";
import {
  capturarSessaoOperacional,
  sessaoOperacionalVigente,
} from "@/shared/lib/sessaoOperacao";
import type { FormularioReagendamentoProps } from "@/features/cronograma/types/gavetaGantt";

export function FormularioReagendamento({
  tarefaId,
  dataInicio,
  canEdit,
  onCancelar: _onCancelar,
  onReagendar,
  reagendamentoBloqueado = false,
  reagendamentoFase = "livre",
  avisoReagendamento = null,
}: FormularioReagendamentoProps) {
  const [dataInicioRascunho, setDataInicioRascunho] = useState(() =>
    isoParaDataBR(dataInicio)
  );
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
    setDataInicioRascunho(isoParaDataBR(dataInicio));
    setErroDataInicio(null);
    setAvisoAjuste(null);
    setMensagemSucesso(null);
    setSalvandoLocal(false);
  } else if (dataInicio !== prevTarefaInfo.dataInicio) {
    setPrevTarefaInfo({
      id: tarefaId,
      dataInicio,
    });
    setDataInicioRascunho(isoParaDataBR(dataInicio));
  }

  useEffect(() => {
    const contador = operacaoContador;
    return () => {
      contador.current += 1;
    };
  }, []);

  const handleDataChange = (valor: string) => {
    setMensagemSucesso(null);

    if (!valor) {
      setDataInicioRascunho("");
      setAvisoAjuste(null);
      setErroDataInicio("Data inicial é obrigatória.");
      return;
    }

    if (valor.length < 10) {
      setDataInicioRascunho(valor);
      setAvisoAjuste(null);
      setErroDataInicio(null);
      return;
    }

    const iso = dataBRParaIso(valor);
    if (!iso || !dataCivilValida(iso)) {
      setDataInicioRascunho(valor);
      setAvisoAjuste(null);
      setErroDataInicio("Data inicial inválida. Use o formato dd/mm/aaaa.");
      return;
    }

    setErroDataInicio(null);
    const normalizada = proximoDiaUtilCivil(iso);
    if (normalizada !== iso) {
      setDataInicioRascunho(isoParaDataBR(normalizada));
      setAvisoAjuste("Data ajustada para a próxima segunda-feira útil.");
    } else {
      setDataInicioRascunho(valor);
      setAvisoAjuste(null);
    }
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

    const iso = dataBRParaIso(dataInicioRascunho);
    if (!iso || !dataCivilValida(iso)) {
      setErroDataInicio("Data inicial inválida. Use o formato dd/mm/aaaa.");
      inputDataInicioRef.current?.focus();
      return;
    }

    const dataFinal = proximoDiaUtilCivil(iso);
    if (dataFinal !== iso) {
      setDataInicioRascunho(isoParaDataBR(dataFinal));
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
    <form onSubmit={handleSubmitReagendamento} className="pt-1 space-y-2">
      <div className="flex items-end gap-2">
        <div className="flex-1 min-w-0">
          <label
            htmlFor="gantt-input-data-inicio"
            className="text-[11px] font-medium text-muted-foreground block mb-1"
          >
            Novo início (dia útil)
          </label>
          <DateInputBR
            ref={inputDataInicioRef}
            id="gantt-input-data-inicio"
            tamanho="md"
            valor={dataInicioRascunho}
            readOnly={!canEdit}
            invalido={Boolean(erroDataInicio)}
            disabled={salvandoLocal || reagendamentoBloqueado || reagendamentoFase !== "livre"}
            aria-describedby={
              erroDataInicio
                ? "gantt-data-inicio-hint gantt-data-inicio-erro"
                : "gantt-data-inicio-hint"
            }
            onChange={handleDataChange}
          />
        </div>

        {canEdit && (
          <button
            type="submit"
            disabled={
              !onReagendar ||
              salvandoLocal ||
              reagendamentoBloqueado ||
              reagendamentoFase !== "livre"
            }
            className="h-9 px-3.5 text-xs font-semibold text-primary-foreground bg-primary hover:bg-primary-hover rounded-lg transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-1.5 shrink-0"
          >
            {salvandoLocal || reagendamentoFase === "salvando" ? (
              <>
                <Loader2 className="w-3.5 h-3.5 motion-safe:animate-spin" />
                <span>Salvando...</span>
              </>
            ) : reagendamentoFase === "sincronizando" ? (
              <>
                <Loader2 className="w-3.5 h-3.5 motion-safe:animate-spin" />
                <span>Sincronizando...</span>
              </>
            ) : (
              <span>Reagendar</span>
            )}
          </button>
        )}
      </div>

      <p id="gantt-data-inicio-hint" className="text-[11px] text-muted-foreground">
        Sábados e domingos ajustam automaticamente para a segunda-feira seguinte.
      </p>

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
        <AlertBanner
          variante="warning"
          icone={<AlertTriangle className="w-4 h-4" />}
          className="p-2.5 border-transparent"
        >
          {avisoReagendamento}
        </AlertBanner>
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
              <Loader2 className="w-3.5 h-3.5 motion-safe:animate-spin shrink-0" />
              <span>Sincronizando cronograma com o servidor...</span>
            </>
          ) : (
            <>
              <Loader2 className="w-3.5 h-3.5 motion-safe:animate-spin shrink-0" />
              <span>Salvando nova data da alocação...</span>
            </>
          )}
        </div>
      )}
    </form>
  );
}
