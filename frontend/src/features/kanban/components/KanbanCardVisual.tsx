import { Sun, Calendar, User } from "lucide-react";
import type { ObraCard } from "@/types";
import { cn } from "@/shared/lib/utils";
import {
  getCategoriaBadgeStyle,
  getIniciaisNome,
  calcularDiasRestantes,
  obterValorObra,
} from "./kanbanUtils";
import { formatarMoeda } from "@/shared/lib/formatters";

export interface KanbanCardVisualProps {
  card: ObraCard;
  statusMaterial?: string;
  acaoDireita?: React.ReactNode;
}

export function KanbanCardVisual({ card, statusMaterial, acaoDireita }: KanbanCardVisualProps) {
  const valorFormatado = formatarMoeda(obterValorObra(card), { semCentavos: true });
  const prazoRestante = calcularDiasRestantes(card.dataFimEstimada, card.status);
  const iniciaisAutor = getIniciaisNome(card.atualizadoPor || "Carlos Administrador");

  const getStatusMaterialBadgeStyle = (status?: string) => {
    switch (status) {
      case "Comprado":
        return "bg-warning-light text-warning border-warning-border";
      case "EmTransito":
        return "bg-info-light text-info border-info-border";
      case "Disponivel":
        return "bg-success-light text-success border-success-border";
      case "Utilizado":
        return "bg-muted text-foreground-muted border-border-subtle";
      default:
        return "bg-surface-subtle text-muted-foreground border-border-subtle";
    }
  };

  return (
    <>
      <div className="flex items-center justify-between gap-1 mb-1">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span
            className={cn(
              "inline-block px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded-md border",
              getCategoriaBadgeStyle(card.categoria)
            )}
          >
            {card.categoria}
          </span>
          {statusMaterial && (
            <span
              className={cn(
                "inline-block px-1.5 py-0.5 text-[9px] font-semibold rounded-md border",
                getStatusMaterialBadgeStyle(statusMaterial)
              )}
            >
              {statusMaterial === "EmTransito" ? "Em trânsito" : statusMaterial}
            </span>
          )}
        </div>
        {acaoDireita}
      </div>

      <h4
        className="text-xs font-semibold text-foreground-secondary line-clamp-1 mb-1"
        title={card.clienteNome}
      >
        {card.clienteNome}
      </h4>

      <div className="flex items-center justify-between mb-1.5">
        <span className="font-bold text-foreground-muted text-[11px]">
          {valorFormatado}
        </span>
        <span
          className="text-[10px] text-muted-foreground font-medium flex items-center gap-1"
          title={`${card.quantidadePaineis} painéis`}
        >
          <Sun className="w-3 h-3 text-subtle-foreground shrink-0" />
          {`${card.quantidadePaineis} painéis`}
        </span>
      </div>

      <div className="flex items-center justify-between text-[10px] pt-1 border-t border-border-subtle text-muted-foreground">
        <div className="flex items-center gap-1 font-medium">
          <Calendar className="w-3 h-3 text-subtle-foreground shrink-0" />
          <span>{card.prazoContratualDias || 30}d •</span>
          <span
            className={cn(
              "font-semibold",
              prazoRestante.concluido
                ? "text-muted-foreground"
                : prazoRestante.urgente
                ? "text-destructive"
                : "text-muted-foreground"
            )}
          >
            {prazoRestante.texto}
          </span>
        </div>

        <div
          title={`Última alteração por: ${card.atualizadoPor || "Carlos Administrador"}`}
          className="flex items-center gap-1 font-medium"
        >
          <User className="w-3 h-3 text-subtle-foreground shrink-0" />
          <span>{iniciaisAutor}</span>
        </div>
      </div>
    </>
  );
}

export default KanbanCardVisual;
