import type { ReactNode } from "react";

/**
 * Contrato neutro de Inversão de Controle para renderização de ações de obra em drawers.
 * Permite que componentes de apresentação (Kanban, Gantt) recebam ações de domínio (Obras)
 * sem acoplamento direto ou violação do DAG Feature-Driven.
 */
export type RenderizarAcoesObra = (obraId: number) => ReactNode;
