import {
  Calendar,
  Columns,
  Printer,
  Share2,
  X,
  Filter,
} from "lucide-react";
import type { NivelZoom } from "@/types";

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
}

const NIVEIS: { valor: NivelZoom; label: string }[] = [
  { valor: "day", label: "Dia" },
  { valor: "week", label: "Semana" },
  { valor: "month", label: "Mês" },
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
}: GanttToolbarProps) {
  const temFiltroData = Boolean(dataFiltroInicio || dataFiltroFim);

  return (
    <div className="gantt-toolbar flex items-center gap-1 sm:gap-2 min-w-0 max-w-full overflow-x-auto scrollbar-none py-1">
      <button
        onClick={onHoje}
        className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1.5 rounded-md border border-border-subtle bg-surface hover:bg-surface-subtle text-foreground-muted text-xs font-medium transition-all active:scale-[0.97] cursor-pointer shrink-0"
        title="Focar na data de hoje"
      >
        <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
        <span className="hidden sm:inline">Hoje</span>
      </button>

      <div className="flex items-center gap-0.5 bg-muted rounded-md p-0.5 border border-border-subtle shrink-0">
        {NIVEIS.map(({ valor, label }) => (
          <button
            key={valor}
            onClick={() => onMudarNivel(valor)}
            className={`px-1.5 sm:px-2.5 py-1 rounded-sm text-xs font-medium transition-all cursor-pointer ${
              nivelAtual === valor
                ? "bg-surface text-foreground-secondary shadow-xs border border-border-subtle/50"
                : "text-foreground-muted hover:text-foreground"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {onToggleGrade && <div className="h-4 w-px bg-border-subtle hidden sm:block shrink-0" />}

      {onToggleGrade && (
        <button
          onClick={onToggleGrade}
          className={`flex items-center gap-1 px-2 sm:px-2.5 py-1.5 rounded-md border text-xs font-medium transition-all cursor-pointer shrink-0 ${
            !mostrarGrade
              ? "bg-warning-light border-warning-border text-warning"
              : "bg-surface border-border-subtle text-foreground-muted hover:bg-surface-subtle"
          }`}
          title={mostrarGrade ? "Ocultar grade lateral (Modo Panorâmico)" : "Mostrar grade lateral"}
        >
          <Columns className="w-3.5 h-3.5" />
          <span className="hidden md:inline">{mostrarGrade ? "Grade" : "100% Timeline"}</span>
        </button>
      )}

      {!modoAtivo && onAbrirFiltros && (
        <button
          onClick={onAbrirFiltros}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border text-xs font-medium transition-all cursor-pointer shrink-0 ${
            totalFiltrosAtivos > 0
              ? "bg-info-light border-info-border text-info font-semibold"
              : "bg-surface border-border-subtle text-foreground-muted hover:bg-surface-subtle"
          }`}
          title="Abrir gaveta de filtros avançados"
        >
          <Filter className="w-3.5 h-3.5" />
          <span>Filtros</span>
          {totalFiltrosAtivos > 0 ? (
            <span className="ml-0.5 px-1.5 py-0.5 bg-info text-primary-foreground rounded-full text-[10px] font-bold">
              {totalFiltrosAtivos}
            </span>
          ) : null}
        </button>
      )}

      {!modoAtivo && onDataInicioChange && onDataFimChange && (
        <div className="flex items-center gap-1 bg-surface border border-border-subtle rounded-md px-2 py-1 text-xs shrink-0">
          <span className="text-muted-foreground font-medium text-[11px]">De:</span>
          <input
            type="date"
            aria-label="Data inicial do filtro"
            value={dataFiltroInicio}
            onChange={(e) => onDataInicioChange(e.target.value)}
            className="border-none bg-transparent p-0 text-xs text-foreground-muted focus:outline-none cursor-pointer w-24 sm:w-28"
          />
          <span className="text-muted-foreground font-medium text-[11px] ml-1">Até:</span>
          <input
            type="date"
            aria-label="Data final do filtro"
            value={dataFiltroFim}
            onChange={(e) => onDataFimChange(e.target.value)}
            className="border-none bg-transparent p-0 text-xs text-foreground-muted focus:outline-none cursor-pointer w-24 sm:w-28"
          />
          {temFiltroData && onLimparDatas && (
            <button
              onClick={onLimparDatas}
              className="text-subtle-foreground hover:text-destructive p-0.5 transition-colors cursor-pointer"
              title="Limpar filtro de período"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      )}

      {!modoAtivo && (onImprimir || onAbrirCompartilhar) &&
        <div className="h-4 w-px bg-border-subtle hidden sm:block shrink-0" />}

      {!modoAtivo && onImprimir && (
        <button
          onClick={onImprimir}
          className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1.5 rounded-md border border-border-subtle bg-surface hover:bg-surface-subtle text-foreground-muted text-xs font-medium transition-all active:scale-[0.97] cursor-pointer shrink-0"
          title="Imprimir ou Salvar em PDF (@media print)"
        >
          <Printer className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="hidden sm:inline">Imprimir</span>
        </button>
      )}

      {!modoAtivo && onAbrirCompartilhar && (
        <button
          onClick={onAbrirCompartilhar}
          className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-md bg-info hover:bg-info-hover text-primary-foreground text-xs font-semibold shadow-xs transition-all active:scale-[0.97] cursor-pointer shrink-0"
          title="Compartilhar cronograma público"
          aria-label="Compartilhar"
        >
          <Share2 className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Compartilhar</span>
        </button>
      )}
    </div>
  );
}
