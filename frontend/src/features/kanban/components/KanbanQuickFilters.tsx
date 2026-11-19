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
}

// RF-03 / Contrato 07-api: Categorias canônicas de obra
const CATEGORIAS = [
  "Todas",
  "Residencial",
  "Comercial",
];

// RF-06: Filtro alinhado às 4 etapas de gargalo logístico de materiais.
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
}: KanbanQuickFiltersProps) {
  const [aberto, setAberto] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const botaoFiltrosRef = useRef<HTMLButtonElement>(null);
  const painelId = useId();

  const totalAtivos = (categoriaFiltro ? 1 : 0) + (materialFiltro ? 1 : 0);

  useEffect(() => {
    const handleClickFora = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setAberto(false);
      }
    };
    if (aberto) {
      document.addEventListener("mousedown", handleClickFora);
    }
    return () => document.removeEventListener("mousedown", handleClickFora);
  }, [aberto]);

  return (
    <div className="relative" ref={dropdownRef} onKeyDown={e => {
      if (aberto && e.key === "Escape" && !e.nativeEvent.isComposing) {
        e.preventDefault(); e.stopPropagation(); setAberto(false); botaoFiltrosRef.current?.focus();
      }
    }}>
      <button
        type="button"
        ref={botaoFiltrosRef} aria-expanded={aberto} aria-controls={painelId}
        onClick={() => setAberto((prev) => !prev)}
        className={cn(
          "inline-flex items-center justify-center gap-2 px-3 md:px-4 py-2 text-sm font-medium rounded-lg border transition-all cursor-pointer shadow-2xs h-[38px]",
          temFiltroAtivo
            ? "bg-info-light text-info border-info-border ring-2 ring-info-border/50"
            : "bg-surface text-foreground-muted border-border-strong hover:bg-surface-subtle"
        )}
      >
        <Filter className="w-4 h-4 text-muted-foreground" />
        <span>Filtros</span>
        {temFiltroAtivo && (
          <span className="w-4 h-4 rounded-full bg-info text-primary-foreground text-[9px] font-bold flex items-center justify-center shrink-0">
            {totalAtivos}
          </span>
        )}
      </button>

      {aberto && (
        <div id={painelId} role="group" aria-label="Filtros rápidos" className="absolute right-0 mt-2 w-64 bg-surface rounded-xl shadow-xl border border-border-subtle p-3 z-40">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-border-subtle">
            <span className="text-xs font-bold text-foreground-secondary">Filtros Rápidos</span>
            {temFiltroAtivo && (
              <button
                type="button"
                onClick={() => {
                  botaoFiltrosRef.current?.focus();
                  onLimparFiltros();
                  setAberto(false);
                }}
                className="text-[11px] font-semibold text-info hover:text-info-hover cursor-pointer"
              >
                Limpar todos
              </button>
            )}
          </div>

          {/* Seção 1: Categoria */}
          <div className="mb-3">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-1.5">
              Categoria
            </span>
            <div className="grid grid-cols-2 gap-1">
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

          {/* Seção 2: Etapa do Material (sem siglas na UI) */}
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-1.5">
              Etapa do Material
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
      )}
    </div>
  );
}
