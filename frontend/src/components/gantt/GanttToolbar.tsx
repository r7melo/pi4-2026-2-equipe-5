import { Calendar, ZoomIn, ZoomOut } from "lucide-react";

export type NivelZoom = "day" | "week" | "month";

interface GanttToolbarProps {
  nivelAtual: NivelZoom;
  onMudarNivel: (nivel: NivelZoom) => void;
  onHoje: () => void;
}

const NIVEIS: { valor: NivelZoom; label: string }[] = [
  { valor: "day", label: "Dia" },
  { valor: "week", label: "Semana" },
  { valor: "month", label: "Mês" },
];

export function GanttToolbar({ nivelAtual, onMudarNivel, onHoje }: GanttToolbarProps) {
  return (
    <div className="flex items-center gap-2 shrink-0">
      {/* Botão "Hoje" */}
      <button
        onClick={onHoje}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium transition-all active:scale-[0.97] cursor-pointer"
      >
        <Calendar className="w-3.5 h-3.5" />
        Hoje
      </button>

      {/* Seletor de zoom: Dia / Semana / Mês */}
      <div className="flex items-center gap-0.5 bg-slate-100 rounded-md p-0.5 border border-slate-200">
        {NIVEIS.map(({ valor, label }) => (
          <button
            key={valor}
            onClick={() => onMudarNivel(valor)}
            className={`px-3 py-1 rounded-sm text-xs font-medium transition-all cursor-pointer ${
              nivelAtual === valor
                ? "bg-white text-slate-800 shadow-sm border border-slate-200/50"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Botões +/- (atalho visual) */}
      <div className="flex items-center gap-0.5 ml-1">
        <button
          onClick={() => {
            const idx = NIVEIS.findIndex((n) => n.valor === nivelAtual);
            if (idx > 0) onMudarNivel(NIVEIS[idx - 1].valor);
          }}
          disabled={nivelAtual === "day"}
          className="p-1.5 rounded-md border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-30 transition-all cursor-pointer disabled:cursor-not-allowed"
          title="Zoom In"
        >
          <ZoomIn className="w-3.5 h-3.5 text-slate-600" />
        </button>
        <button
          onClick={() => {
            const idx = NIVEIS.findIndex((n) => n.valor === nivelAtual);
            if (idx < NIVEIS.length - 1) onMudarNivel(NIVEIS[idx + 1].valor);
          }}
          disabled={nivelAtual === "month"}
          className="p-1.5 rounded-md border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-30 transition-all cursor-pointer disabled:cursor-not-allowed"
          title="Zoom Out"
        >
          <ZoomOut className="w-3.5 h-3.5 text-slate-600" />
        </button>
      </div>
    </div>
  );
}
