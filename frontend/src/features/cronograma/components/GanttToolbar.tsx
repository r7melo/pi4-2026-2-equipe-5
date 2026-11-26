import {
  Calendar,
  Columns,
  Printer,
  Share2,
  Filter,
} from "lucide-react";
import type { NivelZoom } from "../types/gantt";
import { SegmentedControl } from "@/shared/components/ui/SegmentedControl";
import { GanttFiltroPeriodo } from "./GanttFiltroPeriodo";
import { cn } from "@/shared/lib/utils";

interface GanttToolbarProps {
  nivelAtual: NivelZoom;
  onMudarNivel: (nivel: NivelZoom) => void;
  onHoje: () => void;
  mostrarGrade?: boolean;
  onToggleGrade?: () => void;
  dataFiltroInicio?: string;
  onDataInicioChange?: (val: string) => void;
  dataFiltroFim?: string;
  onDataFimChange?: (val: string) => void;
  onLimparDatas?: () => void;
  onImprimir?: () => void;
  onAbrirCompartilhar?: () => void;
  onAbrirFiltros?: () => void;
  totalFiltrosAtivos?: number;
  modoAtivo?: boolean;
  variante?: "toolbar" | "subbar";
}

const NIVEIS: { valor: NivelZoom; rotulo: string }[] = [
  { valor: "day", rotulo: "Dia" },
  { valor: "week", rotulo: "Semana" },
  { valor: "month", rotulo: "Mês" },
];

export function GanttToolbar({
  nivelAtual,
  onMudarNivel,
  onHoje,
  mostrarGrade = true,
  onToggleGrade,
  dataFiltroInicio = "",
  onDataInicioChange,
  dataFiltroFim = "",
  onDataFimChange,
  onLimparDatas,
  onImprimir,
  onAbrirCompartilhar,
  onAbrirFiltros,
  totalFiltrosAtivos = 0,
  modoAtivo = false,
  variante = "toolbar",
}: GanttToolbarProps) {
  const isSubbar = variante === "subbar";

  return (
    <div
      className={cn(
        "gantt-toolbar flex items-center min-w-0 max-w-full overflow-x-auto",
        isSubbar
          ? "w-full border-b border-border-subtle bg-surface-subtle px-3 sm:px-4 py-1 justify-between gap-2 shrink-0"
          : "gap-1 sm:gap-2 py-1"
      )}
    >
      <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
        <button
          type="button"
          onClick={onHoje}
          className="controle-compacto h-7 flex items-center gap-1 px-2 sm:px-2.5 rounded-md border border-border-subtle bg-surface hover:bg-muted text-foreground-muted text-xs font-medium transition-colors motion-safe:active:scale-[0.97] cursor-pointer shrink-0"
          title="Focar na data de hoje"
        >
          <Calendar className="w-3.5 h-3.5 text-muted-foreground" aria-hidden="true" />
          <span className={isSubbar ? "inline" : "hidden sm:inline"}>Hoje</span>
        </button>

        <SegmentedControl
          opcoes={NIVEIS}
          valor={nivelAtual}
          onChange={onMudarNivel}
          ariaLabel="Escala do cronograma"
        />

        {onToggleGrade && (
          <button
            type="button"
            onClick={onToggleGrade}
            aria-label="Alternar grade lateral"
            aria-pressed={!mostrarGrade}
            className={cn(
              "controle-compacto flex items-center justify-center gap-1 rounded-md border text-xs font-medium transition-colors cursor-pointer shrink-0",
              isSubbar ? "w-7 h-7" : "h-7 px-2 sm:px-2.5",
              !mostrarGrade
                ? "bg-warning-light border-warning-border text-warning"
                : "bg-surface border-border-subtle text-foreground-muted hover:bg-muted"
            )}
            title={mostrarGrade ? "Ocultar grade lateral (Modo Panorâmico)" : "Mostrar grade lateral"}
          >
            <Columns className="w-3.5 h-3.5" aria-hidden="true" />
            {!isSubbar && (
              <span className="hidden md:inline">{mostrarGrade ? "Grade" : "100% Timeline"}</span>
            )}
          </button>
        )}
      </div>

      <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
        {!modoAtivo && onDataInicioChange && onDataFimChange && (
          <GanttFiltroPeriodo
            variante="toolbar"
            dataInicial={dataFiltroInicio}
            onDataInicialChange={onDataInicioChange}
            dataFinal={dataFiltroFim}
            onDataFinalChange={onDataFimChange}
            onLimpar={onLimparDatas}
          />
        )}

        {!modoAtivo && onAbrirFiltros && (
          <button
            type="button"
            onClick={onAbrirFiltros}
            aria-label="Filtros"
            className={cn(
              "controle-compacto relative flex items-center justify-center gap-1.5 rounded-md border text-xs font-medium transition-colors cursor-pointer shrink-0",
              isSubbar ? "w-7 h-7" : "h-7 px-2.5",
              totalFiltrosAtivos > 0
                ? "bg-info-light border-info-border text-info font-semibold"
                : "bg-surface border-border-strong text-foreground-muted hover:bg-surface-subtle"
            )}
            title="Filtros da linha do tempo"
          >
            <Filter className="w-3.5 h-3.5" aria-hidden="true" />
            {!isSubbar && <span>Filtros</span>}
            {totalFiltrosAtivos > 0 ? (
              <span
                className={cn(
                  "rounded-full bg-info text-primary-foreground font-bold tabular-nums inline-flex items-center justify-center",
                  isSubbar
                    ? "absolute -top-1.5 -right-1.5 min-w-[15px] h-[15px] px-1 text-[9px]"
                    : "ml-0.5 px-1.5 py-0.5 text-[10px]"
                )}
              >
                {totalFiltrosAtivos}
              </span>
            ) : null}
          </button>
        )}

        {!isSubbar && !modoAtivo && onImprimir && (
          <button
            type="button"
            onClick={onImprimir}
            className="controle-compacto h-7 flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 rounded-md border border-border-subtle bg-surface hover:bg-surface-subtle text-foreground-muted text-xs font-medium transition-colors motion-safe:active:scale-[0.97] cursor-pointer shrink-0"
            title="Imprimir ou Salvar em PDF (@media print)"
          >
            <Printer className="w-3.5 h-3.5 text-muted-foreground" aria-hidden="true" />
            <span className="hidden sm:inline">Imprimir</span>
          </button>
        )}

        {!isSubbar && !modoAtivo && onAbrirCompartilhar && (
          <button
            type="button"
            onClick={onAbrirCompartilhar}
            className="controle-compacto h-7 flex items-center gap-1.5 px-2.5 sm:px-3 rounded-md bg-info hover:bg-info-hover text-primary-foreground text-xs font-semibold shadow-xs transition-colors motion-safe:active:scale-[0.97] cursor-pointer shrink-0"
            title="Compartilhar cronograma público"
            aria-label="Compartilhar"
          >
            <Share2 className="w-3.5 h-3.5" aria-hidden="true" />
            <span className="hidden sm:inline">Compartilhar</span>
          </button>
        )}
      </div>
    </div>
  );
}
