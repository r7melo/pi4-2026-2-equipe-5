import { Inbox } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/Button";

export interface EmptyStateProps {
  /** Ícone exibido no centro (default: Inbox) */
  icone?: LucideIcon;
  /** Título principal */
  titulo: string;
  /** Descrição auxiliar */
  descricao?: string;
  /** Botão de ação opcional */
  acao?: {
    label: string;
    onClick: () => void;
  };
}

/**
 * Componente de estado vazio reutilizável.
 * Uso: Listas sem dados, filtros sem resultado, etc.
 */
export function EmptyState({
  icone: Icon = Inbox,
  titulo,
  descricao,
  acao,
}: EmptyStateProps) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
      <div className="w-14 h-14 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mb-4">
        <Icon className="w-7 h-7" />
      </div>
      <h3 className="text-base font-bold text-slate-700 mb-1">{titulo}</h3>
      {descricao && (
        <p className="text-sm text-slate-500 max-w-md mb-6">{descricao}</p>
      )}
      {acao && (
        <Button variant="outline" onClick={acao.onClick}>
          {acao.label}
        </Button>
      )}
    </div>
  );
}

export default EmptyState;
