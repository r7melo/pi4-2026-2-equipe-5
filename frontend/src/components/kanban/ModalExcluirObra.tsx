import { AlertTriangle, ShieldAlert } from "lucide-react";
import type { ObraCard } from "@/types";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";

interface ModalExcluirObraProps {
  obra?: ObraCard;
  card?: ObraCard;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isLoading: boolean;
  temAlocacaoAtiva?: boolean;
}

export default function ModalExcluirObra({
  obra,
  card,
  isOpen,
  onClose,
  onConfirm,
  isLoading,
  temAlocacaoAtiva = false,
}: ModalExcluirObraProps) {
  const targetObra = obra || card;

  if (!isOpen || !targetObra) return null;

  const bloqueadoPorStatus = targetObra.status === "EmAndamento";
  const bloqueado = bloqueadoPorStatus || temAlocacaoAtiva;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      zIndex="z-[70]"
      fecharBloqueado={isLoading}
      className="max-w-md"
      icone={
        bloqueado ? (
          <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
            <ShieldAlert className="w-5 h-5" />
          </div>
        ) : (
          <div className="p-2 bg-red-50 text-red-600 rounded-lg">
            <AlertTriangle className="w-5 h-5" />
          </div>
        )
      }
      titulo={bloqueado ? "Ação Bloqueada" : "Confirmar Exclusão"}
      ariaLabelledBy="modal-excluir-titulo"
    >
      <div className="px-5 py-4 space-y-3">
        {bloqueadoPorStatus ? (
          <p className="text-sm text-slate-600">
            A obra <strong className="text-slate-800 font-semibold">{targetObra.clienteNome}</strong> está em andamento e não pode ser excluída. É necessário concluir ou suspender a execução antes.
          </p>
        ) : temAlocacaoAtiva ? (
          <p className="text-sm text-slate-600">
            A obra <strong className="text-slate-800 font-semibold">{targetObra.clienteNome}</strong> possui equipe alocada no cronograma. Remova a alocação no Gantt antes de prosseguir com a exclusão.
          </p>
        ) : (
          <>
            <p className="text-sm text-slate-600">
              Tem certeza que deseja remover a obra de <strong className="text-slate-800 font-semibold">{targetObra.clienteNome}</strong> do funil operacional?
            </p>
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 text-xs text-slate-500 space-y-1">
              <p><span className="font-medium text-slate-700">Categoria:</span> {targetObra.categoria}</p>
              <p><span className="font-medium text-slate-700">Painéis:</span> {targetObra.quantidadePaineis} módulos</p>
              <p><span className="font-medium text-slate-700">Status:</span> {targetObra.status}</p>
            </div>
            <p className="text-xs text-amber-600 font-medium">
              Esta ação removerá a obra do funil operacional.
            </p>
          </>
        )}
      </div>

      <div className="flex items-center justify-end gap-2 px-5 py-3.5 border-t border-slate-100 bg-slate-50/50">
        <Button
          variant="outline"
          size="sm"
          onClick={onClose}
          disabled={isLoading}
        >
          {bloqueado ? "Entendi" : "Cancelar"}
        </Button>
        {!bloqueado && (
          <Button
            variant="danger"
            size="sm"
            onClick={onConfirm}
            disabled={isLoading}
          >
            {isLoading ? "Excluindo..." : "Excluir Obra"}
          </Button>
        )}
      </div>
    </Modal>
  );
}
