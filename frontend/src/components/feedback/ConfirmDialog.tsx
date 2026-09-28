import { useEffect, useRef } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

export interface ConfirmDialogProps {
  /** Controla visibilidade do dialog */
  aberto: boolean;
  /** Título principal */
  titulo: string;
  /** Descrição opcional abaixo do título */
  descricao?: string;
  /** Texto do botão de confirmação (default: "Confirmar") */
  labelConfirmar?: string;
  /** Estilo do botão de confirmação */
  variant?: "danger" | "default";
  /** Callback ao confirmar */
  onConfirmar: () => void;
  /** Callback ao cancelar ou fechar */
  onCancelar: () => void;
}

/**
 * Modal de confirmação reutilizável.
 * Uso: "Tem certeza que deseja mover para Concluído?", "Excluir obra?", etc.
 */
export function ConfirmDialog({
  aberto,
  titulo,
  descricao,
  labelConfirmar = "Confirmar",
  variant = "default",
  onConfirmar,
  onCancelar,
}: ConfirmDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const el = dialogRef.current;
    if (!el) return;
    if (aberto && !el.open) el.showModal();
    if (!aberto && el.open) el.close();
  }, [aberto]);

  return (
    <dialog
      ref={dialogRef}
      onClose={onCancelar}
      className="fixed inset-0 z-50 flex items-center justify-center bg-transparent backdrop:bg-slate-900/50 backdrop:backdrop-blur-xs p-0 m-auto rounded-xl border-0"
    >
      <div className="bg-white rounded-xl shadow-2xl p-6 max-w-md w-full mx-4">
        {variant === "danger" && (
          <div className="w-12 h-12 rounded-full bg-red-50 text-red-500 flex items-center justify-center mb-4 mx-auto">
            <AlertTriangle className="w-6 h-6" />
          </div>
        )}

        <h3 className="text-lg font-bold text-slate-800 text-center mb-1">{titulo}</h3>
        {descricao && (
          <p className="text-sm text-slate-500 text-center mb-6">{descricao}</p>
        )}

        <div className="flex gap-3 justify-end mt-6">
          <Button variant="outline" onClick={onCancelar}>
            Cancelar
          </Button>
          <Button
            variant={variant === "danger" ? "danger" : "primary"}
            onClick={onConfirmar}
            className={cn(
              variant === "danger" && "bg-red-600 hover:bg-red-700 text-white"
            )}
          >
            {labelConfirmar}
          </Button>
        </div>
      </div>
    </dialog>
  );
}

export default ConfirmDialog;
