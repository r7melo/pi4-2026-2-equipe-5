import { CheckCircle2, AlertTriangle } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import type { ObraCard } from "@/types";

interface ModalConfirmarConclusaoProps {
  obra: ObraCard | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirmar: () => void;
  isLoading?: boolean;
}

export default function ModalConfirmarConclusao({
  obra,
  isOpen,
  onClose,
  onConfirmar,
  isLoading,
}: ModalConfirmarConclusaoProps) {
  if (!obra) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      titulo="Concluir Obra"
      className="max-w-md"
      fecharBloqueado={isLoading}
    >
      <div className="p-5 space-y-4">
        <div className="flex items-start gap-3 p-3.5 bg-success-light border border-success-border rounded-xl">
          <CheckCircle2 className="w-5 h-5 text-success shrink-0 mt-0.5" />
          <div className="text-xs text-success leading-relaxed">
            <p className="font-semibold text-success mb-1">
              Finalização da Obra: #{obra.id} — {obra.clienteNome}
            </p>
            <p>
              Ao confirmar a conclusão, o status será marcado como <strong>Concluído</strong> e a notificação automática de encerramento da obra será enviada por e-mail aos envolvidos.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 p-3 bg-warning-light/70 border border-warning-border rounded-lg text-xs text-warning">
          <AlertTriangle className="w-4 h-4 text-warning shrink-0" />
          <span>Certifique-se de que todas as etapas técnicas de instalação foram devidamente finalizadas.</span>
        </div>

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-border-subtle">
          <Button
            variant="outline"
            size="sm"
            onClick={onClose}
            disabled={isLoading}
          >
            Cancelar
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={onConfirmar}
            disabled={isLoading}
            className="bg-success hover:bg-success-hover text-primary-foreground"
          >
            {isLoading ? "Concluindo..." : "Confirmar Conclusão"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
