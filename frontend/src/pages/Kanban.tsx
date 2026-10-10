import { useState } from "react";
import { Plus, Search, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { RoleGate } from "@/components/auth/RoleGate";
import FeedbackLoading from "@/components/feedback/FeedbackLoading";
import FeedbackErro from "@/components/feedback/FeedbackErro";
import FeedbackVazio from "@/components/feedback/FeedbackVazio";
import { useObras } from "@/hooks/api/useObras";
import KanbanBoard from "@/components/kanban/KanbanBoard";
import KanbanQuickFilters from "@/components/kanban/KanbanQuickFilters";
import { useKanbanFilterStore } from "@/stores/useKanbanFilterStore";

export default function Kanban() {
  const navigate = useNavigate();
  const { data, isLoading, isError, refetch } = useObras();

  const busca = useKanbanFilterStore((s) => s.busca);
  const setBusca = useKanbanFilterStore((s) => s.setBusca);
  const categoriaFiltro = useKanbanFilterStore((s) => s.categoriaFiltro);
  const setCategoriaFiltro = useKanbanFilterStore((s) => s.setCategoriaFiltro);
  const materialFiltro = useKanbanFilterStore((s) => s.materialFiltro);
  const setMaterialFiltro = useKanbanFilterStore((s) => s.setMaterialFiltro);
  const limparFiltrosStore = useKanbanFilterStore((s) => s.limparFiltros);

  // Inicializa aberto se já houver termo de busca salvo na sessão
  const [buscaAberta, setBuscaAberta] = useState(() => Boolean(busca.trim()));

  const obras = data?.itens || [];
  const temFiltroAtivo = Boolean(categoriaFiltro || materialFiltro);

  const limparFiltros = () => {
    limparFiltrosStore();
    setBuscaAberta(false);
  };

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="flex-1 flex items-center justify-center min-h-[400px]">
          <FeedbackLoading mensagem="Carregando fluxo de obras..." />
        </div>
      );
    }

    if (isError) {
      return (
        <div className="flex-1 flex items-center justify-center min-h-[400px]">
          <FeedbackErro
            mensagem="Não foi possível carregar as obras do funil."
            onTentarNovamente={() => void refetch()}
          />
        </div>
      );
    }

    if (obras.length === 0) {
      return (
        <div className="flex-1 flex items-center justify-center min-h-[400px]">
          <FeedbackVazio
            titulo="Nenhuma obra cadastrada"
            mensagem="Comece cadastrando uma nova obra para alimentar o funil operacional."
            textoBotao="Nova Obra"
            onAcao={() => navigate("/cadastrarobra")}
          />
        </div>
      );
    }

    return (
      <KanbanBoard
        obras={obras}
        busca={busca}
        categoriaFiltro={categoriaFiltro}
        materialFiltro={materialFiltro}
      />
    );
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      <PageHeader
        title="Funil de Obras"
        subtitle="Acompanhamento por etapa"
      >
        <div className="flex items-center gap-2">
          {/* Busca Expansível Inline Suave */}
          {buscaAberta ? (
            <div className="flex items-center bg-white border border-slate-200 rounded-lg px-2.5 py-1 shadow-2xs animate-in fade-in duration-150">
              <Search className="w-3.5 h-3.5 text-slate-400 mr-2 shrink-0" />
              <input
                type="text"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Escape") {
                    setBusca("");
                    setBuscaAberta(false);
                  }
                }}
                placeholder="Buscar cliente ou ID..."
                className="text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden w-40 md:w-52"
                autoFocus
              />
              <button
                type="button"
                onClick={() => {
                  setBusca("");
                  setBuscaAberta(false);
                }}
                className="text-slate-400 hover:text-slate-600 p-0.5 rounded cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <Button
              variant="outline"
              size="md"
              onClick={() => setBuscaAberta(true)}
              className="px-3 md:px-4"
            >
              <Search className="w-4 h-4" />
              <span className="hidden md:inline">Pesquisar</span>
            </Button>
          )}

          {/* Caixinha com Dropdown de Filtros Rápidos */}
          <KanbanQuickFilters
            categoriaFiltro={categoriaFiltro}
            setCategoriaFiltro={setCategoriaFiltro}
            materialFiltro={materialFiltro}
            setMaterialFiltro={setMaterialFiltro}
            onLimparFiltros={limparFiltros}
            temFiltroAtivo={temFiltroAtivo}
          />

          {/* Botão Nova Obra com RoleGate */}
          <RoleGate allowedRoles={["Administrador", "EngenhariaObras"]}>
            <Button
              variant="primary"
              size="md"
              onClick={() => navigate("/cadastrarobra")}
              className="px-3 md:px-4"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden md:inline">Nova obra</span>
            </Button>
          </RoleGate>
        </div>
      </PageHeader>

      <main className="flex-1 overflow-auto p-4 md:p-8 custom-scrollbar bg-background-app flex flex-col">
        {renderContent()}
      </main>
    </div>
  );
}
