import { useId, useRef } from "react";
import { X } from "lucide-react";

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
  const temFiltroData = Boolean(dataInicial || dataFinal);
  const containerClassName =
    variante === "kpi"
      ? "flex items-center gap-1 bg-surface-subtle border border-border-subtle rounded-md px-2 py-1 text-xs"
      : "flex items-center gap-1 bg-surface border border-border-subtle rounded-md px-2 py-1 text-xs shrink-0";

  return (
    <div role="group" aria-label="Filtro de período" className={containerClassName}>
      <label
        htmlFor={idInicio}
        className="relative text-muted-foreground font-medium text-[11px] cursor-pointer"
      >
        De:<span className="sr-only left-0 top-0"> Data inicial do filtro</span>
      </label>
      <input
        ref={dataInicialRef}
        id={idInicio}
        type="date"
        value={dataInicial}
        onChange={(e) => onDataInicialChange(e.target.value)}
        className="border-none bg-transparent p-0 text-xs text-foreground-muted cursor-pointer w-24 sm:w-28"
      />
      <label
        htmlFor={idFim}
        className="relative text-muted-foreground font-medium text-[11px] ml-1 cursor-pointer"
      >
        Até:<span className="sr-only left-0 top-0"> Data final do filtro</span>
      </label>
      <input
        id={idFim}
        type="date"
        value={dataFinal}
        onChange={(e) => onDataFinalChange(e.target.value)}
        className="border-none bg-transparent p-0 text-xs text-foreground-muted cursor-pointer w-24 sm:w-28"
      />
      {temFiltroData && onLimpar && (
        <button
          type="button"
          onClick={() => {
            dataInicialRef.current?.focus();
            onLimpar();
          }}
          className="text-subtle-foreground hover:text-destructive p-0.5 transition-colors cursor-pointer inline-flex items-center justify-center"
          aria-label="Limpar filtro de período"
          title="Limpar filtro de período"
        >
          <X className="w-3 h-3" aria-hidden="true" />
        </button>
      )}
    </div>
  );
}
