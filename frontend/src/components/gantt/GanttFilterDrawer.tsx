import { useState } from "react";
import { RotateCcw, BookmarkCheck, Filter, Calendar, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { SearchInput } from "@/components/ui/SearchInput";
import { Drawer } from "@/components/ui/Drawer";
import type { GanttFiltrosAvancados, Equipe, CategoriaObra } from "@/types";
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
    <Drawer
      isOpen={aberto}
      onClose={onFechar}
      tamanho="md"
      titulo="Filtros Avançados"
      icone={<Filter className="w-5 h-5 text-info" />}
    >
      {/* Corpo do formulário com rolagem suave */}
      <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
        {/* 1. Termo de Busca */}
        <div>
          <label className="block font-semibold text-foreground-muted mb-1">
            Buscar Obra ou Cliente
          </label>
          <SearchInput
            valor={form.termoBusca || ""}
            onChange={(val) => setForm({ ...form, termoBusca: val })}
            placeholder="Nome do cliente, ID, equipe..."
            tamanho="sm"
          />
        </div>

        {/* 2. Categoria da Obra */}
        <div>
          <label className="block font-semibold text-foreground-muted mb-1">
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
            className="w-full px-3 py-2 bg-surface-subtle border border-border-subtle rounded-md focus:bg-surface focus:outline-none focus:ring-1 focus:ring-info text-foreground-secondary cursor-pointer"
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
          <label className="block font-semibold text-foreground-muted mb-1">
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
            className="w-full px-3 py-2 bg-surface-subtle border border-border-subtle rounded-md focus:bg-surface focus:outline-none focus:ring-1 focus:ring-info text-foreground-secondary cursor-pointer"
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
          <label className="block font-semibold text-foreground-muted mb-1">
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
            className="w-full px-3 py-2 bg-surface-subtle border border-border-subtle rounded-md focus:bg-surface focus:outline-none focus:ring-1 focus:ring-info text-foreground-secondary cursor-pointer"
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
          <label className="block font-semibold text-foreground-muted mb-1">
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
            className="w-full px-3 py-2 bg-surface-subtle border border-border-subtle rounded-md focus:bg-surface focus:outline-none focus:ring-1 focus:ring-info text-foreground-secondary cursor-pointer"
          >
            <option value="">Todas as prioridades</option>
            <option value="1">Alta (1)</option>
            <option value="2">Média (2)</option>
            <option value="3">Baixa (3)</option>
          </select>
        </div>

        {/* 6. Responsável pela Atualização */}
        <div>
          <label className="block font-semibold text-foreground-muted mb-1">
            Atualizado Por (Responsável)
          </label>
          <input
            type="text"
            value={form.responsavel || ""}
            onChange={(e) => setForm({ ...form, responsavel: e.target.value })}
            placeholder="Nome do operador ou engenheiro"
            className="w-full px-3 py-2 bg-surface-subtle border border-border-subtle rounded-md focus:bg-surface focus:outline-none focus:ring-1 focus:ring-info text-foreground-secondary placeholder-subtle-foreground"
          />
        </div>

        {/* 7. Período de Início */}
        <div>
          <label className="block font-semibold text-foreground-muted mb-1 flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-info" />
            <span>Intervalo de Início da Obra</span>
          </label>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <span className="text-[10px] text-muted-foreground block mb-0.5">A partir de:</span>
              <input
                type="date"
                value={form.dataInicioDe || ""}
                onChange={(e) => setForm({ ...form, dataInicioDe: e.target.value })}
                className="w-full px-2 py-1.5 bg-surface-subtle border border-border-subtle rounded-md text-foreground-secondary focus:bg-surface focus:outline-none focus:ring-1 focus:ring-info"
              />
            </div>
            <div>
              <span className="text-[10px] text-muted-foreground block mb-0.5">Até:</span>
              <input
                type="date"
                value={form.dataInicioAte || ""}
                onChange={(e) => setForm({ ...form, dataInicioAte: e.target.value })}
                className="w-full px-2 py-1.5 bg-surface-subtle border border-border-subtle rounded-md text-foreground-secondary focus:bg-surface focus:outline-none focus:ring-1 focus:ring-info"
              />
            </div>
          </div>
        </div>

        {/* 8. Período de Término */}
        <div>
          <label className="block font-semibold text-foreground-muted mb-1 flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-success" />
            <span>Intervalo de Término da Obra</span>
          </label>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <span className="text-[10px] text-muted-foreground block mb-0.5">A partir de:</span>
              <input
                type="date"
                value={form.dataFimDe || ""}
                onChange={(e) => setForm({ ...form, dataFimDe: e.target.value })}
                className="w-full px-2 py-1.5 bg-surface-subtle border border-border-subtle rounded-md text-foreground-secondary focus:bg-surface focus:outline-none focus:ring-1 focus:ring-info"
              />
            </div>
            <div>
              <span className="text-[10px] text-muted-foreground block mb-0.5">Até:</span>
              <input
                type="date"
                value={form.dataFimAte || ""}
                onChange={(e) => setForm({ ...form, dataFimAte: e.target.value })}
                className="w-full px-2 py-1.5 bg-surface-subtle border border-border-subtle rounded-md text-foreground-secondary focus:bg-surface focus:outline-none focus:ring-1 focus:ring-info"
              />
            </div>
          </div>
        </div>

        {/* 9. Prontidão dos Materiais */}
        <div>
          <label className="block font-semibold text-foreground-muted mb-1">
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
                    ? "bg-info-light border-info-border text-info font-bold"
                    : "bg-surface-subtle border-border-subtle text-muted-foreground hover:bg-muted"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* 10. Checkbox: Apenas Tarefas Atrasadas */}
        <div className="pt-2 border-t border-border-subtle">
          <label className="flex items-center gap-2.5 p-2 rounded-md hover:bg-surface-subtle cursor-pointer">
            <input
              type="checkbox"
              checked={Boolean(form.apenasAtrasadas)}
              onChange={(e) => setForm({ ...form, apenasAtrasadas: e.target.checked })}
              className="w-4 h-4 text-info accent-info rounded-sm border-border-strong focus:ring-info cursor-pointer"
            />
            <div className="flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 text-destructive" />
              <span className="font-semibold text-foreground-secondary">
                Apenas Tarefas Atrasadas
              </span>
            </div>
          </label>
        </div>
      </div>

      {/* Rodapé Fixo com Ações */}
      <div className="p-4 border-t border-border-subtle bg-surface-subtle flex flex-col gap-2 shrink-0">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleLimpar}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 border border-border-strong text-foreground-muted hover:bg-muted font-semibold rounded-lg text-xs transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Limpar</span>
          </button>

          <button
            type="button"
            onClick={handleAplicar}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-info hover:bg-info-hover text-primary-foreground font-semibold rounded-lg text-xs shadow-xs transition-colors cursor-pointer"
          >
            <span>Aplicar Filtros</span>
          </button>
        </div>

        {onSalvarVisaoFavorita && (
          <button
            type="button"
            onClick={handleSalvarFavorito}
            className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 border border-info-border text-info hover:bg-info-light font-medium rounded-lg text-xs transition-colors cursor-pointer"
          >
            <BookmarkCheck className="w-3.5 h-3.5 text-info" />
            <span>Salvar como Visão Padrão</span>
          </button>
        )}
      </div>
    </Drawer>
  );
}

export default GanttFilterDrawer;
