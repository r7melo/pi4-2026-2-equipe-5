import { Plus, Users, X } from "lucide-react";
import type { Equipe } from "@/types";
import { SearchInput } from "@/shared/components/ui/SearchInput";

interface GanttKpiBarProps {
  termoBusca: string;
  onBuscaChange: (termo: string) => void;
  equipeSelecionada: number | null;
  onEquipeChange: (equipeId: number | null) => void;
  equipes: Equipe[];
  canEdit: boolean;
  onNovaAlocacao: () => void;
  onNovaEquipe?: () => void;
  dataFiltroInicio?: string;
  onDataInicioChange?: (val: string) => void;
  dataFiltroFim?: string;
  onDataFimChange?: (val: string) => void;
  onLimparDatas?: () => void;
}

export function GanttKpiBar({
  termoBusca,
  onBuscaChange,
  equipeSelecionada,
  onEquipeChange,
  equipes,
  canEdit,
  onNovaAlocacao,
  onNovaEquipe,
  dataFiltroInicio = "",
  onDataInicioChange,
  dataFiltroFim = "",
  onDataFimChange,
  onLimparDatas,
}: GanttKpiBarProps) {
  const temFiltroData = Boolean(dataFiltroInicio || dataFiltroFim);

  return (
    <div className="kpi-bar flex flex-wrap items-center justify-between gap-2.5 px-3 py-2 bg-surface rounded-lg border border-border-subtle shadow-xs shrink-0">
      <div className="flex flex-wrap items-center gap-2">
        {onDataInicioChange && onDataFimChange && (
          <div className="flex items-center gap-1 bg-surface-subtle border border-border-subtle rounded-md px-2 py-1 text-xs">
            <span className="text-muted-foreground font-medium text-[11px]">De:</span>
            <input
              type="date"
              value={dataFiltroInicio}
              onChange={(e) => onDataInicioChange(e.target.value)}
              className="border-none bg-transparent p-0 text-xs text-foreground-muted focus:outline-none cursor-pointer w-24 sm:w-28"
            />
            <span className="text-muted-foreground font-medium text-[11px] ml-1">Até:</span>
            <input
              type="date"
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

        <SearchInput
          valor={termoBusca}
          onChange={onBuscaChange}
          placeholder="Buscar obra..."
          tamanho="sm"
          className="flex-1 sm:w-44 min-w-[130px]"
        />

        <select
          value={equipeSelecionada ?? ""}
          onChange={(e) =>
            onEquipeChange(e.target.value ? Number(e.target.value) : null)
          }
          className="text-xs px-2.5 py-1.5 bg-surface-subtle border border-border-subtle rounded-md text-foreground-muted font-medium focus:bg-surface focus:outline-none focus:ring-1 focus:ring-info cursor-pointer max-w-[140px]"
        >
          <option value="">Todas as equipes</option>
          {equipes.map((eq) => (
            <option key={eq.id} value={eq.id}>
              {eq.nome}
            </option>
          ))}
        </select>
      </div>

      <div className="flex items-center gap-2">
        {canEdit && onNovaEquipe && (
          <button
            onClick={onNovaEquipe}
            title="Cadastrar Nova Equipe"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-surface border border-border-subtle hover:bg-surface-subtle text-foreground-muted text-xs font-semibold shadow-xs transition-colors cursor-pointer active:scale-95"
          >
            <Users className="w-3.5 h-3.5 text-info" />
            <span className="hidden sm:inline">Nova Equipe</span>
          </button>
        )}

        {canEdit && (
          <button
            onClick={onNovaAlocacao}
            title="Nova Alocação"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-info hover:bg-info-hover text-primary-foreground text-xs font-semibold shadow-xs transition-colors cursor-pointer active:scale-95"
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Nova Alocação</span>
          </button>
        )}
      </div>
    </div>
  );
}
