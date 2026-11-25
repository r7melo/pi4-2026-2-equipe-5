import { useId, type ReactNode, type RefObject } from "react";
import { AlertTriangle, AlertCircle, Info } from "lucide-react";
import { Button } from "@/shared/components/ui/Button";
import { Modal } from "@/shared/components/ui/Modal";
import { cn } from "@/shared/lib/utils";

export interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  titulo: string;
  descricao?: string;
  conteudo?: ReactNode;
  labelConfirmar?: string;
  labelCancelar?: string;
  variant?: "danger" | "warning" | "info";
  isLoading?: boolean;
  confirmarBloqueado?: boolean;
  origemFoco?: RefObject<HTMLElement | null>;
  podeRestaurarFoco?: () => boolean;
}

export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  titulo,
  descricao,
  conteudo,
  labelConfirmar = "Confirmar",
  labelCancelar = "Cancelar",
  variant = "danger",
  isLoading = false,
  confirmarBloqueado = false,
  origemFoco,
  podeRestaurarFoco,
}: ConfirmDialogProps) {
  const tituloId = useId();

  return (
    <Modal
      isOpen={isOpen}
      focoRetorno={() => origemFoco?.current ?? null}
      podeRestaurarFoco={podeRestaurarFoco}
      onClose={onClose}
      fecharBloqueado={isLoading}
      ariaLabelledBy={tituloId}
      tamanho="sm"
      className="p-6"
    >
      <div className="flex flex-col items-center text-center">
        {variant === "danger" && (
          <div className="w-12 h-12 rounded-full bg-destructive-light text-destructive flex items-center justify-center mb-4">
            <AlertTriangle className="w-6 h-6" aria-hidden="true" />
          </div>
        )}
        {variant === "warning" && (
          <div className="w-12 h-12 rounded-full bg-warning-light text-warning flex items-center justify-center mb-4">
            <AlertCircle className="w-6 h-6" aria-hidden="true" />
          </div>
        )}
        {variant === "info" && (
          <div className="w-12 h-12 rounded-full bg-info-light text-info flex items-center justify-center mb-4">
            <Info className="w-6 h-6" aria-hidden="true" />
          </div>
        )}

        <h2 id={tituloId} className="text-lg font-bold text-foreground-secondary mb-1 [overflow-wrap:anywhere]">{titulo}</h2>
        {descricao && (
          <p className="w-full min-w-0 text-sm text-muted-foreground mb-3 [overflow-wrap:anywhere]">{descricao}</p>
        )}
        {conteudo}

        <div className="flex flex-wrap gap-2.5 sm:justify-end w-full mt-3">
          <Button
            data-autofocus
            variant="outline"
            onClick={onClose}
            disabled={isLoading}
            className="h-10 flex-1 sm:flex-initial"
          >
            {labelCancelar}
          </Button>
          <Button
            variant="primary"
            onClick={onConfirm}
            disabled={isLoading || confirmarBloqueado}
            className={cn(
              "h-10 flex-1 sm:flex-initial",
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
