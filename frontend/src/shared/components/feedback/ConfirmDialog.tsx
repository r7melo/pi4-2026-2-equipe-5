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

  const iconeVariant =
    variant === "danger" ? (
      <div className="w-10 h-10 bg-destructive-light text-destructive rounded-xl flex items-center justify-center shrink-0">
        <AlertTriangle className="w-5 h-5" aria-hidden="true" />
      </div>
    ) : variant === "warning" ? (
      <div className="w-10 h-10 bg-warning-light text-warning rounded-xl flex items-center justify-center shrink-0">
        <AlertCircle className="w-5 h-5" aria-hidden="true" />
      </div>
    ) : (
      <div className="w-10 h-10 bg-info-light text-info rounded-xl flex items-center justify-center shrink-0">
        <Info className="w-5 h-5" aria-hidden="true" />
      </div>
    );

  return (
    <Modal
      isOpen={isOpen}
      focoRetorno={() => origemFoco?.current ?? null}
      podeRestaurarFoco={podeRestaurarFoco}
      onClose={onClose}
      fecharBloqueado={isLoading}
      titulo={titulo}
      icone={iconeVariant}
      ariaLabelledBy={tituloId}
      tamanho="sm"
    >
      <div className="px-5 py-4 space-y-3">
        {descricao && (
          <p className="text-sm text-muted-foreground leading-relaxed [overflow-wrap:anywhere]">
            {descricao}
          </p>
        )}
        {conteudo}
      </div>

      <div className="flex items-center justify-end gap-2 px-5 py-3.5 border-t border-border-subtle bg-surface-subtle">
        <Button
          data-autofocus
          variant="outline"
          size="sm"
          onClick={onClose}
          disabled={isLoading}
          className="h-10 px-4"
        >
          {labelCancelar}
        </Button>
        <Button
          variant="primary"
          size="sm"
          onClick={onConfirm}
          disabled={isLoading || confirmarBloqueado}
          className={cn(
            "h-10 px-4",
            variant === "danger" &&
              "bg-destructive hover:bg-destructive-hover text-primary-foreground"
          )}
        >
          {isLoading ? "Processando..." : labelConfirmar}
        </Button>
      </div>
    </Modal>
  );
}

export default ConfirmDialog;
