import { useState } from "react";
import { Save } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/shared/components/ui/Button";
import { cn } from "@/shared/lib/utils";
import type {
  ObraKanbanCard,
  ObraDetalheKanban,
  EditarObraKanbanPayload,
  EquipeAlocadaResumo,
} from "../../types/gavetaKanban";

interface AbaDadosObraProps {
  card: ObraKanbanCard;
  detalhe?: ObraDetalheKanban;
  canEdit: boolean;
  equipeAlocada: EquipeAlocadaResumo | null;
  loadingDetalhe: boolean;
  onSalvar?: (id: number, payload: EditarObraKanbanPayload) => Promise<void>;
  isSalvando?: boolean;
}

export function AbaDadosObra({
  card,
  detalhe,
  canEdit,
  equipeAlocada,
  loadingDetalhe,
  onSalvar,
  isSalvando = false,
}: AbaDadosObraProps) {
  const [formDados, setFormDados] = useState({
    endereco: detalhe?.endereco ?? card.endereco ?? "",
    quantidadePaineis: detalhe?.quantidadePaineis ?? card.quantidadePaineis ?? 0,
    previsaoFim: detalhe?.dataFimEstimada
      ? String(detalhe.dataFimEstimada).split("T")[0]
      : card.dataFimEstimada
        ? String(card.dataFimEstimada).split("T")[0]
        : "",
    observacoes: detalhe?.descricao ?? detalhe?.observacoes ?? card.observacoes ?? "",
  });

  const [erroEndereco, setErroEndereco] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEdit || loadingDetalhe || !onSalvar) return;

    if (!formDados.endereco.trim()) {
      setErroEndereco(true);
      document.getElementById("endereco-kanban")?.focus();
      toast.error("O endereço da obra é obrigatório.");
      return;
    }

    try {
      await onSalvar(card.id, {
        endereco: formDados.endereco.trim(),
        quantidadePaineis: Number(formDados.quantidadePaineis),
        dataFimEstimada: formDados.previsaoFim || undefined,
        descricao: formDados.observacoes.trim() || undefined,
      });
    } catch {
      // Erro gerenciado no onError do hook
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-semibold text-foreground-muted mb-1 block">
            Endereço <span className="text-destructive">*</span>
          </label>
          <input id="endereco-kanban" name="endereco" aria-label="Endereço" aria-describedby={erroEndereco ? "erro-endereco-kanban" : undefined}
            type="text"
            value={formDados.endereco}
            onChange={(e) => {
              setFormDados({ ...formDados, endereco: e.target.value });
              if (erroEndereco) setErroEndereco(false);
            }}
            disabled={!canEdit || loadingDetalhe}
            aria-invalid={erroEndereco}
            className={cn(
              "w-full text-xs px-2.5 py-1.5 bg-surface text-foreground border rounded-lg focus:outline-none focus:ring-1 disabled:bg-muted disabled:text-muted-foreground",
              erroEndereco
                ? "border-destructive focus:ring-destructive"
                : "border-border-strong focus:ring-info"
            )}
            placeholder="Endereço da instalação..."
          />
          {erroEndereco && <p id="erro-endereco-kanban" className="text-sm text-destructive">O endereço da obra é obrigatório.</p>}
        </div>

        <div>
          <label className="text-xs font-semibold text-foreground-muted mb-1 block" htmlFor="campo-abadadosobra-1">Quantidade de Painéis</label>
          <input id="campo-abadadosobra-1"
            type="number"
            min="1"
            step="1"
            value={formDados.quantidadePaineis}
            onChange={(e) => setFormDados({ ...formDados, quantidadePaineis: Number(e.target.value) })}
            disabled={!canEdit || loadingDetalhe}
            className="w-full text-xs px-2.5 py-1.5 bg-surface text-foreground border border-border-strong rounded-lg focus:outline-none focus:ring-1 focus:ring-info disabled:bg-muted disabled:text-muted-foreground"
          />
        </div>

        <div>
          <label className="text-xs font-semibold text-foreground-muted mb-1 block" htmlFor="campo-abadadosobra-2">Previsão de Término</label>
          <input id="campo-abadadosobra-2"
            type="date"
            value={formDados.previsaoFim}
            onChange={(e) => setFormDados({ ...formDados, previsaoFim: e.target.value })}
            disabled={!canEdit || loadingDetalhe}
            className="w-full text-xs px-2.5 py-1.5 bg-surface text-foreground border border-border-strong rounded-lg focus:outline-none focus:ring-1 focus:ring-info disabled:bg-muted disabled:text-muted-foreground"
          />
        </div>

        <div>
          <label className="text-xs font-semibold text-foreground-muted mb-1 block">Equipe Alocada</label>
          <div className="w-full text-xs px-2.5 py-1.5 border border-border-subtle bg-surface-subtle rounded-lg text-foreground-muted">
            {equipeAlocada ? equipeAlocada.nome : "Nenhuma equipe vinculada"}
          </div>
        </div>
      </div>

      <div>
        <label className="text-xs font-semibold text-foreground-muted mb-1 block">Observações Técnicas</label>
        <textarea aria-label="Observações Técnicas"
          rows={3}
          value={formDados.observacoes}
          onChange={(e) => setFormDados({ ...formDados, observacoes: e.target.value })}
          disabled={!canEdit || loadingDetalhe}
          className="w-full text-xs px-2.5 py-1.5 bg-surface text-foreground border border-border-strong rounded-lg focus:outline-none focus:ring-1 focus:ring-info disabled:bg-muted disabled:text-muted-foreground placeholder-subtle-foreground"
          placeholder="Adicione observações relevantes sobre o projeto..."
        />
      </div>

      {canEdit && onSalvar && (
        <div className="flex justify-end pt-2">
          <Button
            type="submit"
            variant="primary"
            size="sm"
            disabled={isSalvando || loadingDetalhe}
            className="flex items-center gap-1.5"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{isSalvando ? "Salvando..." : "Salvar Alterações"}</span>
          </Button>
        </div>
      )}
    </form>
  );
}
