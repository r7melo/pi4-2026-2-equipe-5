import { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { Users, UserCheck, X, Loader2 } from "lucide-react";
import { useCriarEquipe, useInstaladoresDisponiveis } from "@/hooks/api/useEquipes";
import { toast } from "sonner";

interface GanttNovaEquipeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onEquipeCriada?: (equipeId: number) => void;
}

export function GanttNovaEquipeModal({ isOpen, onClose, onEquipeCriada }: GanttNovaEquipeModalProps) {
  const [nome, setNome] = useState("");
  const [especialidade, setEspecialidade] = useState("");
  const [selecionados, setSelecionados] = useState<number[]>([]);
  const [responsavelId, setResponsavelId] = useState<number | null>(null);

  const { data: instaladoresDisponiveis = [] } = useInstaladoresDisponiveis();
  const { mutateAsync: cadastrarEquipe, isPending: salvando } = useCriarEquipe();

  const handleLimparEFechar = useCallback(() => {
    setNome("");
    setEspecialidade("");
    setSelecionados([]);
    setResponsavelId(null);
    onClose();
  }, [onClose]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !salvando) handleLimparEFechar();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, salvando, handleLimparEFechar]);

  if (!isOpen || typeof document === "undefined") return null;

  const handleToggleInstalador = (id: number) => {
    setSelecionados((prev) => {
      const proximo = prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id];
      if (!proximo.includes(responsavelId ?? -1)) {
        setResponsavelId(proximo.length > 0 ? proximo[0] : null);
      }
      return proximo;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim()) return toast.warning("Informe o nome da equipe.");
    if (selecionados.length === 0) return toast.warning("Selecione ao menos um instalador para a equipe.");
    if (!responsavelId) return toast.warning("Defina o responsável da equipe.");

    try {
      const novaEquipe = await cadastrarEquipe({
        nome: nome.trim(),
        especialidade: especialidade.trim() || undefined,
        instaladorIds: selecionados,
        responsavelId,
      });
      toast.success(`Equipe "${nome}" cadastrada com sucesso!`, {
        description: "Equipe pronta para alocação no cronograma Gantt.",
      });
      if (onEquipeCriada) {
        onEquipeCriada(novaEquipe.id);
      }
      handleLimparEFechar();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro ao cadastrar equipe.";
      toast.error(msg);
    }
  };

  const instaladoresAptos = instaladoresDisponiveis.filter((i) => selecionados.includes(i.id));

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-equipe-titulo"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-fade-in select-none"
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => {
        e.stopPropagation();
        if (e.target === e.currentTarget && !salvando) {
          handleLimparEFechar();
        }
      }}
    >
      <div 
        className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-lg w-full p-6 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h3 id="modal-equipe-titulo" className="text-base font-semibold text-slate-900">Nova Equipe de Campo</h3>
              <p className="text-xs text-slate-500">Cadastro de equipe e líder</p>
            </div>
          </div>
          <button 
            type="button"
            onClick={handleLimparEFechar} 
            disabled={salvando}
            aria-label="Fechar modal"
            className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 cursor-pointer disabled:opacity-50"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="equipe-nome" className="text-xs font-semibold text-slate-700 block mb-1">Nome da Equipe *</label>
            <input
              id="equipe-nome"
              type="text"
              required
              placeholder="Ex: Equipe Norte, Equipe Alfa"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>

          <div>
            <label htmlFor="equipe-especialidade" className="text-xs font-semibold text-slate-700 block mb-1">Especialidade (Opcional)</label>
            <input
              id="equipe-especialidade"
              type="text"
              placeholder="Ex: Instalação Comercial, Alta Tensão"
              value={especialidade}
              onChange={(e) => setEspecialidade(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">Membros Instaladores (Mínimo 1) *</label>
            <div className="space-y-1.5 max-h-36 overflow-y-auto p-2 border border-slate-100 bg-slate-50 rounded-lg custom-scrollbar">
              {instaladoresDisponiveis.map((inst) => (
                <label key={inst.id} className="flex items-center gap-2 p-1.5 hover:bg-white rounded text-xs text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selecionados.includes(inst.id)}
                    onChange={() => handleToggleInstalador(inst.id)}
                    className="rounded text-blue-600 focus:ring-blue-500"
                  />
                  <span>{inst.nome} <span className="text-[10px] text-slate-400">({inst.email})</span></span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label htmlFor="equipe-lider" className="text-xs font-semibold text-slate-700 block mb-1">Responsável / Líder da Equipe *</label>
            <select
              id="equipe-lider"
              value={responsavelId ?? ""}
              onChange={(e) => setResponsavelId(Number(e.target.value))}
              disabled={instaladoresAptos.length === 0}
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 disabled:bg-slate-100 disabled:text-slate-400"
            >
              {instaladoresAptos.length === 0 ? (
                <option value="">Selecione ao menos um instalador acima</option>
              ) : (
                instaladoresAptos.map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.nome} (Líder)
                  </option>
                ))
              )}
            </select>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={handleLimparEFechar}
              disabled={salvando}
              className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors cursor-pointer disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={salvando}
              className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              {salvando ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Salvando...</span>
                </>
              ) : (
                <>
                  <UserCheck className="w-3.5 h-3.5" />
                  <span>Cadastrar Equipe</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
