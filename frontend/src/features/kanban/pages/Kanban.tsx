import { useState, useRef, useEffect, type ReactNode } from "react";
import { useModoDisplay } from "@/shared/contexts/ModoDisplayContext";
import { podeVerModo } from "@/shared/lib/podeVerModo";
import { BotaoModoDisplay } from "@/shared/components/display/BotaoModoDisplay";
import { Plus } from "lucide-react";
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

function useIsDesktop(): boolean {
  const [desktop, setDesktop] = useState(() =>
    typeof window === "undefined" ? true : window.matchMedia("(min-width: 768px)").matches
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mql = window.matchMedia("(min-width: 768px)");
    const atualizar = () => setDesktop(mql.matches);
    atualizar();
    mql.addEventListener("change", atualizar);
    return () => mql.removeEventListener("change", atualizar);
  }, []);

  return desktop;
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
  const isDesktop = useIsDesktop();

  const busca = useKanbanFilterStore((s) => s.busca);
  const setBusca = useKanbanFilterStore((s) => s.setBusca);
  const categoriaFiltro = useKanbanFilterStore((s) => s.categoriaFiltro);
  const setCategoriaFiltro = useKanbanFilterStore((s) => s.setCategoriaFiltro);
  const materialFiltro = useKanbanFilterStore((s) => s.materialFiltro);
  const setMaterialFiltro = useKanbanFilterStore((s) => s.setMaterialFiltro);
  const exibirArquivadas = useKanbanFilterStore((s) => s.exibirArquivadas);
  const limparFiltrosStore = useKanbanFilterStore((s) => s.limparFiltros);

  const buscaInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (modoAtivo || typeof document === "undefined") return;
    const handleAtalhoBusca = (e: KeyboardEvent) => {
      if (e.key !== "/" || e.ctrlKey || e.metaKey || e.altKey) return;
      const alvo = e.target as HTMLElement | null;
      if (
        alvo &&
        (alvo.tagName === "INPUT" ||
          alvo.tagName === "TEXTAREA" ||
          alvo.tagName === "SELECT" ||
          alvo.isContentEditable)
      ) {
        return;
      }
      e.preventDefault();
      buscaInputRef.current?.focus();
    };
    document.addEventListener("keydown", handleAtalhoBusca);
    return () => document.removeEventListener("keydown", handleAtalhoBusca);
  }, [modoAtivo]);

  const obras = obrasExternas || [];
  const temFiltroAtivo = Boolean(categoriaFiltro || materialFiltro);
  const temLimpezaDisponivel = temFiltroAtivo || Boolean(busca.trim()) || exibirArquivadas;

  const limparFiltros = () => {
    limparFiltrosStore();
  };

  const renderCampoBusca = (compactoDesktop: boolean) => (
    <SearchInput
      ref={buscaInputRef}
      valor={busca}
      onChange={setBusca}
      onLimpar={() => setBusca("")}
      onEscape={() => {
        if (busca) {
          setBusca("");
        } else {
          buscaInputRef.current?.blur();
        }
      }}
      placeholder={compactoDesktop ? "Buscar cliente (/)" : "Buscar cliente..."}
      ariaLabel="Buscar obra por cliente"
      tamanho={compactoDesktop ? "xs" : "sm"}
      className={compactoDesktop ? "w-48 lg:w-56" : "flex-1 min-w-0"}
    />
  );

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
                    label: "Cadastrar primeira obra",
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
    <div className="flex-1 flex flex-col h-full min-h-0 overflow-hidden">
      <PageHeader
        title="Funil de Obras"
        ocultarMenuLateral={modoAtivo}
        badge={
          !carregandoObras && !erroObras && obras.length > 0 ? (
            <span className="text-xs font-medium text-muted-foreground tabular-nums whitespace-nowrap">
              {obras.length} {obras.length === 1 ? "obra" : "obras"}
            </span>
          ) : undefined
        }
      >
        {modoAtivo ? (
          podeVerModo(perfil) && elegivelParaModo ? <BotaoModoDisplay compacto /> : null
        ) : isDesktop ? (
          <div className="flex items-center gap-1.5">
            {renderCampoBusca(true)}
            {podeVerModo(perfil) && elegivelParaModo && <BotaoModoDisplay compacto />}
            <KanbanQuickFilters
              categoriaFiltro={categoriaFiltro}
              setCategoriaFiltro={setCategoriaFiltro}
              materialFiltro={materialFiltro}
              setMaterialFiltro={setMaterialFiltro}
              onLimparFiltros={limparFiltros}
              temFiltroAtivo={temFiltroAtivo}
              temLimpezaDisponivel={temLimpezaDisponivel}
              compacto
            />
            <RoleGate allowedRoles={["Administrador", "Engenharia"]}>
              <Button
                variant="primary"
                size="sm"
                onClick={() => { void navigate("/cadastrarobra"); }}
                aria-label="Nova obra"
                className="h-7 py-0 px-2.5 controle-compacto text-xs gap-1.5 shrink-0"
              >
                <Plus className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Nova obra</span>
              </Button>
            </RoleGate>
          </div>
        ) : (
          <div className="flex items-center gap-1.5">
            {podeVerModo(perfil) && elegivelParaModo && <BotaoModoDisplay compacto />}
            <RoleGate allowedRoles={["Administrador", "Engenharia"]}>
              <Button
                variant="primary"
                size="sm"
                onClick={() => { void navigate("/cadastrarobra"); }}
                aria-label="Nova obra"
                className="h-7 py-0 px-2.5 controle-compacto text-xs gap-1 shrink-0"
              >
                <Plus className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Nova obra</span>
              </Button>
            </RoleGate>
          </div>
        )}
      </PageHeader>

      {!isDesktop && !modoAtivo && (
        <div className="shrink-0 border-b border-border-subtle bg-surface px-3 py-2 flex items-center gap-2">
          {renderCampoBusca(false)}
          <KanbanQuickFilters
            categoriaFiltro={categoriaFiltro}
            setCategoriaFiltro={setCategoriaFiltro}
            materialFiltro={materialFiltro}
            setMaterialFiltro={setMaterialFiltro}
            onLimparFiltros={limparFiltros}
            temFiltroAtivo={temFiltroAtivo}
            temLimpezaDisponivel={temLimpezaDisponivel}
            compacto={false}
          />
        </div>
      )}

      <section className="flex-1 min-h-0 overflow-auto p-3 md:p-4 custom-scrollbar bg-background-app flex flex-col">
        <div
          className="flex-1 flex flex-col"
          style={modoAtivo ? { paddingBottom: alturaSelo } : undefined}
        >
          {renderContent()}
        </div>
      </section>
    </div>
  );
}
