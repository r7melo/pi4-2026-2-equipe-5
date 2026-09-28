import { useMemo, useCallback } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  rectIntersection,
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import { Loader2, AlertCircle, RefreshCw } from "lucide-react";
import { useObras } from "@/hooks/api/useObras";
import { useMoverCard } from "@/hooks/api/useMoverCard";
import { useKanbanStore } from "@/stores/useKanbanStore";
import { COLUNAS_KANBAN, RAIA_ASSISTENCIA, type StatusObra } from "@/constants/kanbanStatus";
import type { ObraCard } from "@/types";
import KanbanColumn from "./KanbanColumn";
import KanbanCardOverlay from "./KanbanCardOverlay";
import { Button } from "@/components/ui/Button";

const STATUS_VALIDOS: StatusObra[] = [
  ...COLUNAS_KANBAN.map((c) => c.id),
  RAIA_ASSISTENCIA.id,
];

export default function KanbanBoard() {
  const { data, isLoading, isError, error, refetch } = useObras();
  const moverCardMutation = useMoverCard();
  const { activeCardId, setActiveCard } = useKanbanStore();

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    })
  );

  // Agrupa as obras em suas respectivas colunas
  const colunas = useMemo(() => {
    const cols: Record<StatusObra, ObraCard[]> = {
      MaterialComprado: [],
      NoDeposito: [],
      Separado: [],
      EmAndamento: [],
      Concluido: [],
      Assistencia: [],
    };

    if (data?.itens) {
      for (const obra of data.itens) {
        const status = obra.status;
        if (cols[status]) {
          cols[status].push(obra);
        }
      }
    }

    return cols;
  }, [data]);

  // Busca a coluna onde um card específico está posicionado
  const findColumn = useCallback(
    (cardId: string): StatusObra | null => {
      for (const status of STATUS_VALIDOS) {
        const items = colunas[status] || [];
        if (items.some((obra) => String(obra.id) === cardId)) {
          return status;
        }
      }
      return null;
    },
    [colunas]
  );

  const handleDragStart = (event: DragStartEvent) => {
    const id = String(event.active.id);
    setActiveCard(id);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveCard(null);

    if (!over) return;

    const activeId = String(active.id);
    const overId = String(over.id);

    const activeCol = findColumn(activeId);
    let overCol = findColumn(overId);

    // Se o droppable for a própria coluna (arraste para área vazia)
    if (!overCol && STATUS_VALIDOS.includes(overId as StatusObra)) {
      overCol = overId as StatusObra;
    }

    // Se mudou de coluna, dispara mutação otimista via React Query
    if (activeCol && overCol && activeCol !== overCol) {
      moverCardMutation.mutate({
        cardId: activeId,
        novoStatus: overCol,
      });
    }
  };

  const activeCard = useMemo(() => {
    if (!activeCardId || !data?.itens) return null;
    return data.itens.find((obra) => String(obra.id) === activeCardId) || null;
  }, [activeCardId, data]);

  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-12 text-slate-500 gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-slate-700" />
        <p className="text-sm font-medium">Carregando funil de obras...</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
        <div className="w-12 h-12 rounded-full bg-red-50 text-red-600 flex items-center justify-center mb-4">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h3 className="text-base font-bold text-slate-800 mb-1">Não foi possível carregar as obras</h3>
        <p className="text-sm text-slate-500 max-w-md mb-6">
          {error instanceof Error ? error.message : "Erro de conexão com o servidor."}
        </p>
        <Button variant="outline" onClick={() => void refetch()}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Tentar novamente
        </Button>
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={rectIntersection}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-4 flex-1 min-h-[400px]">
        {COLUNAS_KANBAN.map((col) => (
          <KanbanColumn
            key={col.id}
            columnId={col.id}
            label={col.label}
            cards={colunas[col.id] || []}
          />
        ))}
      </div>

      <KanbanColumn
        columnId={RAIA_ASSISTENCIA.id}
        label={RAIA_ASSISTENCIA.label}
        cards={colunas[RAIA_ASSISTENCIA.id] || []}
        horizontal
      />

      <DragOverlay dropAnimation={null}>
        {activeCard ? <KanbanCardOverlay card={activeCard} /> : null}
      </DragOverlay>
    </DndContext>
  );
}
