import { useState } from "react";
import { Copy, Check, ExternalLink, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Modal } from "@/components/ui/Modal";

interface GanttCompartilharModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function GanttCompartilharModal({
  isOpen,
  onClose,
}: GanttCompartilharModalProps) {
  const [copiado, setCopiado] = useState(false);

  const tokenPublico = "demo-cronograma-zl-2026";
  const urlCompartilhada = `${typeof window !== "undefined" ? window.location.origin : ""}/cronograma/compartilhado/${tokenPublico}`;

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
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      titulo="Compartilhar Cronograma Público"
      subtitulo="Visualização somente-leitura para clientes e parceiros"
      icone={
        <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
          <ShieldCheck className="w-5 h-5" />
        </div>
      }
      className="max-w-lg"
    >
      <div className="p-6 flex flex-col gap-5">
        <p className="text-xs text-slate-600 leading-relaxed">
          Gere um link seguro para permitir que clientes e parceiros acompanhem o andamento das instalações em tempo real sem necessidade de login.
        </p>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-slate-700">Link Público de Acesso</label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={urlCompartilhada}
              className="flex-1 text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 font-mono select-all focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <button
              onClick={handleCopiar}
              className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-medium transition-colors cursor-pointer shrink-0 shadow-xs"
            >
              {copiado ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiado ? "Copiado!" : "Copiar"}</span>
            </button>
          </div>
        </div>

        <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 flex items-start gap-2.5">
          <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
          <div className="text-[11px] text-slate-500 leading-tight">
            <span className="font-semibold text-slate-700">Proteção Ativa:</span> O link exibe apenas informações executivas da obra e cronograma de equipes. Dados financeiros e notas internas permanecem estritamente confidenciais.
          </div>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-slate-100">
          <a
            href={urlCompartilhada}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 font-medium transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>Testar visualização pública</span>
          </a>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-medium transition-colors cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>
    </Modal>
  );
}
