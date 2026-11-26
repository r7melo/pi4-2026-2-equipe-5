import { useId, useState } from 'react';
import { ConfirmDialog } from '@/shared/components/feedback/ConfirmDialog';
import { projetarReordenacao } from '@/shared/lib/reordenarProgramacoes';
import { temVinculosParciais } from '@/shared/lib/equipeTemporal';
import { formatarDataBR } from '@/shared/lib/formatters';
import type { Programacao } from '@/shared/types/programacoes';
import { FormularioReagendamento } from './drawer/FormularioReagendamento';
import type { FormularioReagendamentoProps } from '../types/gavetaGantt';

export function RevisarReagendamento({ programacoes, ...props }: FormularioReagendamentoProps & { programacoes: Programacao[] }) {
  const [revisao, setRevisao] = useState<{ inicio: string; resolver: (valor: boolean | null) => void } | null>(null);
  const [aceite, setAceite] = useState<string | null>(null);
  const id = useId();
  let projecao: ReturnType<typeof projetarReordenacao> = null;
  if (revisao) { try { projecao = projetarReordenacao(programacoes, props.tarefaId, revisao.inicio); } catch { /* Formulário já valida datas. */ } }
  const assinatura = JSON.stringify(projecao?.alteradas ?? null);
  const confirmado = projecao !== null && aceite === assinatura;
  return <>
    <FormularioReagendamento {...props} onReagendar={async (tarefaId, inicio) => {
      if (!temVinculosParciais(programacoes, tarefaId)) return props.onReagendar?.(tarefaId, inicio) ?? null;
      setAceite(null);
      return new Promise<boolean | null>(resolver => setRevisao({ inicio, resolver }));
    }} />
    <ConfirmDialog isOpen={Boolean(revisao)} titulo="Revisar participações parciais" descricao="O reagendamento desloca os vínculos abaixo. Confira as novas datas antes de confirmar."
      confirmarBloqueado={!confirmado || props.reagendamentoBloqueado || !projecao}
      onClose={() => { revisao?.resolver(null); setRevisao(null); }}
      onConfirm={() => {
        if (!revisao || !confirmado || !projecao || props.reagendamentoBloqueado) return;
        const atual = revisao; setRevisao(null);
        void Promise.resolve(props.onReagendar?.(props.tarefaId, atual.inicio) ?? null).then(atual.resolver, () => atual.resolver(false));
      }} conteudo={<div className="w-full space-y-3 text-sm text-left">
        {projecao?.alteradas.map(p => <div key={p.id}><strong>Obra {p.obraId}</strong>{p.equipe?.integrantes.map(i => <p key={i.usuarioId}>{i.nome}: {formatarDataBR(i.dataEntrada)} a {formatarDataBR(i.dataSaida)}</p>)}</div>)}
        <div className="flex items-center gap-2 min-h-12"><input id={id} name="revisaoParciais" type="checkbox" checked={confirmado} onChange={e => setAceite(e.target.checked ? assinatura : null)} /><label htmlFor={id}>Revisei as datas de participação</label></div>
      </div>} />
  </>;
}
