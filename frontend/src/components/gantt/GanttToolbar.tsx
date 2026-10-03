import {
  Calendar,
  Columns,
  Printer,
  Share2,
  X,
} from "lucide-react";

export type NivelZoom = "day" | "week" | "month";

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
}: GanttToolbarProps) {
  const temFiltroData = Boolean(dataFiltroInicio || dataFiltroFim);

  return (
    <div className="gantt-toolbar flex items-center gap-1 sm:gap-2 min-w-0 max-w-full overflow-x-auto scrollbar-none py-1">
      {/* Grupo 1: Hoje & Zoom por Nível */}
      <button
        onClick={onHoje}
        className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1.5 rounded-md border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium transition-all active:scale-[0.97] cursor-pointer shrink-0"
        title="Focar na data de hoje"
      >
        <Calendar className="w-3.5 h-3.5 text-slate-500" />
        <span className="hidden sm:inline">Hoje</span>
      </button>

      <div className="flex items-center gap-0.5 bg-slate-100 rounded-md p-0.5 border border-slate-200 shrink-0">
        {NIVEIS.map(({ valor, label }) => (
          <button
            key={valor}
            onClick={() => onMudarNivel(valor)}
            className={`px-1.5 sm:px-2.5 py-1 rounded-sm text-xs font-medium transition-all cursor-pointer ${
              nivelAtual === valor
                ? "bg-white text-slate-800 shadow-xs border border-slate-200/50"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="h-4 w-px bg-slate-200 hidden sm:block shrink-0" />

      {/* Grupo 2: Alternar Grade Lateral (Toggle Grid) */}
      {onToggleGrade && (
        <button
          onClick={onToggleGrade}
          className={`flex items-center gap-1 px-2 sm:px-2.5 py-1.5 rounded-md border text-xs font-medium transition-all cursor-pointer shrink-0 ${
            !mostrarGrade
              ? "bg-amber-50 border-amber-300 text-amber-800"
              : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
          }`}
          title={mostrarGrade ? "Ocultar grade lateral (Modo Panorâmico)" : "Mostrar grade lateral"}
        >
          <Columns className="w-3.5 h-3.5" />
          <span className="hidden md:inline">{mostrarGrade ? "Grade" : "100% Timeline"}</span>
        </button>
      )}

      {/* Grupo 3: Filtro de Período Opcional */}
      {onDataInicioChange && onDataFimChange && (
        <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-md px-2 py-1 text-xs shrink-0">
          <span className="text-slate-400 font-medium text-[11px]">De:</span>
          <input
            type="date"
            value={dataFiltroInicio}
            onChange={(e) => onDataInicioChange(e.target.value)}
            className="border-none bg-transparent p-0 text-xs text-slate-700 focus:outline-none cursor-pointer w-24 sm:w-28"
          />
          <span className="text-slate-400 font-medium text-[11px] ml-1">Até:</span>
          <input
            type="date"
            value={dataFiltroFim}
            onChange={(e) => onDataFimChange(e.target.value)}
            className="border-none bg-transparent p-0 text-xs text-slate-700 focus:outline-none cursor-pointer w-24 sm:w-28"
          />
          {temFiltroData && onLimparDatas && (
            <button
              onClick={onLimparDatas}
              className="text-slate-400 hover:text-red-600 p-0.5 transition-colors cursor-pointer"
              title="Limpar filtro de período"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      )}

      <div className="h-4 w-px bg-slate-200 hidden sm:block shrink-0" />

      {/* Grupo 4: Ações (Imprimir e Compartilhar) */}
      {onImprimir && (
        <button
          onClick={onImprimir}
          className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1.5 rounded-md border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 text-xs font-medium transition-all active:scale-[0.97] cursor-pointer shrink-0"
          title="Imprimir ou Salvar em PDF (@media print)"
        >
          <Printer className="w-3.5 h-3.5 text-slate-500" />
          <span className="hidden sm:inline">Imprimir</span>
        </button>
      )}

      {onAbrirCompartilhar && (
        <button
          onClick={onAbrirCompartilhar}
          className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs transition-all active:scale-[0.97] cursor-pointer shrink-0"
          title="Compartilhar cronograma público (RF-16)"
        >
          <Share2 className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Compartilhar</span>
        </button>
      )}
    </div>
  );
}
