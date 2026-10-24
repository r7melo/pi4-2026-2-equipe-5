import { useRef, useEffect, useId, type ReactNode, type KeyboardEvent, type RefObject } from "react";
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
  gerenciarFoco?: boolean;
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
  gerenciarFoco = false,
  origemFoco,
  podeRestaurarFoco,
}: ConfirmDialogProps) {
  const tituloId = useId();
  const cancelarBtnRef = useRef<HTMLButtonElement>(null);
  const confirmarBtnRef = useRef<HTMLButtonElement>(null);
  const origemFocoRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (isOpen && gerenciarFoco) {
      origemFocoRef.current = origemFoco?.current || (document.activeElement as HTMLElement | null);
      cancelarBtnRef.current?.focus();
    }
    return () => {
      if (gerenciarFoco && origemFocoRef.current?.isConnected && podeRestaurarFoco?.() !== false) {
        origemFocoRef.current.focus();
      }
    };
  }, [isOpen, gerenciarFoco, podeRestaurarFoco, origemFoco]);

  const handleKeyDown = (e: KeyboardEvent) => {
    if (!gerenciarFoco || e.key !== "Tab") return;
    if (e.shiftKey) {
      if (document.activeElement === cancelarBtnRef.current) {
        e.preventDefault();
        confirmarBtnRef.current?.focus();
      }
    } else {
      if (document.activeElement === confirmarBtnRef.current) {
        e.preventDefault();
        cancelarBtnRef.current?.focus();
      }
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      zIndex="z-[70]"
      fecharBloqueado={isLoading}
      ariaLabelledBy={tituloId}
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

        <h3 id={tituloId} className="text-lg font-bold text-foreground-secondary mb-1">{titulo}</h3>
        {descricao && (
          <p className="text-sm text-muted-foreground mb-3">{descricao}</p>
        )}
        {conteudo}

        <div className="flex gap-3 justify-end w-full mt-2" onKeyDown={handleKeyDown}>
          <Button
            ref={cancelarBtnRef}
            variant="outline"
            onClick={onClose}
            disabled={isLoading}
            className="flex-1"
          >
            {labelCancelar}
          </Button>
          <Button
            ref={confirmarBtnRef}
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
