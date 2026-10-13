import type { ObraCard } from "@/types";
import { KanbanCardVisual } from "./KanbanCardVisual";

interface KanbanCardOverlayProps {
  card: ObraCard;
}

export default function KanbanCardOverlay({ card }: KanbanCardOverlayProps) {
  return (
    <div className="w-[272px] bg-white border-2 border-blue-500 rounded-lg p-2.5 shadow-2xl rotate-2 select-none pointer-events-none opacity-95">
      <KanbanCardVisual card={card} />
    </div>
  );
}
