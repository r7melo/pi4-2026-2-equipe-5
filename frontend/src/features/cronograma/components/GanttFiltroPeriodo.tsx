import { useId, useRef, useState } from "react";
import { X } from "lucide-react";
import { DateInputBR } from "@/shared/components/ui/DateInputBR";
import { dataBRParaIso, isoParaDataBR } from "@/shared/lib/datasBrasileiras";

export interface GanttFiltroPeriodoProps {
  dataInicial?: string;
  onDataInicialChange: (valor: string) => void;
  dataFinal?: string;
  onDataFinalChange: (valor: string) => void;
  onLimpar?: () => void;
  variante?: "toolbar" | "kpi";
}

export function GanttFiltroPeriodo({
  dataInicial = "",
  onDataInicialChange,
  dataFinal = "",
  onDataFinalChange,
  onLimpar,
  variante = "toolbar",
}: GanttFiltroPeriodoProps) {
  const idBase = useId();
  const idInicio = `${idBase}-inicio`;
  const idFim = `${idBase}-fim`;
  const dataInicialRef = useRef<HTMLInputElement>(null);

  const [prevInicio, setPrevInicio] = useState(dataInicial);
  const [textoInicio, setTextoInicio] = useState(() => isoParaDataBR(dataInicial));
  if (prevInicio !== dataInicial) {
    setPrevInicio(dataInicial);
    setTextoInicio(isoParaDataBR(dataInicial));
  }

  const [prevFim, setPrevFim] = useState(dataFinal);
  const [textoFim, setTextoFim] = useState(() => isoParaDataBR(dataFinal));
  if (prevFim !== dataFinal) {
    setPrevFim(dataFinal);
    setTextoFim(isoParaDataBR(dataFinal));
  }

  const temFiltroData = Boolean(dataInicial || dataFinal || textoInicio || textoFim);
  const containerClassName =
    variante === "kpi"
      ? "flex items-center gap-1 h-7 bg-surface-subtle border border-border-subtle rounded-md px-2 text-xs"
      : "flex items-center gap-1 h-7 bg-surface border border-border-subtle rounded-md px-2 text-xs shrink-0";

  return (
    <div role="group" aria-label="Filtro de período" className={containerClassName}>
      <label
        htmlFor={idInicio}
        className="relative text-muted-foreground font-medium text-[11px] cursor-pointer"
      >
        De:<span className="sr-only left-0 top-0"> Data inicial do filtro</span>
      </label>
      <DateInputBR
        ref={dataInicialRef}
        id={idInicio}
        valor={textoInicio}
        onChange={(mascarado) => {
          setTextoInicio(mascarado);
          if (!mascarado.trim()) {
            onDataInicialChange("");
          } else if (mascarado.length === 10) {
            const iso = dataBRParaIso(mascarado);
            if (iso) onDataInicialChange(iso);
          }
        }}
        tamanho="xs"
        className="border-none bg-transparent focus:bg-transparent p-0 text-[11px] w-[74px]"
      />
      <label
        htmlFor={idFim}
        className="relative text-muted-foreground font-medium text-[11px] ml-0.5 cursor-pointer"
      >
        Até:<span className="sr-only left-0 top-0"> Data final do filtro</span>
      </label>
      <DateInputBR
        id={idFim}
        valor={textoFim}
        onChange={(mascarado) => {
          setTextoFim(mascarado);
          if (!mascarado.trim()) {
            onDataFinalChange("");
          } else if (mascarado.length === 10) {
            const iso = dataBRParaIso(mascarado);
            if (iso) onDataFinalChange(iso);
          }
        }}
        tamanho="xs"
        className="border-none bg-transparent focus:bg-transparent p-0 text-[11px] w-[74px]"
      />
      {temFiltroData && onLimpar && (
        <button
          type="button"
          onClick={() => {
            setTextoInicio("");
            setTextoFim("");
            dataInicialRef.current?.focus();
            onLimpar();
          }}
          className="controle-compacto text-subtle-foreground hover:text-destructive p-0.5 transition-colors cursor-pointer inline-flex items-center justify-center"
          aria-label="Limpar filtro de período"
          title="Limpar filtro de período"
        >
          <X className="w-3 h-3" aria-hidden="true" />
        </button>
      )}
    </div>
  );
}
