// frontend/src/components/gantt/GanttCompartilharModal.tsx
// RF-16: Modal gerador de link público para cronograma compartilhado
import { useState, useEffect } from "react";
import { Copy, Check, ExternalLink, ShieldCheck, X } from "lucide-react";
import { toast } from "sonner";

interface GanttCompartilharModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function GanttCompartilharModal({
  isOpen,
  onClose,
}: GanttCompartilharModalProps) {
  const [copiado, setCopiado] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Token de demonstração estável para acesso público
  const tokenPublico = "demo-cronograma-zl-2026";
  const urlCompartilhada = `${window.location.origin}/cronograma/compartilhado/${tokenPublico}`;

  const handleCopiar = async () => {
    try {
      await navigator.clipboard.writeText(urlCompartilhada);
      setCopiado(true);
      toast.success("Link público copiado com sucesso!");
      setTimeout(() => setCopiado(false), 2500);
    } catch {
      toast.error("Não foi possível copiar o link automaticamente.");
    }
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 overflow-hidden bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full p-6 flex flex-col gap-5 animate-zoom-in-95"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800">
                Compartilhar Cronograma Público
              </h3>
              <p className="text-xs text-slate-500">
                Visualização somente-leitura para clientes e parceiros (RF-16)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-xs text-slate-600 leading-relaxed">
          <p>
            Qualquer pessoa com este link poderá acompanhar as datas previstas e o
            andamento das obras em tempo real.
          </p>
          <p className="mt-1 text-slate-400 text-[11px]">
            🔒 Dados confidenciais como faturamento, margem e contatos pessoais não
            são exibidos na tela pública.
          </p>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-slate-700">
            Link de Acesso Público
          </label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={urlCompartilhada}
              className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-mono text-slate-700 select-all focus:outline-none"
            />
            <button
              onClick={handleCopiar}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                copiado
                  ? "bg-emerald-600 text-white"
                  : "bg-blue-600 hover:bg-blue-700 text-white"
              }`}
            >
              {copiado ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiado ? "Copiado!" : "Copiar"}</span>
            </button>
          </div>
        </div>

        <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
          <a
            href={urlCompartilhada}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-xs font-medium text-blue-600 hover:text-blue-700 hover:underline"
          >
            <span>Visualizar página agora</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>

          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
