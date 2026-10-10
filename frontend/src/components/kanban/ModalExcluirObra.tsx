import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { AlertTriangle, X, ShieldAlert } from "lucide-react";
import type { ObraCard } from "@/types";
import { Button } from "@/components/ui/Button";

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
  const modalRef = useRef<HTMLDivElement>(null);
  const targetObra = obra || card;

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isLoading) onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isLoading, onClose]);

  if (!isOpen || !targetObra) return null;

  const bloqueadoPorStatus = targetObra.status === "EmAndamento";
  const bloqueado = bloqueadoPorStatus || temAlocacaoAtiva;

  const modalContent = (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200"
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => {
        if (e.target === e.currentTarget && !isLoading) onClose();
      }}
    >
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        className="w-full max-w-md bg-white rounded-xl shadow-2xl border border-slate-100 overflow-hidden transform transition-all"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5 text-slate-800">
            {bloqueado ? (
              <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
                <ShieldAlert className="w-5 h-5" />
              </div>
            ) : (
              <div className="p-2 bg-red-50 text-red-600 rounded-lg">
                <AlertTriangle className="w-5 h-5" />
              </div>
            )}
            <h3 id="modal-title" className="text-base font-semibold">
              {bloqueado ? "Ação Bloqueada" : "Confirmar Exclusão"}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-md transition-colors cursor-pointer"
            aria-label="Fechar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

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
              </div>
            </>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 px-5 py-3.5 border-t border-slate-100 bg-slate-50/50">
          <Button variant="outline" size="sm" onClick={onClose} disabled={isLoading}>
            {bloqueado ? "Fechar" : "Cancelar"}
          </Button>
          {!bloqueado && (
            <Button
              variant="danger"
              size="sm"
              onClick={onConfirm}
              disabled={isLoading}
              className="bg-red-600 hover:bg-red-700 text-white shadow-xs focus:ring-red-400"
            >
              {isLoading ? "Excluindo..." : "Excluir Obra"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
