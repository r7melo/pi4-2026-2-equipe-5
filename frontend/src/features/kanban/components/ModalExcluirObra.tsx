import { AlertTriangle, ShieldAlert, Trash2 } from "lucide-react";
import type { ObraKanbanCard } from "../types/kanban";
import { COLUNAS_KANBAN } from "@/shared/constants/kanbanStatus";
import { Button } from "@/shared/components/ui/Button";
import { Modal } from "@/shared/components/ui/Modal";

interface ModalExcluirObraProps {
  obra: ObraKanbanCard;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isLoading: boolean;
  temAlocacaoAtiva?: boolean;
}

export default function ModalExcluirObra({
  obra,
  isOpen,
  onClose,
  onConfirm,
  isLoading,
  temAlocacaoAtiva = false,
}: ModalExcluirObraProps) {
  if (!isOpen) return null;

  const bloqueadoPorStatus = obra.status === "EmAndamento";
  const bloqueado = bloqueadoPorStatus || temAlocacaoAtiva;
  const rotuloEtapa =
    COLUNAS_KANBAN.find((coluna) => coluna.id === obra.status)?.label ??
    obra.status;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      fecharBloqueado={isLoading}
      tamanho="sm"
      icone={
        bloqueado ? (
          <div className="w-10 h-10 bg-warning-light text-warning rounded-xl flex items-center justify-center shrink-0">
            <ShieldAlert aria-hidden="true" className="w-5 h-5" />
          </div>
        ) : (
          <div className="w-10 h-10 bg-destructive-light text-destructive rounded-xl flex items-center justify-center shrink-0">
            <AlertTriangle aria-hidden="true" className="w-5 h-5" />
          </div>
        )
      }
      titulo={bloqueado ? "Ação bloqueada" : "Excluir obra?"}
      ariaLabelledBy="modal-excluir-titulo"
    >
      <div className="px-5 py-4 space-y-3">
        {bloqueadoPorStatus ? (
          <p className="text-sm text-muted-foreground leading-relaxed">
            A obra{" "}
            <strong className="text-foreground font-semibold">
              {obra.clienteNome}
            </strong>{" "}
            está em{" "}
            <strong className="text-foreground font-semibold">
              {rotuloEtapa}
            </strong>{" "}
            e não pode ser excluída. É necessário concluir ou suspender a
            execução antes.
          </p>
        ) : temAlocacaoAtiva ? (
          <p className="text-sm text-muted-foreground leading-relaxed">
            A obra{" "}
            <strong className="text-foreground font-semibold">
              {obra.clienteNome}
            </strong>{" "}
            possui equipe alocada no cronograma. Remova a alocação no Gantt
            antes de prosseguir com a exclusão.
          </p>
        ) : (
          <>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Tem certeza que deseja remover{" "}
              <strong className="text-foreground font-semibold">
                {obra.clienteNome}
              </strong>{" "}
              do funil operacional?
            </p>
            <div className="p-3.5 bg-surface-subtle rounded-xl border border-border-subtle space-y-2 text-xs">
              <div className="font-semibold text-foreground">
                {obra.clienteNome}
              </div>
              <div className="flex flex-wrap gap-1.5 text-[11px]">
                <span className="px-2 py-0.5 rounded-full bg-surface border border-border-subtle text-foreground-secondary font-medium">
                  {obra.categoria}
                </span>
                {obra.cidade && (
                  <span className="px-2 py-0.5 rounded-full bg-surface border border-border-subtle text-foreground-secondary font-medium">
                    {obra.cidade}
                  </span>
                )}
                <span className="px-2 py-0.5 rounded-full bg-surface border border-border-subtle text-foreground-secondary font-medium">
                  {obra.quantidadePaineis} painéis
                </span>
                <span className="px-2 py-0.5 rounded-full bg-surface border border-border-subtle text-foreground-secondary font-medium">
                  {rotuloEtapa}
                </span>
              </div>
            </div>
            <p className="text-xs text-warning font-medium leading-relaxed">
              A obra sairá das listagens, do quadro e das programações futuras.
              Histórico e comentários serão preservados para auditoria.
            </p>
          </>
        )}
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
          {bloqueado ? "Entendi" : "Cancelar"}
        </Button>
        {!bloqueado && (
          <Button
            variant="primary"
            size="sm"
            onClick={onConfirm}
            disabled={isLoading}
            className="h-10 px-4 gap-1.5 bg-destructive hover:bg-destructive-hover text-primary-foreground"
          >
            <Trash2 aria-hidden="true" className="w-3.5 h-3.5" />
            <span>{isLoading ? "Excluindo..." : "Excluir obra"}</span>
          </Button>
        )}
      </div>
    </Modal>
  );
}
