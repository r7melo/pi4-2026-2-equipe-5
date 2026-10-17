import { useState, useCallback } from "react";
import { Users, UserCheck, Loader2 } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
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

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleLimparEFechar}
      fecharBloqueado={salvando}
      titulo="Nova Equipe de Campo"
      subtitulo="Cadastro de equipe e líder"
      icone={
        <div className="w-9 h-9 rounded-lg bg-info-light text-info flex items-center justify-center shrink-0">
          <Users className="w-5 h-5" />
        </div>
      }
      className="max-w-lg"
      ariaLabelledBy="modal-equipe-titulo"
    >
      <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label htmlFor="equipe-nome" className="text-xs font-semibold text-foreground-muted block mb-1">Nome da Equipe *</label>
            <input
              id="equipe-nome"
              type="text"
              required
              placeholder="Ex: Equipe Norte, Equipe Alfa"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-lg bg-surface text-foreground-secondary placeholder-subtle-foreground border border-border-subtle focus:outline-none focus:ring-2 focus:ring-info"
            />
          </div>

          <div>
            <label htmlFor="equipe-especialidade" className="text-xs font-semibold text-foreground-muted block mb-1">Especialidade (Opcional)</label>
            <input
              id="equipe-especialidade"
              type="text"
              placeholder="Ex: Instalação Comercial, Alta Tensão"
              value={especialidade}
              onChange={(e) => setEspecialidade(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-lg bg-surface text-foreground-secondary placeholder-subtle-foreground border border-border-subtle focus:outline-none focus:ring-2 focus:ring-info"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-foreground-muted block mb-1">Membros Instaladores (Mínimo 1) *</label>
            <div className="space-y-1.5 max-h-36 overflow-y-auto p-2 border border-border-subtle bg-surface-subtle rounded-lg custom-scrollbar">
              {instaladoresDisponiveis.map((inst) => (
                <label key={inst.id} className="flex items-center gap-2 p-1.5 hover:bg-surface rounded text-xs text-foreground-muted cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selecionados.includes(inst.id)}
                    onChange={() => handleToggleInstalador(inst.id)}
                    className="rounded text-info accent-info focus:ring-info"
                  />
                  <span>{inst.nome} <span className="text-[10px] text-muted-foreground">({inst.email})</span></span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label htmlFor="equipe-lider" className="text-xs font-semibold text-foreground-muted block mb-1">Responsável / Líder da Equipe *</label>
            <select
              id="equipe-lider"
              value={responsavelId ?? ""}
              onChange={(e) => setResponsavelId(Number(e.target.value))}
              disabled={instaladoresAptos.length === 0}
              className="w-full px-3 py-2 text-xs rounded-lg border border-border-subtle bg-surface text-foreground-secondary focus:outline-none focus:ring-2 focus:ring-info disabled:bg-muted disabled:text-muted-foreground"
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

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-border-subtle">
            <button
              type="button"
              onClick={handleLimparEFechar}
              disabled={salvando}
              className="px-3.5 py-2 text-xs font-semibold text-muted-foreground hover:bg-muted rounded-lg border border-border-subtle transition-colors cursor-pointer disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={salvando}
              className="px-4 py-2 text-xs font-semibold text-primary-foreground bg-info hover:bg-info-hover disabled:opacity-50 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
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
    </Modal>
  );
}
