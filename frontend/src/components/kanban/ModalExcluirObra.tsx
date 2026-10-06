import { useEffect } from "react";
import { createPortal } from "react-dom";
import { AlertTriangle, Trash2, X, Lock } from "lucide-react";
import type { ObraCard } from "@/types";

interface ModalExcluirObraProps {
  card: ObraCard;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isLoading: boolean;
  temAlocacaoAtiva?: boolean;
}

export default function ModalExcluirObra({
  card,
  isOpen,
  onClose,
  onConfirm,
  isLoading,
  temAlocacaoAtiva = false,
}: ModalExcluirObraProps) {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isLoading) onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isLoading, onClose]);

  if (!isOpen || typeof document === "undefined") return null;

  const estaEmExecucao = card.status === "EmAndamento";
  const bloqueado = estaEmExecucao || temAlocacaoAtiva;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-excluir-titulo"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-fade-in select-none"
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => {
        e.stopPropagation();
        if (e.target === e.currentTarget && !isLoading) onClose();
      }}
    >
      <div 
        className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-md w-full p-6 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${bloqueado ? "bg-amber-100 text-amber-600" : "bg-red-100 text-red-600"}`}>
              {bloqueado ? <Lock className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
            </div>
            <div>
              <h3 id="modal-excluir-titulo" className="text-base font-semibold text-slate-900">
                {bloqueado ? "Exclusão Bloqueada" : "Excluir Obra"}
              </h3>
              <p className="text-xs text-slate-500">ID #{card.id} — {card.clienteNome}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            aria-label="Fechar modal"
            className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {bloqueado ? (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800 leading-relaxed">
            {estaEmExecucao && (
              <p>⚠️ <strong>Obra em Execução:</strong> Obras com status <em>Em Andamento</em> não podem ser apagadas.</p>
            )}
            {temAlocacaoAtiva && !estaEmExecucao && (
              <p>⚠️ <strong>Equipe Alocada:</strong> Esta obra possui equipe e cronograma agendado no Gantt. É necessário desalocá-la antes da exclusão.</p>
            )}
          </div>
        ) : (
          <p className="text-xs text-slate-600 leading-relaxed">
            Tem certeza de que deseja excluir esta obra? Seu cartão será removido do funil Kanban e o registro será arquivado logicamente conforme as regras de auditoria.
          </p>
        )}

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors cursor-pointer"
          >
            {bloqueado ? "Entendido" : "Cancelar"}
          </button>
          {!bloqueado && (
            <button
              type="button"
              onClick={onConfirm}
              disabled={isLoading}
              className="px-3.5 py-2 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Trash2 className="w-3.5 h-3.5" />
              {isLoading ? "Excluindo..." : "Confirmar Exclusão"}
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
