import { CheckCircle2, AlertTriangle } from "lucide-react";
import { Modal } from "@/shared/components/ui/Modal";
import { AlertBanner } from "@/shared/components/ui/AlertBanner";
import { Button } from "@/shared/components/ui/Button";
import type { ObraKanbanCard } from "../types/kanban";

interface ModalConfirmarConclusaoProps {
  obra: ObraKanbanCard | null;
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
      tamanho="sm"
      fecharBloqueado={isLoading}
    >
      <div className="p-5 space-y-4">
        <AlertBanner
          variante="success"
          icone={<CheckCircle2 className="w-5 h-5" />}
          titulo={<span className="text-xs">Finalização da Obra: {obra.clienteNome}</span>}
          className="rounded-xl"
        >
          Ao confirmar a conclusão, o status será marcado como <strong>Concluído</strong> e a notificação automática de encerramento da obra será enviada por e-mail aos envolvidos.
        </AlertBanner>

        <AlertBanner
          variante="warning"
          icone={<AlertTriangle className="w-4 h-4" />}
          className="bg-warning-light/70"
        >
          Certifique-se de que todas as etapas técnicas de instalação foram devidamente finalizadas.
        </AlertBanner>
      </div>

      <div className="flex items-center justify-end gap-2 px-5 py-3.5 border-t border-border-subtle bg-surface-subtle">
        <Button
          variant="outline"
          size="sm"
          onClick={onClose}
          disabled={isLoading}
          data-autofocus
          className="h-10 px-4"
        >
          Cancelar
        </Button>
        <Button
          variant="primary"
          size="sm"
          onClick={onConfirmar}
          disabled={isLoading}
          className="h-10 px-4 bg-success hover:bg-success-hover text-primary-foreground"
        >
          {isLoading ? "Concluindo..." : "Confirmar Conclusão"}
        </Button>
      </div>
    </Modal>
  );
}
