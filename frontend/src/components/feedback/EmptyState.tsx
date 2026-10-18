import { Inbox } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

export interface EmptyStateProps {
  icone?: LucideIcon;
  titulo: string;
  descricao?: string;
  acao?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export function EmptyState({
  icone: Icon = Inbox,
  titulo,
  descricao,
  acao,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex-1 flex flex-col items-center justify-center p-12 text-center",
        className
      )}
    >
      <div className="w-14 h-14 rounded-full bg-muted text-subtle-foreground flex items-center justify-center mb-4 shrink-0">
        <Icon className="w-7 h-7" />
      </div>
      <h3 className="text-base font-bold text-foreground-muted mb-1">{titulo}</h3>
      {descricao && (
        <p className="text-sm text-muted-foreground max-w-md mb-6">{descricao}</p>
      )}
      {acao && (
        <Button variant="outline" size="sm" onClick={acao.onClick}>
          {acao.label}
        </Button>
      )}
    </div>
  );
}

export default EmptyState;
