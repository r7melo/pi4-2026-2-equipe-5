// frontend/src/components/gantt/GanttFilterDrawer.tsx
// Gaveta Lateral de Filtros Avançados do Cronograma Gantt (Gap G-03)
import { useState } from "react";
import { X, RotateCcw, BookmarkCheck, Filter, Search, Calendar, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import type { GanttFiltrosAvancados } from "@/stores/useGanttStore";
import type { Equipe } from "@/services/equipes";
import type { CategoriaObra } from "@/types";
import type { StatusObra } from "@/constants/kanbanStatus";

interface GanttFilterDrawerProps {
  aberto: boolean;
  onFechar: () => void;
  filtrosAtuais: GanttFiltrosAvancados;
  onAplicarFiltros: (novos: GanttFiltrosAvancados) => void;
  onSalvarVisaoFavorita?: (filtros: GanttFiltrosAvancados) => void;
  equipesDisponiveis: Equipe[];
}

export function GanttFilterDrawer({
  aberto,
  onFechar,
  filtrosAtuais,
  onAplicarFiltros,
  onSalvarVisaoFavorita,
  equipesDisponiveis,
}: GanttFilterDrawerProps) {
  const [prevAberto, setPrevAberto] = useState(aberto);
  const [form, setForm] = useState<GanttFiltrosAvancados>(filtrosAtuais);

  if (prevAberto !== aberto) {
    setPrevAberto(aberto);
    if (aberto) {
      setForm(filtrosAtuais);
    }
  }

  if (!aberto) return null;

  const handleLimpar = () => {
    const limpo: GanttFiltrosAvancados = {};
    setForm(limpo);
    onAplicarFiltros(limpo);
    toast.info("Filtros do cronograma redefinidos");
  };

  const handleAplicar = () => {
    onAplicarFiltros(form);
    onFechar();
    toast.success("Filtros aplicados ao cronograma");
  };

  const handleSalvarFavorito = () => {
    onAplicarFiltros(form);
    onSalvarVisaoFavorita?.(form);
    toast.success("Visão personalizada salva com sucesso!");
    onFechar();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
      {/* Backdrop com desfoque */}
      <div
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity animate-fade-in"
        onClick={onFechar}
      />

      {/* Painel lateral deslizante */}
      <div className="relative w-full max-w-md bg-white h-full shadow-2xl flex flex-col z-10 animate-slide-in-right">
        {/* Cabeçalho */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-blue-600" />
            <h2 className="text-base font-bold text-slate-800">Filtros Avançados</h2>
          </div>
          <button
            onClick={onFechar}
            className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-colors cursor-pointer"
            title="Fechar gaveta"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Corpo do formulário com rolagem suave */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
          {/* 1. Termo de Busca */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Buscar Obra ou Cliente
            </label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={form.termoBusca || ""}
                onChange={(e) => setForm({ ...form, termoBusca: e.target.value })}
                placeholder="Nome do cliente, ID, equipe..."
                className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-md focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-800"
              />
            </div>
          </div>

          {/* 2. Categoria da Obra */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Categoria da Obra
            </label>
            <select
              value={form.categoria || ""}
              onChange={(e) =>
                setForm({
                  ...form,
                  categoria: (e.target.value as CategoriaObra) || undefined,
                })
              }
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-md focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-800 cursor-pointer"
            >
              <option value="">Todas as categorias</option>
              <option value="Residencial">Residencial</option>
              <option value="Comercial">Comercial</option>
              <option value="Industrial">Industrial</option>
              <option value="Rural">Rural</option>
              <option value="Manutenção">Manutenção</option>
            </select>
          </div>

          {/* 3. Equipe Responsável */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Equipe Alocada
            </label>
            <select
              value={form.equipeId || ""}
              onChange={(e) =>
                setForm({
                  ...form,
                  equipeId: e.target.value ? Number(e.target.value) : undefined,
                })
              }
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-md focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-800 cursor-pointer"
            >
              <option value="">Todas as equipes</option>
              {equipesDisponiveis.map((eq) => (
                <option key={eq.id} value={eq.id}>
                  {eq.nome} ({eq.especialidade || "Instalação"})
                </option>
              ))}
            </select>
          </div>

          {/* 4. Status da Obra no Funil */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Status da Obra
            </label>
            <select
              value={form.statusObra || ""}
              onChange={(e) =>
                setForm({
                  ...form,
                  statusObra: (e.target.value as StatusObra) || undefined,
                })
              }
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-md focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-800 cursor-pointer"
            >
              <option value="">Todos os status</option>
              <option value="MaterialComprado">Material Comprado</option>
              <option value="NoDeposito">No Depósito</option>
              <option value="Separado">Separado p/ Obra</option>
              <option value="EmAndamento">Em Andamento</option>
              <option value="Concluido">Concluído</option>
              <option value="Assistencia">Assistência / Manutenção</option>
            </select>
          </div>

          {/* 5. Prioridade */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Prioridade
            </label>
            <select
              value={form.prioridade !== undefined ? form.prioridade : ""}
              onChange={(e) =>
                setForm({
                  ...form,
                  prioridade: e.target.value !== "" ? Number(e.target.value) : undefined,
                })
              }
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-md focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-800 cursor-pointer"
            >
              <option value="">Todas as prioridades</option>
              <option value="1">Alta (1)</option>
              <option value="2">Média (2)</option>
              <option value="3">Baixa (3)</option>
            </select>
          </div>

          {/* 6. Responsável pela Atualização */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Atualizado Por (Responsável)
            </label>
            <input
              type="text"
              value={form.responsavel || ""}
              onChange={(e) => setForm({ ...form, responsavel: e.target.value })}
              placeholder="Nome do operador ou engenheiro"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-md focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-800"
            />
          </div>

          {/* 7. Período de Início */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-blue-500" />
              <span>Intervalo de Início da Obra</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="text-[10px] text-slate-500 block mb-0.5">A partir de:</span>
                <input
                  type="date"
                  value={form.dataInicioDe || ""}
                  onChange={(e) => setForm({ ...form, dataInicioDe: e.target.value })}
                  className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-md text-slate-800"
                />
              </div>
              <div>
                <span className="text-[10px] text-slate-500 block mb-0.5">Até:</span>
                <input
                  type="date"
                  value={form.dataInicioAte || ""}
                  onChange={(e) => setForm({ ...form, dataInicioAte: e.target.value })}
                  className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-md text-slate-800"
                />
              </div>
            </div>
          </div>

          {/* 8. Período de Término */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-emerald-500" />
              <span>Intervalo de Término da Obra</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="text-[10px] text-slate-500 block mb-0.5">A partir de:</span>
                <input
                  type="date"
                  value={form.dataFimDe || ""}
                  onChange={(e) => setForm({ ...form, dataFimDe: e.target.value })}
                  className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-md text-slate-800"
                />
              </div>
              <div>
                <span className="text-[10px] text-slate-500 block mb-0.5">Até:</span>
                <input
                  type="date"
                  value={form.dataFimAte || ""}
                  onChange={(e) => setForm({ ...form, dataFimAte: e.target.value })}
                  className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-md text-slate-800"
                />
              </div>
            </div>
          </div>

          {/* 9. Prontidão dos Materiais */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Prontidão dos Materiais (Kits)
            </label>
            <div className="flex gap-2">
              {[
                { id: "todos", label: "Todos" },
                { id: "pronto", label: "Kit Pronto" },
                { id: "pendente", label: "Aguardando Insumos" },
              ].map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() =>
                    setForm({
                      ...form,
                      statusMaterial: opt.id as "todos" | "pronto" | "pendente",
                    })
                  }
                  className={`flex-1 py-1.5 px-2 text-[11px] font-medium rounded-md border text-center transition-all cursor-pointer ${
                    (form.statusMaterial || "todos") === opt.id
                      ? "bg-blue-50 border-blue-400 text-blue-700 font-bold"
                      : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* 10. Checkbox: Apenas Tarefas Atrasadas */}
          <div className="pt-2 border-t border-slate-200">
            <label className="flex items-center gap-2.5 p-2 rounded-md hover:bg-slate-50 cursor-pointer">
              <input
                type="checkbox"
                checked={Boolean(form.apenasAtrasadas)}
                onChange={(e) => setForm({ ...form, apenasAtrasadas: e.target.checked })}
                className="w-4 h-4 text-blue-600 rounded-sm border-slate-300 focus:ring-blue-500 cursor-pointer"
              />
              <div className="flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 text-rose-500" />
                <span className="font-semibold text-slate-800">
                  Apenas Tarefas Atrasadas
                </span>
              </div>
            </label>
          </div>
        </div>

        {/* Rodapé com botões de ação */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleLimpar}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 border border-slate-300 text-slate-700 hover:bg-slate-100 font-semibold rounded-lg text-xs transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Limpar</span>
            </button>

            <button
              type="button"
              onClick={handleAplicar}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg text-xs shadow-xs transition-colors cursor-pointer"
            >
              <span>Aplicar Filtros</span>
            </button>
          </div>

          {onSalvarVisaoFavorita && (
            <button
              type="button"
              onClick={handleSalvarFavorito}
              className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 border border-blue-200 text-blue-700 hover:bg-blue-50 font-medium rounded-lg text-xs transition-colors cursor-pointer"
            >
              <BookmarkCheck className="w-3.5 h-3.5 text-blue-600" />
              <span>Salvar como Visão Padrão</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
