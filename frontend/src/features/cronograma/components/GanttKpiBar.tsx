import { Plus, Users } from "lucide-react";
import type { Equipe } from "../types/equipes";
import { SearchInput } from "@/shared/components/ui/SearchInput";
import { GanttFiltroPeriodo } from "./GanttFiltroPeriodo";

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
  return (
    <div className="kpi-bar flex flex-wrap items-center justify-between gap-2.5 px-3 py-2 bg-surface rounded-lg border border-border-subtle shadow-xs shrink-0">
      <div className="flex flex-wrap items-center gap-2">
        {onDataInicioChange && onDataFimChange && (
          <GanttFiltroPeriodo
            variante="kpi"
            dataInicial={dataFiltroInicio}
            onDataInicialChange={onDataInicioChange}
            dataFinal={dataFiltroFim}
            onDataFinalChange={onDataFimChange}
            onLimpar={onLimparDatas}
          />
        )}

        <SearchInput
          valor={termoBusca}
          onChange={onBuscaChange}
          placeholder="Buscar obra..."
          tamanho="sm"
          className="flex-1 sm:w-44 min-w-[130px]"
        />

        <select
          aria-label="Filtrar por equipe"
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
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-surface border border-border-subtle hover:bg-surface-subtle text-foreground-muted text-xs font-semibold shadow-xs transition-colors cursor-pointer motion-safe:active:scale-95"
          >
            <Users className="w-3.5 h-3.5 text-info" />
            <span className="hidden sm:inline">Nova Equipe</span>
          </button>
        )}

        {canEdit && (
          <button
            onClick={onNovaAlocacao}
            title="Nova Alocação"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-info hover:bg-info-hover text-primary-foreground text-xs font-semibold shadow-xs transition-colors cursor-pointer motion-safe:active:scale-95"
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Nova Alocação</span>
          </button>
        )}
      </div>
    </div>
  );
}
