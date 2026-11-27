import { CalendarDays, Loader2 } from "lucide-react";
import { AlertBanner } from "@/shared/components/ui/AlertBanner";
import { Badge } from "@/shared/components/ui/Badge";
import { formatarDataBR } from "@/shared/lib/formatters";
import { useParticipacoesFuturasInstalador } from "../hooks/useGestaoUsuarios";

interface AvisoParticipacoesFuturasProps {
  usuarioId: number;
  habilitada: boolean;
  contexto: "inativacao" | "perfil";
}

export function AvisoParticipacoesFuturas({
  usuarioId,
  habilitada,
  contexto,
}: AvisoParticipacoesFuturasProps) {
  const consulta = useParticipacoesFuturasInstalador(usuarioId, habilitada);

  if (!habilitada) return null;

  if (consulta.isPending) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-border-subtle bg-surface-subtle px-3 py-2 text-xs text-muted-foreground">
        <Loader2 className="w-3.5 h-3.5 shrink-0 motion-safe:animate-spin" aria-hidden="true" />
        <span>Verificando programações futuras no cronograma...</span>
      </div>
    );
  }

  if (consulta.isError) {
    return (
      <AlertBanner variante="warning" titulo="Aviso sobre o cronograma">
        Não foi possível consultar as programações ativas deste instalador. Confira o cronograma manualmente se necessário.
      </AlertBanner>
    );
  }

  const participacoes = consulta.data ?? [];
  if (participacoes.length === 0) return null;

  const titulo =
    contexto === "inativacao"
      ? `Participações ativas ou futuras no cronograma (${participacoes.length})`
      : `Atenção: este instalador possui ${participacoes.length} ${participacoes.length === 1 ? "participação ativa ou futura" : "participações ativas ou futuras"}`;

  const instrucao =
    contexto === "inativacao"
      ? "A desativação bloqueia o acesso, mas não remove essas alocações automaticamente. Revise e substitua no cronograma:"
      : "Alterar o perfil para fora de Instalador de Campo mantém o histórico já programado. Revise estas obras no cronograma:";

  return (
    <AlertBanner variante="warning" titulo={titulo}>
      <div className="space-y-2 text-left">
        <p>{instrucao}</p>
        <ul className="max-h-36 overflow-y-auto custom-scrollbar divide-y divide-warning-border/60 rounded-md border border-warning-border bg-surface/80">
          {participacoes.map((item) => (
            <li
              key={`${item.programacaoId}-${item.dataEntrada}`}
              className="px-2.5 py-1.5 flex items-center justify-between gap-2 text-foreground"
            >
              <div className="min-w-0">
                <p className="text-xs font-medium truncate">{item.obraNome}</p>
                <p className="text-[11px] text-muted-foreground tabular-nums flex items-center gap-1">
                  <CalendarDays className="w-3 h-3 shrink-0" aria-hidden="true" />
                  <span>{formatarDataBR(item.dataEntrada)} a {formatarDataBR(item.dataSaida)}</span>
                </p>
              </div>
              {item.emAndamento && (
                <Badge variante="warning" tamanho="xs" comBorda className="shrink-0">
                  Em andamento
                </Badge>
              )}
            </li>
          ))}
        </ul>
      </div>
    </AlertBanner>
  );
}
