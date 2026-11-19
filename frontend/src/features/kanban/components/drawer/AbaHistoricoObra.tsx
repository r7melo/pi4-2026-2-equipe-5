import { formatarDataBR } from "@/shared/lib/formatters";
import type { HistoricoItemKanban } from "../../types/gavetaKanban";

const HISTORICO_VAZIO: HistoricoItemKanban[] = [];

interface AbaHistoricoObraProps {
  historico?: HistoricoItemKanban[];
  carregandoHistorico?: boolean;
}

export function AbaHistoricoObra({
  historico = HISTORICO_VAZIO,
  carregandoHistorico = false,
}: AbaHistoricoObraProps) {
  if (carregandoHistorico) {
    return (
      <div className="py-8 text-center text-xs text-muted-foreground">
        Carregando histórico de alterações...
      </div>
    );
  }

  if (historico.length === 0) {
    return (
      <div className="py-8 text-center text-xs text-muted-foreground border border-dashed border-border-subtle rounded-xl">
        Nenhuma movimentação de status registrada no histórico.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="relative pl-4 space-y-4 before:absolute before:left-1.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-border-subtle">
        {historico.map((h) => (
          <div key={h.id} className="relative">
            <span className="absolute -left-4 top-1 w-2.5 h-2.5 rounded-full bg-info ring-4 ring-surface" />
            <div className="bg-surface-subtle border border-border-subtle rounded-lg p-2.5">
              <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-1">
                <span className="font-semibold text-foreground-muted">{h.usuarioNome || "Sistema"}</span>
                <span>{formatarDataBR(h.dataAlteracao)}</span>
              </div>
              <p className="text-xs text-foreground-secondary">
                De <strong>{h.statusAnterior}</strong> para <strong>{h.statusNovo}</strong>
              </p>
              {h.observacao && (
                <p className="text-[11px] text-muted-foreground mt-1 italic">
                  "{h.observacao}"
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
