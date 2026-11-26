import { formatarDataBR } from "@/shared/lib/formatters";
import { Badge, type BadgeVariante } from "@/shared/components/ui/Badge";
import { cn } from "@/shared/lib/utils";
import type { HistoricoItemKanban } from "../../types/gavetaKanban";

const HISTORICO_VAZIO: HistoricoItemKanban[] = [];

interface AbaHistoricoObraProps {
  historico?: HistoricoItemKanban[];
  carregandoHistorico?: boolean;
}

function obterMetaEvento(tipoAcao?: string): {
  label: string;
  dot: string;
  variante: BadgeVariante;
} {
  switch (tipoAcao) {
    case "MudancaStatus":
      return { label: "Etapa", dot: "bg-info", variante: "info" };
    case "Equipe":
      return { label: "Equipe", dot: "bg-accent", variante: "accent" };
    case "Material":
      return { label: "Material", dot: "bg-warning", variante: "warning" };
    case "Cadastro":
      return { label: "Cadastro", dot: "bg-success", variante: "success" };
    case "ManutencaoConcluida":
      return { label: "Manutenção", dot: "bg-success", variante: "success" };
    case "AlteracaoFinanceira":
      return { label: "Financeiro", dot: "bg-warning", variante: "warning" };
    default:
      return { label: "Comentário", dot: "bg-primary", variante: "neutral" };
  }
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
        Nenhuma alteração registrada na linha do tempo.
      </div>
    );
  }

  return (
    <div className="relative pl-6 space-y-3">
      <div
        aria-hidden="true"
        className="absolute left-[9px] top-3 bottom-3 w-0.5 bg-border-subtle"
      />
      {historico.map((h, idx) => {
        const meta = obterMetaEvento(h.tipoAcao);
        return (
          <div key={h.id} className="relative">
            <span
              aria-hidden="true"
              className="absolute -left-6 top-3.5 w-[18px] h-[18px] rounded-full bg-surface flex items-center justify-center"
            >
              <span
                className={cn(
                  "w-2.5 h-2.5 rounded-full",
                  meta.dot,
                  idx === 0 && "ring-4 ring-info-light"
                )}
              />
            </span>
            <div className="rounded-xl bg-surface-subtle p-3.5 space-y-1.5 text-xs">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <Badge variante={meta.variante} tamanho="xs">
                    {meta.label}
                  </Badge>
                  <span className="font-semibold text-foreground truncate">
                    {h.usuarioNome || "Sistema"}
                  </span>
                </div>
                <span className="text-[11px] text-muted-foreground tabular-nums shrink-0">
                  {formatarDataBR(h.dataAlteracao)}
                </span>
              </div>

              {h.tipoAcao === "Cadastro" ? (
                <p className="font-medium text-foreground">
                  Obra cadastrada{h.statusNovo && <> em <strong>{h.statusNovo}</strong></>}
                </p>
              ) : h.statusAnterior && h.statusNovo ? (
                <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                  <span className="px-2 py-0.5 rounded bg-surface text-foreground-muted font-medium">
                    {h.statusAnterior}
                  </span>
                  <span aria-hidden="true" className="text-muted-foreground">→</span>
                  <span className="px-2 py-0.5 rounded bg-info-light text-info font-semibold">
                    {h.statusNovo}
                  </span>
                </div>
              ) : (
                <p className="font-medium text-foreground">
                  {({
                    Comentario: "Comentário registrado",
                    ManutencaoConcluida: "Manutenção concluída",
                    AlteracaoFinanceira: "Dados financeiros atualizados",
                    MudancaStatus: "Status atualizado",
                  }[h.tipoAcao ?? ""] ?? "Alteração registrada")}
                </p>
              )}

              {h.observacao && (
                <p className="text-foreground-secondary leading-relaxed wrap-anywhere">
                  {h.observacao}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
