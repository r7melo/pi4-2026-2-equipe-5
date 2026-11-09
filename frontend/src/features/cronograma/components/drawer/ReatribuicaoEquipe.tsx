import { useState } from "react";
import { Users, Loader2 } from "lucide-react";
import { obterConflitosEquipe } from "@/features/cronograma/lib/ganttCalculos";
import type { ReatribuicaoEquipeProps } from "@/features/cronograma/types/gavetaGantt";

export function ReatribuicaoEquipe({
  tarefaId,
  equipeId,
  dataInicio,
  dataFim,
  equipes,
  programacoes,
  onMudarEquipe,
  canEdit = true,
}: ReatribuicaoEquipeProps) {
  const [mudandoEquipe, setMudandoEquipe] = useState(false);

  if (!canEdit || !equipes || equipes.length === 0 || !onMudarEquipe) {
    return null;
  }

  return (
    <div className="space-y-2">
      <h3 className="text-xs font-bold text-foreground-secondary uppercase tracking-wider flex items-center gap-1.5">
        <Users className="w-4 h-4 text-muted-foreground" />
        <span>Reatribuir Equipe</span>
      </h3>
      <div className="flex items-center gap-2">
        <select
          value={equipeId}
          disabled={mudandoEquipe}
          onChange={async (e) => {
            const novaEquipeId = Number(e.target.value);
            if (novaEquipeId && novaEquipeId !== equipeId) {
              setMudandoEquipe(true);
              try {
                await onMudarEquipe(tarefaId, novaEquipeId);
              } finally {
                setMudandoEquipe(false);
              }
            }
          }}
          className="flex-1 text-xs border border-border-subtle rounded-lg px-3 py-2 bg-surface text-foreground-secondary focus:outline-none focus:ring-2 focus:ring-info cursor-pointer disabled:opacity-60"
        >
          {equipes.map((eq) => {
            const conflitos = programacoes
              ? obterConflitosEquipe(eq.id, dataInicio, dataFim, programacoes, tarefaId)
              : [];
            const ocupada = conflitos.length > 0;
            return (
              <option key={eq.id} value={eq.id}>
                {eq.nome} {ocupada ? "— [Ocupada no período]" : ""}
              </option>
            );
          })}
        </select>
        {mudandoEquipe && <Loader2 className="w-4 h-4 animate-spin text-info" />}
      </div>
    </div>
  );
}
