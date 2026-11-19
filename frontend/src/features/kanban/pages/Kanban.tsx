import { useState, useRef, useLayoutEffect, type ReactNode } from "react";
import { useModoDisplay } from "@/shared/contexts/ModoDisplayContext";
import { podeVerModo } from "@/shared/lib/podeVerModo";
import { BotaoModoDisplay } from "@/shared/components/display/BotaoModoDisplay";
import { Plus, Search } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "@/shared/components/ui/PageHeader";
import { Button } from "@/shared/components/ui/Button";
import { SearchInput } from "@/shared/components/ui/SearchInput";
import { RoleGate } from "@/shared/components/auth/RoleGate";
import FeedbackLoading from "@/shared/components/feedback/FeedbackLoading";
import FeedbackErro from "@/shared/components/feedback/FeedbackErro";
import { EmptyState } from "@/shared/components/feedback/EmptyState";
import { useAuthStore } from "@/shared/stores/useAuthStore";
import KanbanBoard from "@/features/kanban/components/KanbanBoard";
import KanbanQuickFilters from "@/features/kanban/components/KanbanQuickFilters";
import { useKanbanFilterStore } from "@/features/kanban/stores/useKanbanFilterStore";
import type { Material } from "@/shared/types/materiais";
import type { ObraKanbanCard } from "@/features/kanban/types/kanban";
import type { DrawerKanbanSlotProps } from "@/features/kanban/types/gavetaKanban";

export interface KanbanProps {
  obras?: ObraKanbanCard[];
  carregandoObras?: boolean;
  erroObras?: boolean;
  onRecarregarObras?: () => void;
  mapaMateriais?: Map<number, Material[]>;
  erroMateriais?: boolean;
  onRecarregarMateriais?: () => void;
  alocacoesAtivasSet?: Set<number>;
  onExcluirObra?: (obraId: number) => Promise<void>;
  renderDrawer?: (props: DrawerKanbanSlotProps) => ReactNode;
  renderizarAcoesObra?: (obraId: number) => ReactNode;
}

export default function Kanban({
  obras: obrasExternas,
  carregandoObras = false,
  erroObras = false,
  onRecarregarObras,
  mapaMateriais,
  erroMateriais,
  onRecarregarMateriais,
  alocacoesAtivasSet,
  onExcluirObra,
  renderDrawer,
  renderizarAcoesObra,
}: KanbanProps = {}) {
  const { ativo: modoAtivo, elegivelParaModo, alturaSelo } = useModoDisplay();
  const navigate = useNavigate();
  const perfil = useAuthStore((s) => s.usuario?.perfil?.nomePerfil);
  const canCriarObra = perfil === "Administrador" || perfil === "Engenharia";

  const busca = useKanbanFilterStore((s) => s.busca);
  const setBusca = useKanbanFilterStore((s) => s.setBusca);
  const categoriaFiltro = useKanbanFilterStore((s) => s.categoriaFiltro);
  const setCategoriaFiltro = useKanbanFilterStore((s) => s.setCategoriaFiltro);
  const materialFiltro = useKanbanFilterStore((s) => s.materialFiltro);
  const setMaterialFiltro = useKanbanFilterStore((s) => s.setMaterialFiltro);
  const limparFiltrosStore = useKanbanFilterStore((s) => s.limparFiltros);

  // Inicializa aberto se já houver termo de busca salvo na sessão
  const [buscaAberta, setBuscaAberta] = useState(() => Boolean(busca.trim()));
  const pesquisarRef = useRef<HTMLButtonElement>(null);
  const devolverFocoBuscaRef = useRef(false);
  useLayoutEffect(() => {
    if (!buscaAberta && devolverFocoBuscaRef.current) {
      devolverFocoBuscaRef.current = false;
      pesquisarRef.current?.focus();
    }
  }, [buscaAberta]);
  const fecharBusca = () => {
    devolverFocoBuscaRef.current = true;
    setBusca("");
    setBuscaAberta(false);
  };

  const obras = obrasExternas || [];
  const temFiltroAtivo = Boolean(categoriaFiltro || materialFiltro);

  const limparFiltros = () => {
    limparFiltrosStore();
    setBuscaAberta(false);
  };

  const renderContent = () => {
    if (carregandoObras) {
      return (
        <div className="flex-1 flex items-center justify-center min-h-[400px]">
          <FeedbackLoading mensagem="Carregando fluxo de obras..." />
        </div>
      );
    }

    if (erroObras) {
      return (
        <div className="flex-1 flex items-center justify-center min-h-[400px]">
          <FeedbackErro
            mensagem="Não foi possível carregar as obras do funil."
            onTentarNovamente={() => onRecarregarObras?.()}
          />
        </div>
      );
    }

    if (obras.length === 0) {
      return (
        <div className="flex-1 flex items-center justify-center min-h-[400px]">
          <EmptyState
            titulo="Nenhuma obra cadastrada"
            descricao={modoAtivo ? undefined : "Comece cadastrando uma nova obra para alimentar o funil operacional."}
            acao={
              canCriarObra && !modoAtivo
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
        somenteLeitura={modoAtivo}
        busca={busca}
        categoriaFiltro={categoriaFiltro}
        materialFiltro={materialFiltro}
        mapaMateriais={mapaMateriais}
        erroMateriais={erroMateriais}
        onRecarregarMateriais={onRecarregarMateriais}
        alocacoesAtivasSet={alocacoesAtivasSet}
        onExcluirObra={onExcluirObra}
        renderDrawer={renderDrawer}
        renderizarAcoesObra={renderizarAcoesObra}
      />
    );
  };

  return (
    <div className="flex-1 flex flex-col h-full min-h-0 overflow-hidden"
      style={modoAtivo ? { paddingBottom: alturaSelo } : undefined}>
      <PageHeader
        title="Funil de Obras"
        ocultarMenuLateral={modoAtivo}
        subtitle="Acompanhamento por etapa"
      >
        {podeVerModo(perfil) && elegivelParaModo && <BotaoModoDisplay />}
        {!modoAtivo && <div className="flex items-center gap-2">
          {/* Busca Expansível Inline Suave */}
          {buscaAberta ? (
            <SearchInput
              valor={busca}
              onChange={setBusca}
              onLimpar={fecharBusca}
              onEscape={fecharBusca}
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
              ref={pesquisarRef}
              onClick={() => setBuscaAberta(true)}
              aria-label="Pesquisar"
              className="px-3 md:px-4"
            >
              <Search className="w-4 h-4" aria-hidden="true" />
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
              aria-label="Nova obra"
              className="px-3 md:px-4"
            >
              <Plus className="w-4 h-4" aria-hidden="true" />
              <span className="hidden md:inline">Nova obra</span>
            </Button>
          </RoleGate>
        </div>}
      </PageHeader>

      <section className="flex-1 min-h-0 overflow-auto p-4 md:p-8 custom-scrollbar bg-background-app flex flex-col">
        {renderContent()}
      </section>
    </div>
  );
}
