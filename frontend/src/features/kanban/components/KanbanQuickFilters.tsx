import { useState, useRef, useEffect, useId } from "react";
import { Filter, Check } from "lucide-react";
import { cn } from "@/shared/lib/utils";
import { STATUS_LOGISTICO_OPERACIONAIS } from "@/shared/constants/statusLogistico";

interface KanbanQuickFiltersProps {
  categoriaFiltro: string;
  setCategoriaFiltro: (cat: string) => void;
  materialFiltro: string;
  setMaterialFiltro: (mat: string) => void;
  onLimparFiltros: () => void;
  temFiltroAtivo: boolean;
  temLimpezaDisponivel: boolean;
  compacto?: boolean;
}

// Categorias canônicas de obra
const CATEGORIAS = [
  "Todas",
  "Residencial",
  "Comercial",
];

// Filtro alinhado às etapas de gargalo logístico de materiais.
const ETAPAS_MATERIAIS = [
  "Todos",
  ...STATUS_LOGISTICO_OPERACIONAIS.map((opcao) => opcao.rotuloTitulo),
];

export default function KanbanQuickFilters({
  categoriaFiltro,
  setCategoriaFiltro,
  materialFiltro,
  setMaterialFiltro,
  onLimparFiltros,
  temFiltroAtivo,
  temLimpezaDisponivel,
  compacto = true,
}: KanbanQuickFiltersProps) {
  const [aberto, setAberto] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const botaoFiltrosRef = useRef<HTMLButtonElement>(null);
  const painelRef = useRef<HTMLDivElement>(null);
  const painelId = useId();
  const ancoraFiltros = "--filtros-" + painelId.replace(/[^a-zA-Z0-9_-]/g, "");
  const suportaPopover =
    typeof HTMLElement !== "undefined" && "popover" in HTMLElement.prototype;

  const totalAtivos = (categoriaFiltro ? 1 : 0) + (materialFiltro ? 1 : 0);

  useEffect(() => {
    if (suportaPopover || !aberto) return;
    const handleClickFora = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setAberto(false);
      }
    };
    document.addEventListener("mousedown", handleClickFora);
    return () => document.removeEventListener("mousedown", handleClickFora);
  }, [aberto, suportaPopover]);

  return (
    <div className="relative shrink-0" ref={dropdownRef} onKeyDown={e => {
      if (!suportaPopover && aberto && e.key === "Escape" && !e.nativeEvent.isComposing) {
        e.preventDefault(); e.stopPropagation(); setAberto(false); botaoFiltrosRef.current?.focus();
      }
    }}>
      <button
        type="button"
        ref={botaoFiltrosRef}
        popoverTarget={painelId}
        aria-expanded={aberto}
        aria-controls={painelId}
        style={{ anchorName: ancoraFiltros }}
        onClick={() => {
          if (!suportaPopover) setAberto((prev) => !prev);
        }}
        className={cn(
          "controle-compacto inline-flex items-center justify-center gap-1.5 text-xs font-medium rounded-lg border transition-colors cursor-pointer shrink-0",
          compacto ? "h-7 px-2.5" : "h-9 px-3",
          temFiltroAtivo
            ? "bg-info-light text-info border-info-border"
            : "bg-surface text-foreground border-border-strong hover:bg-surface-subtle"
        )}
      >
        <Filter className="w-3.5 h-3.5 text-muted-foreground" aria-hidden="true" />
        <span>Filtros</span>
        {temFiltroAtivo && (
          <span className="min-w-4 h-4 px-1 rounded-full bg-info text-primary-foreground text-[10px] font-semibold inline-flex items-center justify-center tabular-nums shrink-0">
            {totalAtivos}
          </span>
        )}
      </button>

      <div
        id={painelId}
        ref={painelRef}
        popover="auto"
        role="group"
        aria-label="Filtros do funil"
        onToggle={(e) => setAberto(e.newState === "open")}
        style={{ positionAnchor: ancoraFiltros }}
        className={cn(
          "mwg-popover w-72 max-h-[80dvh] overflow-y-auto bg-surface text-foreground rounded-xl shadow-lg border border-border-strong p-3.5 space-y-3",
          !suportaPopover && (aberto ? "mwg-popover-fallback block" : "hidden")
        )}
      >
        <div className="flex items-center justify-between pb-2 border-b border-border-subtle">
          <span className="text-xs font-semibold text-foreground">Filtros do funil</span>
          {temLimpezaDisponivel && (
            <button
              type="button"
              onClick={() => {
                onLimparFiltros();
                painelRef.current?.hidePopover?.();
                setAberto(false);
                botaoFiltrosRef.current?.focus();
              }}
              className="text-xs font-medium text-info hover:underline cursor-pointer"
            >
              Limpar todos
            </button>
          )}
        </div>

        <div className="space-y-1.5">
          <span className="text-xs font-medium text-muted-foreground block">
            Categoria
          </span>
          <div className="grid grid-cols-3 gap-1">
            {CATEGORIAS.map((cat) => {
              const ativo = (cat === "Todas" && !categoriaFiltro) || categoriaFiltro === cat;
              return (
                <button
                  key={cat}
                  type="button"
                  aria-pressed={ativo}
                  onClick={() => setCategoriaFiltro(cat === "Todas" ? "" : cat)}
                  className={cn(
                    "flex items-center justify-between px-2 py-1 text-xs rounded-md transition-colors text-left cursor-pointer",
                    ativo
                      ? "bg-info-light text-info font-semibold"
                      : "text-foreground-muted hover:bg-surface-subtle"
                  )}
                >
                  <span className="truncate">{cat}</span>
                  {ativo && <Check aria-hidden="true" className="w-3 h-3 shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-1.5">
          <span className="text-xs font-medium text-muted-foreground block">
            Etapa do material
          </span>
          <div className="grid grid-cols-2 gap-1">
            {ETAPAS_MATERIAIS.map((mat) => {
              const ativo = (mat === "Todos" && !materialFiltro) || materialFiltro === mat;
              return (
                <button
                  key={mat}
                  type="button"
                  aria-pressed={ativo}
                  onClick={() => setMaterialFiltro(mat === "Todos" ? "" : mat)}
                  className={cn(
                    "flex items-center justify-between px-2 py-1 text-xs rounded-md transition-colors text-left cursor-pointer",
                    ativo
                      ? "bg-info-light text-info font-semibold"
                      : "text-foreground-muted hover:bg-surface-subtle"
                  )}
                >
                  <span className="truncate">{mat}</span>
                  {ativo && <Check aria-hidden="true" className="w-3 h-3 shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
