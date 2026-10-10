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
import {
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
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
import { useAuthStore } from "@/stores/useAuthStore";
import { useMoverCard } from "@/hooks/api/useMoverCard";
import { useMateriaisObras } from "@/hooks/api/useMateriaisObras";
import { isObraConcluidaArquivada } from "./kanbanUtils";

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

  const handleSelectCard = useCallback((card: ObraCard) => {
    setDrawerCard(card);
  }, []);

  const perfil = useAuthStore((s) => s.usuario?.perfil?.nomePerfil);
  const isAdmin = perfil === "Administrador";

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

  const [exibirArquivadas, setExibirArquivadas] = useState(false);

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
      // 1. Busca textual global (pesquisa em ativas e arquivadas)
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

  // Estado local reativo de itens por coluna para permitir preview dinâmico no onDragOver
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

  // Flag anti-flicker: impede que activeCard === null reverta itensColunas antes do cache otimista resolver
  const isDroppingRef = useRef(false);

  // Sincroniza estado com obras filtradas quando não houver arraste em andamento
  useEffect(() => {
    if (activeCard || isDroppingRef.current) return;

    setItensColunas((prev) => {
      // Bailout: verifica se houve alteração real nos cards de cada coluna
      const mudou = STATUS_TODOS.some((status) => {
        const novosCards = obrasFiltradas.filter((o) => o.status === status);
        const cardsAtuais = prev[status] || [];
        if (novosCards.length !== cardsAtuais.length) return true;
        return novosCards.some((c, i) => c.id !== cardsAtuais[i]?.id);
      });

      // Se a composição for idêntica, retorna prev para abortar re-renders (evita loop infinito)
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

    // Restaura para o estado oficial
    const mapa: Record<StatusObra, ObraCard[]> = {
      MaterialComprado: [],
      NoDeposito: [],
      Separado: [],
      EmAndamento: [],
      Concluido: [],
      Assistencia: [],
    };
    for (const item of obrasFiltradas) {
      if (mapa[item.status]) mapa[item.status].push(item);
    }
    setItensColunas(mapa);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { over } = event;
    const card = activeCard;
    const containerOrigem = initialContainer;

    console.log("[DRAG_END] active.id:", event.active.id, "over.id:", over?.id);

    setActiveCard(null);
    setInitialContainer(null);

    if (!over || !card || !containerOrigem) {
      // Reverte para o estado oficial
      const mapa: Record<StatusObra, ObraCard[]> = {
        MaterialComprado: [],
        NoDeposito: [],
        Separado: [],
        EmAndamento: [],
        Concluido: [],
        Assistencia: [],
      };
      for (const item of obrasFiltradas) {
        if (mapa[item.status]) mapa[item.status].push(item);
      }
      setItensColunas(mapa);
      return;
    }

    const overContainer = findContainer(over.id);
    if (!overContainer || overContainer === containerOrigem) {
      // Solto na mesma coluna ou fora: garante limpeza de qualquer deslocamento temporário
      const mapa: Record<StatusObra, ObraCard[]> = {
        MaterialComprado: [],
        NoDeposito: [],
        Separado: [],
        EmAndamento: [],
        Concluido: [],
        Assistencia: [],
      };
      for (const item of obrasFiltradas) {
        if (mapa[item.status]) mapa[item.status].push(item);
      }
      setItensColunas(mapa);
      return;
    }

    console.log("[DRAG_END] overContainer resolvido:", overContainer, "origem:", containerOrigem);

    if (overContainer !== containerOrigem) {
      const transicoesPermitidas = TRANSICOES_VALIDAS[containerOrigem] || [];
      const transicaoValida = transicoesPermitidas.includes(overContainer);

      const getStatusLabel = (status: StatusObra) =>
        COLUNAS_KANBAN.find((c) => c.id === status)?.label || status;

      if (!transicaoValida && !isAdmin) {
        toast.warning(
          `Transição não permitida: de "${getStatusLabel(containerOrigem)}" para "${getStatusLabel(overContainer)}".`
        );
        // Reverte para o estado oficial
        const mapa: Record<StatusObra, ObraCard[]> = {
          MaterialComprado: [],
          NoDeposito: [],
          Separado: [],
          EmAndamento: [],
          Concluido: [],
          Assistencia: [],
        };
        for (const item of obrasFiltradas) {
          if (mapa[item.status]) mapa[item.status].push(item);
        }
        setItensColunas(mapa);
        return;
      }

      // SINCRONIZAÇÃO OTIMISTA IMEDIATA DO ESTADO LOCAL:
      setItensColunas((prev) => {
        const overItems = prev[overContainer] || [];

        // 1. Se o card já foi posicionado no destino pelo dragOver (colunas verticais normais),
        // preserva o índice exato onde o usuário o posicionou
        const jaEstaNoDestino = overItems.some((c) => String(c.id) === String(card.id));
        if (jaEstaNoDestino) return prev;

        // 2. Purga Atômica: Remove o card de qualquer coluna intermediária onde o dragOver o deixou
        // e insere estritamente no container de destino (ex: Raia de Assistência Técnica)
        const next = { ...prev };
        let cardEncontrado: ObraCard | null = null;

        for (const status of Object.keys(next) as StatusObra[]) {
          const itemsDaColuna = next[status] || [];
          const index = itemsDaColuna.findIndex((c) => String(c.id) === String(card.id));
          if (index !== -1) {
            if (!cardEncontrado) cardEncontrado = itemsDaColuna[index];
            next[status] = itemsDaColuna.filter((_, idx) => idx !== index);
          }
        }

        const cardParaInserir = { ...(cardEncontrado || card), status: overContainer };
        next[overContainer] = [...(next[overContainer] || []), cardParaInserir];

        return next;
      });

      isDroppingRef.current = true;
      moverCardMutation.mutate(
        {
          cardId: card.id,
          novoStatus: overContainer,
        },
        {
          onError: () => {
            // Em caso de erro na API, restaura itensColunas para o snapshot oficial
            const mapa: Record<StatusObra, ObraCard[]> = {
              MaterialComprado: [],
              NoDeposito: [],
              Separado: [],
              EmAndamento: [],
              Concluido: [],
              Assistencia: [],
            };
            for (const item of obrasFiltradas) {
              if (mapa[item.status]) mapa[item.status].push(item);
            }
            setItensColunas(mapa);
          },
          onSettled: () => {
            isDroppingRef.current = false;
          },
        }
      );
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
      <div className="w-full space-y-6">
        {/* As 6 Colunas Operacionais Verticais com Layout Infinito */}
        <div className="overflow-x-auto pb-4 custom-scrollbar">
          <div className="grid grid-cols-6 gap-3 min-w-[1536px] items-start">
            {COLUNAS_KANBAN.map((col) => {
              const cardsDaColuna = itensColunas[col.id] || [];
              return (
                <KanbanColumn
                  key={col.id}
                  id={col.id}
                  title={col.label}
                  cards={cardsDaColuna}
                  onSelectCard={handleSelectCard}
                  headerAction={
                    col.id === "Concluido" && totalArquivadasConcluidas > 0 && !busca.trim() ? (
                      <button
                        type="button"
                        onClick={() => setExibirArquivadas((prev) => !prev)}
                        className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-1.5 py-0.5 rounded-full border border-emerald-200 transition-colors cursor-pointer"
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
    </DndContext>
  );
}
