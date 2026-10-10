import { useState, useRef, useEffect } from "react";
import { Filter, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface KanbanQuickFiltersProps {
  categoriaFiltro: string;
  setCategoriaFiltro: (cat: string) => void;
  materialFiltro: string;
  setMaterialFiltro: (mat: string) => void;
  onLimparFiltros: () => void;
  temFiltroAtivo: boolean;
}

const CATEGORIAS = [
  "Todas",
  "Residencial",
  "Comercial",
  "Industrial",
  "Rural",
  "Manutenção",
];

// RF-06: Filtro alinhado às etapas logísticas de materiais no funil
const ETAPAS_MATERIAIS = [
  "Todos",
  "Comprado",
  "No Depósito",
  "Separado",
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
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setAberto((prev) => !prev)}
        className={cn(
          "inline-flex items-center justify-center gap-2 px-3 md:px-4 py-2 text-sm font-medium rounded-lg border transition-all cursor-pointer shadow-2xs h-[38px]",
          temFiltroAtivo
            ? "bg-blue-50 text-blue-700 border-blue-300 ring-2 ring-blue-300/30"
            : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50 hover:border-slate-400"
        )}
      >
        <Filter className="w-4 h-4 text-slate-500" />
        <span>Filtros</span>
        {temFiltroAtivo && (
          <span className="w-4 h-4 rounded-full bg-blue-600 text-white text-[9px] font-bold flex items-center justify-center shrink-0">
            {totalAtivos}
          </span>
        )}
      </button>

      {aberto && (
        <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-slate-200 p-3 z-40 animate-in fade-in zoom-in-95 duration-150">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100">
            <span className="text-xs font-bold text-slate-800">Filtros Rápidos</span>
            {temFiltroAtivo && (
              <button
                type="button"
                onClick={() => {
                  onLimparFiltros();
                  setAberto(false);
                }}
                className="text-[11px] font-semibold text-blue-600 hover:text-blue-800 cursor-pointer"
              >
                Limpar todos
              </button>
            )}
          </div>

          {/* Seção 1: Categoria */}
          <div className="mb-3">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
              Categoria
            </span>
            <div className="grid grid-cols-2 gap-1">
              {CATEGORIAS.map((cat) => {
                const ativo = (cat === "Todas" && !categoriaFiltro) || categoriaFiltro === cat;
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setCategoriaFiltro(cat === "Todas" ? "" : cat)}
                    className={cn(
                      "flex items-center justify-between px-2 py-1 text-xs rounded-md transition-colors text-left cursor-pointer",
                      ativo
                        ? "bg-blue-50 text-blue-700 font-semibold"
                        : "text-slate-600 hover:bg-slate-50"
                    )}
                  >
                    <span className="truncate">{cat}</span>
                    {ativo && <Check className="w-3 h-3 shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Seção 2: Etapa do Material (sem siglas na UI) */}
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
              Etapa do Material
            </span>
            <div className="grid grid-cols-2 gap-1">
              {ETAPAS_MATERIAIS.map((mat) => {
                const ativo = (mat === "Todos" && !materialFiltro) || materialFiltro === mat;
                return (
                  <button
                    key={mat}
                    type="button"
                    onClick={() => setMaterialFiltro(mat === "Todos" ? "" : mat)}
                    className={cn(
                      "flex items-center justify-between px-2 py-1 text-xs rounded-md transition-colors text-left cursor-pointer",
                      ativo
                        ? "bg-blue-50 text-blue-700 font-semibold"
                        : "text-slate-600 hover:bg-slate-50"
                    )}
                  >
                    <span className="truncate">{mat}</span>
                    {ativo && <Check className="w-3 h-3 shrink-0" />}
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
