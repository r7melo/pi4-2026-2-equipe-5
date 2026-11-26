import { Sun, Calendar } from "lucide-react";
import type { StatusLogistico } from "@/shared/types/materiais";
import { obterMetaStatusLogistico } from "@/shared/constants/statusLogistico";
import type { ObraKanbanCard } from "../types/kanban";
import { cn } from "@/shared/lib/utils";
import { getIniciaisNome, calcularDiasRestantes } from "./kanbanUtils";

function getCategoriaCardBadgeStyle(categoria: string): string {
  switch (categoria.toLowerCase()) {
    case "residencial":
      return "bg-muted text-foreground-muted";
    case "comercial":
      return "bg-accent-light text-accent";
    case "rural":
      return "bg-success-light text-success";
    case "manutenção":
    case "manutencao":
      return "bg-warning-light text-warning";
    default:
      return "bg-muted text-foreground-muted";
  }
}

export interface KanbanCardVisualProps {
  card: ObraKanbanCard;
  statusMaterial?: StatusLogistico;
  acaoDireita?: React.ReactNode;
}

export function KanbanCardVisual({ card, statusMaterial, acaoDireita }: KanbanCardVisualProps) {
  const prazoRestante = calcularDiasRestantes(card.dataFimEstimada, card.status);
  const iniciaisAutor = getIniciaisNome(card.atualizadoPor || "Carlos Administrador");
  const metaStatusMaterial = statusMaterial ? obterMetaStatusLogistico(statusMaterial) : null;

  return (
    <>
      <div className="flex items-center justify-between gap-1.5 mb-1.5">
        <div className="flex items-center gap-1 min-w-0 flex-nowrap">
          <span
            className={cn(
              "px-1.5 py-0.5 rounded text-xs font-medium whitespace-nowrap shrink-0",
              getCategoriaCardBadgeStyle(card.categoria)
            )}
          >
            {card.categoria}
          </span>
          {metaStatusMaterial && (
            <span
              className={cn(
                "px-1.5 py-0.5 rounded text-xs font-medium whitespace-nowrap truncate",
                metaStatusMaterial.badgeClasse
              )}
            >
              {metaStatusMaterial.rotulo}
            </span>
          )}
        </div>
        {acaoDireita}
      </div>

      <h4
        className="text-[13px] font-semibold text-foreground leading-tight truncate mb-1.5"
        title={card.clienteNome}
      >
        {card.clienteNome}
      </h4>

      <div className="flex items-center justify-between gap-1.5 pt-1.5 border-t border-border-subtle text-xs text-muted-foreground tabular-nums">
        <div className="flex items-center gap-2 min-w-0">
          <span
            className="inline-flex items-center gap-1 whitespace-nowrap"
            title={`${card.quantidadePaineis} painéis`}
          >
            <Sun className="w-3 h-3 text-subtle-foreground shrink-0" aria-hidden="true" />
            {card.quantidadePaineis}
          </span>
          <span
            className={cn(
              "inline-flex items-center gap-1 whitespace-nowrap",
              prazoRestante.concluido
                ? "text-muted-foreground"
                : prazoRestante.urgente
                ? "text-destructive font-semibold"
                : "text-muted-foreground"
            )}
            title={`Prazo: ${card.prazoContratualDias || 30}d`}
          >
            <Calendar className="w-3 h-3 text-subtle-foreground shrink-0" aria-hidden="true" />
            {prazoRestante.texto}
          </span>
        </div>

        <span
          title={`Última alteração por: ${card.atualizadoPor || "Carlos Administrador"}`}
          className="font-semibold text-foreground-muted shrink-0"
        >
          {iniciaisAutor}
        </span>
      </div>
    </>
  );
}

export default KanbanCardVisual;
