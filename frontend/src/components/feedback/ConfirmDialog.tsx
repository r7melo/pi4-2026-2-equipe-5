import { AlertTriangle, AlertCircle, Info } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { cn } from "@/lib/utils";

export interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  titulo: string;
  descricao?: string;
  labelConfirmar?: string;
  labelCancelar?: string;
  variant?: "danger" | "warning" | "info";
  isLoading?: boolean;
}

export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  titulo,
  descricao,
  labelConfirmar = "Confirmar",
  labelCancelar = "Cancelar",
  variant = "danger",
  isLoading = false,
}: ConfirmDialogProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      zIndex="z-[70]"
      fecharBloqueado={isLoading}
      className="max-w-md p-6"
    >
      <div className="flex flex-col items-center text-center">
        {variant === "danger" && (
          <div className="w-12 h-12 rounded-full bg-destructive-light text-destructive flex items-center justify-center mb-4">
            <AlertTriangle className="w-6 h-6" />
          </div>
        )}
        {variant === "warning" && (
          <div className="w-12 h-12 rounded-full bg-warning-light text-warning flex items-center justify-center mb-4">
            <AlertCircle className="w-6 h-6" />
          </div>
        )}
        {variant === "info" && (
          <div className="w-12 h-12 rounded-full bg-info-light text-info flex items-center justify-center mb-4">
            <Info className="w-6 h-6" />
          </div>
        )}

        <h3 className="text-lg font-bold text-foreground-secondary mb-1">{titulo}</h3>
        {descricao && (
          <p className="text-sm text-muted-foreground mb-6">{descricao}</p>
        )}

        <div className="flex gap-3 justify-end w-full mt-2">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isLoading}
            className="flex-1"
          >
            {labelCancelar}
          </Button>
          <Button
            variant="primary"
            onClick={onConfirm}
            disabled={isLoading}
            className={cn(
              "flex-1",
              variant === "danger" && "bg-destructive hover:bg-destructive-hover text-primary-foreground"
            )}
          >
            {isLoading ? "Processando..." : labelConfirmar}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

export default ConfirmDialog;
