import { useId } from 'react';
import { useDisponibilidade } from '../hooks/useEquipeTemporal';
import FeedbackErro from '@/shared/components/feedback/FeedbackErro';
import FeedbackLoading from '@/shared/components/feedback/FeedbackLoading';
import { EmptyState } from '@/shared/components/feedback/EmptyState';
import { Badge } from '@/shared/components/ui/Badge';
import { formatarDataBR } from '@/shared/lib/formatters';
import { cn } from '@/shared/lib/utils';

export function DisponibilidadeEquipe({ inicio, fim, selecionados, onChange, desabilitado = false }: {
  inicio: string; fim: string; selecionados: number[]; onChange: (ids: number[]) => void; desabilitado?: boolean;
}) {
  const consulta = useDisponibilidade(inicio, fim, Boolean(inicio && fim));
  const prefixo = useId();
  if (consulta.isLoading) {
    return (
      <div className="flex-1 min-h-[140px] flex items-center justify-center">
        <FeedbackLoading mensagem="Consultando instaladores..." />
      </div>
    );
  }
  if (consulta.isError) {
    return (
      <div className="flex-1 min-h-[140px] flex items-center justify-center">
        <FeedbackErro
          mensagem="Não foi possível consultar a disponibilidade. Você pode programar sem integrantes."
          onTentarNovamente={() => void consulta.refetch()}
        />
      </div>
    );
  }
  if (!consulta.data?.length) {
    return (
      <div className="flex-1 min-h-[140px] flex items-center justify-center">
        <EmptyState titulo="Nenhum instalador ativo disponível" />
      </div>
    );
  }

  const livres = consulta.data.filter(i => !i.ocupado).length;

  return (
    <div className="flex-1 min-h-0 flex flex-col gap-2">
      <p className="text-[11px] text-muted-foreground tabular-nums shrink-0">
        {selecionados.length} selecionados · {livres} livres
      </p>
      <div
        role="group"
        aria-label="Instaladores no período estimado"
        className="space-y-1.5 max-h-52 md:max-h-none md:flex-1 min-h-0 overflow-y-auto overscroll-contain pr-1"
      >
        {consulta.data.map(i => {
          const selecionado = selecionados.includes(i.usuarioId);
          const travado = desabilitado || consulta.isFetching || (i.ocupado && !selecionado);
          return (
            <div
              key={i.usuarioId}
              className={cn(
                'rounded-lg border px-2.5 py-2 transition-colors',
                selecionado
                  ? 'bg-info-light border-info-border'
                  : 'bg-surface border-border-subtle'
              )}
            >
              <label
                htmlFor={`${prefixo}-${i.usuarioId}`}
                className={cn(
                  'flex items-center justify-between gap-2 text-xs',
                  travado ? 'cursor-not-allowed opacity-70' : 'cursor-pointer'
                )}
              >
                <span className="flex items-center gap-2 min-w-0">
                  <input
                    id={`${prefixo}-${i.usuarioId}`}
                    name="integrantes"
                    type="checkbox"
                    value={i.usuarioId}
                    checked={selecionado}
                    disabled={travado}
                    onChange={e => onChange(e.target.checked ? [...selecionados, i.usuarioId] : selecionados.filter(id => id !== i.usuarioId))}
                    className="w-4 h-4 accent-info shrink-0 rounded cursor-pointer"
                  />
                  <span className="font-medium text-foreground truncate">{i.nome}</span>
                </span>
                <Badge
                  variante={i.ocupado ? 'warning' : 'success'}
                  tamanho="xs"
                >
                  {i.ocupado ? 'Ocupado' : 'Livre'}
                </Badge>
              </label>
              {i.ocupacoes.length > 0 && (
                <div className="pl-6 mt-0.5 space-y-0.5">
                  {i.ocupacoes.map(o => (
                    <p key={`${o.obraId}-${o.dataInicio}-${o.dataFim}`} className="text-[11px] text-muted-foreground tabular-nums">
                      {formatarDataBR(o.dataInicio)} a {formatarDataBR(o.dataFim)}
                    </p>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
