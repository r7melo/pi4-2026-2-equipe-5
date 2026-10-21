import { useState } from "react";
import { Plus, Search } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "@/shared/components/ui/PageHeader";
import { Button } from "@/shared/components/ui/Button";
import { SearchInput } from "@/shared/components/ui/SearchInput";
import { RoleGate } from "@/features/auth/components/RoleGate";
import FeedbackLoading from "@/shared/components/feedback/FeedbackLoading";
import FeedbackErro from "@/shared/components/feedback/FeedbackErro";
import { EmptyState } from "@/shared/components/feedback/EmptyState";
import { useAuthStore } from "@/features/auth/stores/useAuthStore";
import { useObras } from "@/features/obras/hooks/useObras";
import KanbanBoard from "@/features/kanban/components/KanbanBoard";
import KanbanQuickFilters from "@/features/kanban/components/KanbanQuickFilters";
import { useKanbanFilterStore } from "@/features/kanban/stores/useKanbanFilterStore";

export default function Kanban() {
  const navigate = useNavigate();
  const perfil = useAuthStore((s) => s.usuario?.perfil?.nomePerfil);
  const canCriarObra = perfil === "Administrador" || perfil === "Engenharia";
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
          <EmptyState
            titulo="Nenhuma obra cadastrada"
            descricao="Comece cadastrando uma nova obra para alimentar o funil operacional."
            acao={
              canCriarObra
                ? {
                    label: "Nova Obra",
                    onClick: () => { void navigate("/cadastrarobra"); },
                  }
                : undefined
            }
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
            <SearchInput
              valor={busca}
              onChange={setBusca}
              onLimpar={() => {
                setBusca("");
                setBuscaAberta(false);
              }}
              onEscape={() => {
                setBusca("");
                setBuscaAberta(false);
              }}
              placeholder="Buscar cliente ou ID..."
              tamanho="sm"
              autoFocus
              exibirLimparSempre
              className="w-48 md:w-56"
            />
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
          <RoleGate allowedRoles={["Administrador", "Engenharia"]}>
            <Button
              variant="primary"
              size="md"
              onClick={() => { void navigate("/cadastrarobra"); }}
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
