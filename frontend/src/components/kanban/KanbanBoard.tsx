import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import {
  DndContext,
  DragOverlay,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { toast } from "sonner";
import type { ObraCard } from "@/types";
import {
  COLUNAS_KANBAN,
  TRANSICOES_VALIDAS,
  type StatusObra,
} from "@/constants/kanbanStatus";
import KanbanColumn from "./KanbanColumn";
import KanbanCardOverlay from "./KanbanCardOverlay";
import KanbanTaskDrawer from "./KanbanTaskDrawer";
import ModalConfirmarConclusao from "./ModalConfirmarConclusao";
import { useMoverCard } from "@/hooks/api/useMoverCard";
import { useMateriaisObras } from "@/hooks/api/useMateriaisObras";
import { isObraConcluidaArquivada } from "./kanbanUtils";
import { cn } from "@/lib/utils";

interface KanbanBoardProps {
  obras: ObraCard[];
  busca: string;
  categoriaFiltro: string;
  materialFiltro: string;
}

const STATUS_TODOS: StatusObra[] = [...COLUNAS_KANBAN.map((c) => c.id)];

export default function KanbanBoard({
  obras,
  busca,
  categoriaFiltro,
  materialFiltro,
}: KanbanBoardProps) {
  const [activeCard, setActiveCard] = useState<ObraCard | null>(null);
  const [initialContainer, setInitialContainer] = useState<StatusObra | null>(null);
  const [drawerCard, setDrawerCard] = useState<ObraCard | null>(null);
  const [obraParaConcluir, setObraParaConcluir] = useState<ObraCard | null>(null);
  const [colunaMobileAtiva, setColunaMobileAtiva] = useState<StatusObra>("MaterialComprado");
  const [exibirArquivadas, setExibirArquivadas] = useState(false);

  const handleSelectCard = useCallback((card: ObraCard) => {
    setDrawerCard(card);
  }, []);

  const moverCardMutation = useMoverCard();

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const obraIds = useMemo(() => obras.map((o) => Number(o.id)), [obras]);
  const { mapaMateriais } = useMateriaisObras(obraIds);

  // Destinos válidos calculados dinamicamente durante o arraste (UX-07)
  const destinosValidos = useMemo(() => {
    if (!activeCard) return [];
    return TRANSICOES_VALIDAS[activeCard.status] || [];
  }, [activeCard]);

  // Total de obras arquivadas na coluna Concluído (> 30 dias da data de término)
  const totalArquivadasConcluidas = useMemo(() => {
    return obras.filter((o) => {
      if (o.status !== "Concluido") return false;
      return isObraConcluidaArquivada(o.dataFimReal || o.dataFimEstimada);
    }).length;
  }, [obras]);

  // Filtragem composta em tempo real com auto-ordenação
  const obrasFiltradas = useMemo(() => {
    const list = obras.filter((obra) => {
      // 1. Busca textual global
      if (busca.trim()) {
        const termo = busca.toLowerCase();
        const matchCliente = obra.clienteNome.toLowerCase().includes(termo);
        const matchId = String(obra.id).includes(termo);
        if (!matchCliente && !matchId) return false;
      }

      // 2. Filtro de Categoria
      if (categoriaFiltro && obra.categoria !== categoriaFiltro) {
        return false;
      }

      // 3. Filtro Logístico de Materiais (RF-06)
      if (materialFiltro && materialFiltro !== "Todos") {
        const mats = mapaMateriais.get(Number(obra.id)) || [];
        if (materialFiltro === "Comprado") {
          const temComprado = mats.some(
            (m) => m.statusLogistico === "Comprado" || m.statusLogistico === "EmTransito"
          );
          if (!temComprado && mats.length > 0) return false;
          if (mats.length === 0 && obra.status !== "MaterialComprado") return false;
        } else if (materialFiltro === "No Depósito") {
          const temNoDeposito = mats.some((m) => m.statusLogistico === "Disponivel");
          if (!temNoDeposito && mats.length > 0) return false;
          if (mats.length === 0 && obra.status !== "NoDeposito") return false;
        } else if (materialFiltro === "Separado") {
          const separado =
            obra.status === "Separado" ||
            (obra.status !== "MaterialComprado" &&
              obra.status !== "NoDeposito" &&
              mats.some(
                (m) =>
                  m.statusLogistico === "Disponivel" ||
                  m.statusLogistico === "Utilizado"
              ));
          if (!separado) return false;
        }
      }

      // 4. Arquivamento Temporal de Obras Concluídas (> 30 dias)
      if (obra.status === "Concluido" && !busca.trim() && !exibirArquivadas) {
        if (isObraConcluidaArquivada(obra.dataFimReal || obra.dataFimEstimada)) {
          return false;
        }
      }

      return true;
    });

    return list.sort((a, b) => {
      const timeA = a.dataFimEstimada ? new Date(a.dataFimEstimada).getTime() : Infinity;
      const timeB = b.dataFimEstimada ? new Date(b.dataFimEstimada).getTime() : Infinity;
      return timeA - timeB;
    });
  }, [obras, busca, categoriaFiltro, materialFiltro, mapaMateriais, exibirArquivadas]);

  // Estado local reativo de itens por coluna
  const [itensColunas, setItensColunas] = useState<Record<StatusObra, ObraCard[]>>(() => {
    const mapa: Record<StatusObra, ObraCard[]> = {
      MaterialComprado: [],
      NoDeposito: [],
      Separado: [],
      EmAndamento: [],
      Concluido: [],
      Assistencia: [],
    };
    for (const item of obrasFiltradas) {
      if (mapa[item.status]) {
        mapa[item.status].push(item);
      }
    }
    return mapa;
  });

  // Função centralizada para restaurar itensColunas para o snapshot oficial
  const restaurarEstadoOficial = useCallback(() => {
    const mapa: Record<StatusObra, ObraCard[]> = {
      MaterialComprado: [],
      NoDeposito: [],
      Separado: [],
      EmAndamento: [],
      Concluido: [],
      Assistencia: [],
    };
    for (const item of obrasFiltradas) {
      if (mapa[item.status]) {
        mapa[item.status].push(item);
      }
    }
    setItensColunas(mapa);
  }, [obrasFiltradas]);

  // Flag anti-flicker: impede que activeCard === null reverta itensColunas antes do cache otimista resolver
  const isDroppingRef = useRef(false);

  // Sincroniza estado com obras filtradas quando não houver arraste em andamento
  useEffect(() => {
    if (activeCard || isDroppingRef.current) return;

    setItensColunas((prev) => {
      const mudou = STATUS_TODOS.some((status) => {
        const novosCards = obrasFiltradas.filter((o) => o.status === status);
        const cardsAtuais = prev[status] || [];
        if (novosCards.length !== cardsAtuais.length) return true;
        return novosCards.some((c, i) => {
          const atual = cardsAtuais[i];
          if (!atual || c.id !== atual.id) return true;
          return (
            c !== atual ||
            c.clienteNome !== atual.clienteNome ||
            c.valorTotal !== atual.valorTotal ||
            c.potenciaKwp !== atual.potenciaKwp ||
            c.quantidadePaineis !== atual.quantidadePaineis ||
            c.categoria !== atual.categoria ||
            c.dataFimEstimada !== atual.dataFimEstimada ||
            c.endereco !== atual.endereco ||
            c.observacoes !== atual.observacoes
          );
        });
      });

      if (!mudou) return prev;

      const mapa: Record<StatusObra, ObraCard[]> = {
        MaterialComprado: [],
        NoDeposito: [],
        Separado: [],
        EmAndamento: [],
        Concluido: [],
        Assistencia: [],
      };
      for (const item of obrasFiltradas) {
        if (mapa[item.status]) {
          mapa[item.status].push(item);
        }
      }
      return mapa;
    });
  }, [obrasFiltradas, activeCard]);

  // Localizador de container por id de coluna ou id de card
  const findContainer = useCallback(
    (id: string | number): StatusObra | null => {
      const strId = String(id);
      if (STATUS_TODOS.includes(strId as StatusObra)) {
        return strId as StatusObra;
      }
      for (const status of STATUS_TODOS) {
        if (itensColunas[status]?.some((c) => String(c.id) === strId)) {
          return status;
        }
      }
      return null;
    },
    [itensColunas]
  );

  const handleDragStart = (event: DragStartEvent) => {
    const cardId = Number(event.active.id);
    const card = obras.find((o) => o.id === cardId);
    if (card) {
      setActiveCard(card);
      setInitialContainer(card.status);
    }
  };

  const handleDragCancel = () => {
    setActiveCard(null);
    setInitialContainer(null);
    isDroppingRef.current = false;
    restaurarEstadoOficial();
  };

  // Execução da movimentação de status na API e no estado otimista
  const executarMudancaStatus = useCallback(
    (card: ObraCard, novoStatus: StatusObra) => {
      setItensColunas((prev) => {
        const next = { ...prev };
        for (const status of Object.keys(next) as StatusObra[]) {
          next[status] = (next[status] || []).filter((c) => String(c.id) !== String(card.id));
        }
        next[novoStatus] = [...(next[novoStatus] || []), { ...card, status: novoStatus }];
        return next;
      });

      isDroppingRef.current = true;
      moverCardMutation.mutate(
        {
          cardId: card.id,
          novoStatus,
        },
        {
          onError: () => {
            restaurarEstadoOficial();
          },
          onSettled: () => {
            isDroppingRef.current = false;
          },
        }
      );
    },
    [moverCardMutation, restaurarEstadoOficial]
  );

  // Mover card acionado via menu acessível "Mover para..." (UX-09)
  const handleMoverCard = useCallback(
    (card: ObraCard, novoStatus: StatusObra) => {
      if (novoStatus === "Concluido") {
        setObraParaConcluir(card);
        return;
      }
      executarMudancaStatus(card, novoStatus);
    },
    [executarMudancaStatus]
  );

  // Confirmação no diálogo de conclusão (RF-13 / UX-11)
  const handleConfirmarConclusao = useCallback(() => {
    if (!obraParaConcluir) return;
    const card = obraParaConcluir;
    setObraParaConcluir(null);
    executarMudancaStatus(card, "Concluido");
  }, [obraParaConcluir, executarMudancaStatus]);

  const handleCancelarConclusao = useCallback(() => {
    setObraParaConcluir(null);
    restaurarEstadoOficial();
  }, [restaurarEstadoOficial]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { over } = event;
    const card = activeCard;
    const containerOrigem = initialContainer;

    setActiveCard(null);
    setInitialContainer(null);

    if (!over || !card || !containerOrigem) {
      restaurarEstadoOficial();
      return;
    }

    const overContainer = findContainer(over.id);
    if (!overContainer || overContainer === containerOrigem) {
      restaurarEstadoOficial();
      return;
    }

    if (overContainer !== containerOrigem) {
      const transicoesPermitidas = TRANSICOES_VALIDAS[containerOrigem] || [];
      const transicaoValida = transicoesPermitidas.includes(overContainer);

      const getStatusLabel = (status: StatusObra) =>
        COLUNAS_KANBAN.find((c) => c.id === status)?.label || status;

      // Validação estrita sem bypass de Administrador (CT-03)
      if (!transicaoValida) {
        toast.warning(
          `Transição não permitida: de "${getStatusLabel(containerOrigem)}" para "${getStatusLabel(overContainer)}".`
        );
        restaurarEstadoOficial();
        return;
      }

      // Interceptação mandatória ao mover para Concluído (RF-13 / UX-11)
      if (overContainer === "Concluido") {
        setObraParaConcluir(card);
        return;
      }

      executarMudancaStatus(card, overContainer);
    }
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div className="w-full space-y-4">
        {/* Seletor de Colunas para Telas Mobile (RNF-01 / UX-09) */}
        <div className="flex md:hidden items-center gap-1.5 overflow-x-auto pb-2 mb-2 custom-scrollbar">
          {COLUNAS_KANBAN.map((col) => (
            <button
              key={col.id}
              type="button"
              onClick={() => setColunaMobileAtiva(col.id)}
              className={cn(
                "px-2.5 py-1 text-xs font-semibold rounded-lg shrink-0 transition-colors cursor-pointer",
                colunaMobileAtiva === col.id
                  ? "bg-info text-primary-foreground font-bold shadow-xs"
                  : "bg-muted text-foreground-muted hover:bg-border-subtle"
              )}
            >
              {col.label}
            </button>
          ))}
        </div>

        {/* As 6 Colunas Operacionais Verticais com Grid Responsivo */}
        <div className="overflow-x-auto pb-4 custom-scrollbar">
          <div className="grid grid-cols-1 md:grid-cols-6 gap-3 min-w-0 md:min-w-[1536px] items-start">
            {COLUNAS_KANBAN.map((col) => {
              const cardsDaColuna = itensColunas[col.id] || [];
              const isDestinoValido = activeCard ? destinosValidos.includes(col.id) : false;
              const isDestinoInvalido = Boolean(
                activeCard && !destinosValidos.includes(col.id) && col.id !== activeCard.status
              );

              return (
                <KanbanColumn
                  key={col.id}
                  id={col.id}
                  title={col.label}
                  badge={col.badge}
                  cards={cardsDaColuna}
                  onSelectCard={handleSelectCard}
                  onMoverCard={handleMoverCard}
                  isDestinoValido={isDestinoValido}
                  isDestinoInvalido={isDestinoInvalido}
                  mapaMateriais={mapaMateriais}
                  isVisivelMobile={colunaMobileAtiva === col.id}
                  headerAction={
                    col.id === "Concluido" && totalArquivadasConcluidas > 0 && !busca.trim() ? (
                      <button
                        type="button"
                        onClick={() => setExibirArquivadas((prev) => !prev)}
                        className="text-[10px] font-semibold text-success bg-success-light hover:bg-success-border/40 px-1.5 py-0.5 rounded-full border border-success-border transition-colors cursor-pointer"
                        title="Alternar exibição de obras concluídas há mais de 30 dias"
                      >
                        {exibirArquivadas ? "Ocultar arquivadas" : `+${totalArquivadasConcluidas} arquivadas`}
                      </button>
                    ) : undefined
                  }
                />
              );
            })}
          </div>
        </div>
      </div>

      <DragOverlay dropAnimation={null}>
        {activeCard ? <KanbanCardOverlay card={activeCard} /> : null}
      </DragOverlay>

      <KanbanTaskDrawer
        card={drawerCard}
        isOpen={Boolean(drawerCard)}
        onClose={() => setDrawerCard(null)}
      />

      <ModalConfirmarConclusao
        obra={obraParaConcluir}
        isOpen={Boolean(obraParaConcluir)}
        onClose={handleCancelarConclusao}
        onConfirmar={handleConfirmarConclusao}
        isLoading={moverCardMutation.isPending}
      />
    </DndContext>
  );
}
