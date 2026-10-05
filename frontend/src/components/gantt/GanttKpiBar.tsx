// frontend/src/components/gantt/GanttKpiBar.tsx
import { Search, Plus, Users, Sun, Calendar, X } from "lucide-react";
import type { Equipe } from "@/services/equipes";

interface GanttKpiBarProps {
  totalEquipes: number;
  totalPaineis: number;
  totalObras: number;
  termoBusca: string;
  onBuscaChange: (termo: string) => void;
  equipeSelecionada: number | null;
  onEquipeChange: (equipeId: number | null) => void;
  equipes: Equipe[];
  canEdit: boolean;
  onNovaAlocacao: () => void;
  dataFiltroInicio?: string;
  onDataInicioChange?: (val: string) => void;
  dataFiltroFim?: string;
  onDataFimChange?: (val: string) => void;
  onLimparDatas?: () => void;
}

export function GanttKpiBar({
  totalEquipes,
  totalPaineis,
  totalObras,
  termoBusca,
  onBuscaChange,
  equipeSelecionada,
  onEquipeChange,
  equipes,
  canEdit,
  onNovaAlocacao,
  dataFiltroInicio = "",
  onDataInicioChange,
  dataFiltroFim = "",
  onDataFimChange,
  onLimparDatas,
}: GanttKpiBarProps) {
  const temFiltroData = Boolean(dataFiltroInicio || dataFiltroFim);

  return (
    <div className="kpi-bar flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-2.5 px-3 py-2 bg-white rounded-lg border border-slate-200 shadow-xs shrink-0">
      {/* ─── Esquerda: Mini-KPIs em Chips Reativos ─── */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 xl:pb-0 scrollbar-none text-xs shrink-0">
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-50 border border-slate-200/60 text-slate-700 font-medium whitespace-nowrap">
          <Users className="w-3.5 h-3.5 text-blue-600" />
          <span>Equipes:</span>
          <span className="font-semibold text-slate-900">{totalEquipes}</span>
        </div>

        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-50 border border-slate-200/60 text-slate-700 font-medium whitespace-nowrap">
          <Sun className="w-3.5 h-3.5 text-amber-500" />
          <span>Painéis:</span>
          <span className="font-semibold text-slate-900">{totalPaineis} un.</span>
        </div>

        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-50 border border-slate-200/60 text-slate-700 font-medium whitespace-nowrap">
          <Calendar className="w-3.5 h-3.5 text-emerald-600" />
          <span>Obras:</span>
          <span className="font-semibold text-slate-900">{totalObras}</span>
        </div>
      </div>

      {/* ─── Direita: Filtro de Período, Busca, Equipe e Botão Nova Alocação ─── */}
      <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 shrink-0">
        {/* Filtro de Período (De / Até) */}
        {onDataInicioChange && onDataFimChange && (
          <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-md px-2 py-1 text-xs">
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

        <div className="relative flex-1 sm:w-44 min-w-[130px]">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={termoBusca}
            onChange={(e) => onBuscaChange(e.target.value)}
            placeholder="Buscar obra..."
            className="w-full text-xs pl-8 pr-7 py-1.5 bg-slate-50 border border-slate-200 rounded-md focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-800 placeholder-slate-400 transition-colors"
          />
          {termoBusca && (
            <button
              onClick={() => onBuscaChange("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
              title="Limpar busca"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>

        <select
          value={equipeSelecionada ?? ""}
          onChange={(e) =>
            onEquipeChange(e.target.value ? Number(e.target.value) : null)
          }
          className="text-xs px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-md text-slate-700 font-medium focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer max-w-[140px]"
        >
          <option value="">Todas as equipes</option>
          {equipes.map((eq) => (
            <option key={eq.id} value={eq.id}>
              {eq.nome}
            </option>
          ))}
        </select>

        {canEdit && (
          <button
            onClick={onNovaAlocacao}
            title="Nova Alocação"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer active:scale-95"
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Nova Alocação</span>
          </button>
        )}
      </div>
    </div>
  );
}
