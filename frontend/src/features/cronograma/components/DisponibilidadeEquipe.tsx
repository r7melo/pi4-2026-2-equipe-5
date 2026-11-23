import { useId } from 'react';
import { useDisponibilidade } from '../hooks/useEquipeTemporal';
import FeedbackErro from '@/shared/components/feedback/FeedbackErro';
import FeedbackLoading from '@/shared/components/feedback/FeedbackLoading';
import { EmptyState } from '@/shared/components/feedback/EmptyState';
import { formatarDataBR } from '@/shared/lib/formatters';

export function DisponibilidadeEquipe({ inicio, fim, selecionados, onChange, desabilitado = false }: {
  inicio: string; fim: string; selecionados: number[]; onChange: (ids: number[]) => void; desabilitado?: boolean;
}) {
  const consulta = useDisponibilidade(inicio, fim, Boolean(inicio && fim));
  const prefixo = useId();
  if (consulta.isLoading) return <FeedbackLoading mensagem="Consultando instaladores..." />;
  if (consulta.isError) return <FeedbackErro mensagem="Não foi possível consultar a disponibilidade. Você pode programar sem integrantes." onTentarNovamente={() => void consulta.refetch()} />;
  if (!consulta.data?.length) return <EmptyState titulo="Nenhum instalador ativo disponível" />;
  return <fieldset className="cronograma-disponibilidade"><legend className="font-semibold mb-2">Instaladores no período estimado</legend>
    <p className="cronograma-ajuda">{selecionados.length} selecionados · {consulta.data.filter(i => !i.ocupado).length} livres</p><div className="cronograma-disponibilidade-lista">{consulta.data.map(i => <div key={i.usuarioId} className={`cronograma-disponibilidade-item ${selecionados.includes(i.usuarioId) ? 'is-selected' : ''}`}>
      <div className="flex items-center gap-2 min-h-12">
        <input id={`${prefixo}-${i.usuarioId}`} name="integrantes" type="checkbox" value={i.usuarioId}
          checked={selecionados.includes(i.usuarioId)} disabled={desabilitado || consulta.isFetching || (i.ocupado && !selecionados.includes(i.usuarioId))}
          onChange={e => onChange(e.target.checked ? [...selecionados, i.usuarioId] : selecionados.filter(id => id !== i.usuarioId))} />
        <label htmlFor={`${prefixo}-${i.usuarioId}`} className="cronograma-disponibilidade-label"><span>{i.nome}</span><span className={`cronograma-status ${i.ocupado ? 'is-busy' : ''}`}><span className="sr-only"> — </span>{i.ocupado ? 'Ocupado' : 'Livre'}</span></label>
      </div>
      {i.ocupacoes.map(o => <p key={`${o.obraId}-${o.dataInicio}-${o.dataFim}`} className="text-xs text-muted-foreground">Obra {o.obraId}: {formatarDataBR(o.dataInicio)} a {formatarDataBR(o.dataFim)}</p>)}
    </div>)}</div>
  </fieldset>;
}
