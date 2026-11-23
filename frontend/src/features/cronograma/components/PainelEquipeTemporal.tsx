import { useId, useState } from 'react';
import type { Programacao } from '@/shared/types/programacoes';
import type { IntegranteTemporal, AlteracaoEquipeTemporal } from '@/shared/types/equipeTemporal';
import { resumirEquipe } from '@/shared/lib/equipeTemporal';
import { diasUteisCivis } from '@/shared/lib/datasCivis';
import { formatarDataISO, formatarDataBR } from '@/shared/lib/formatters';
import { capturarSessaoOperacional, sessaoOperacionalVigente } from '@/shared/lib/sessaoOperacao';
import { useAlterarEquipeTemporal, useDisponibilidade, mensagemEquipe } from '../hooks/useEquipeTemporal';
import { ConfirmDialog } from '@/shared/components/feedback/ConfirmDialog';
import FeedbackErro from '@/shared/components/feedback/FeedbackErro';
import FeedbackLoading from '@/shared/components/feedback/FeedbackLoading';
import { EmptyState } from '@/shared/components/feedback/EmptyState';

export function PainelEquipeTemporal({ programacao: p, canEdit, podeEditar }: { programacao: Programacao; canEdit: boolean; podeEditar: () => boolean }) {
  const prefixo = useId();
  const [previstas, setPrevistas] = useState(String(p.equipe?.pessoasPrevistas ?? 1));
  const [usuarioId, setUsuarioId] = useState('');
  const [entrada, setEntrada] = useState(p.dataInicio);
  const [saida, setSaida] = useState(p.dataFim);
  const [edicao, setEdicao] = useState<IntegranteTemporal | null>(null);
  const [remocao, setRemocao] = useState<IntegranteTemporal | null>(null);
  const [saidaRemocao, setSaidaRemocao] = useState('');
  const [erro, setErro] = useState('');
  const [hoje, setHoje] = useState(() => formatarDataISO(new Date()));
  const [sucesso, setSucesso] = useState('');
  const mutacao = useAlterarEquipeTemporal(p.id, podeEditar);
  const consulta = useDisponibilidade(entrada, saida, canEdit && Boolean(entrada && saida && entrada <= saida));
  const equipe = p.equipe;
  if (!equipe) return <FeedbackErro mensagem="Equipe temporal não informada pelo servidor." />;
  const resumo = resumirEquipe(equipe, p.dataInicio, p.dataFim);
  const vinculoIniciado = remocao ? hoje >= remocao.dataEntrada : false;
  async function salvar(alteracao: AlteracaoEquipeTemporal) {
    const sessao = capturarSessaoOperacional();
    setErro(''); setSucesso('');
    try {
      if (!await mutacao.salvar(alteracao)) return;
      if (!sessaoOperacionalVigente(sessao) || !podeEditar()) return;
      setSucesso('Equipe atualizada.'); setEdicao(null); setUsuarioId(''); setRemocao(null);
    } catch (falha) {
      if (sessaoOperacionalVigente(sessao) && podeEditar()) { setErro(mensagemEquipe(falha)); void consulta.refetch(); }
    }
  }
  const controle = 'cronograma-input';
  const nome = (campo: string) => `${prefixo}-${campo}`;
  return <section className="cronograma-equipe cronograma-secao space-y-4 text-sm" aria-labelledby={nome('titulo')}>
    <h3 id={nome('titulo')} className="font-semibold">Equipe da programação</h3>
    <p className="cronograma-cobertura">{resumo.vinculadas}/{equipe.pessoasPrevistas} pessoas vinculadas · Cobertura mínima: {resumo.minima} · Faltam até {resumo.faltantes}</p>
    <p className="cronograma-ajuda">Esforço útil: {resumo.esforcoUtil} pessoa-dia{resumo.esforcoUtil !== equipe.pessoaDia && ` (servidor informou ${equipe.pessoaDia})`}</p>
    {equipe.integrantes.length === 0 ? <EmptyState titulo="Equipe sem integrantes" descricao="Complete a equipe quando os instaladores estiverem disponíveis." /> :
      <ul className="divide-y divide-border-subtle">{equipe.integrantes.map(i => <li key={i.usuarioId} className="cronograma-integrante">
        <div><p className="font-medium">{i.nome}</p><p className="cronograma-ajuda">{formatarDataBR(i.dataEntrada)} a {formatarDataBR(i.dataSaida)}</p></div>
        {canEdit && <div className="flex gap-2"><button type="button" disabled={mutacao.isPending || mutacao.incerta} className="min-h-12 px-3 border border-border-subtle rounded-md" onClick={() => { if (!podeEditar()) return; setEdicao(i); setEntrada(i.dataEntrada); setSaida(i.dataSaida); setErro(''); }} aria-label={`Editar datas de ${i.nome}`}>Editar datas</button>
          <button type="button" disabled={mutacao.isPending || mutacao.incerta} className="min-h-12 px-3 text-destructive" onClick={() => { if (!podeEditar()) return; setHoje(formatarDataISO(new Date())); setRemocao(i); setSaidaRemocao(''); setErro(''); }} aria-label={`Remover ou encerrar ${i.nome}`}>Remover / encerrar</button></div>}
      </li>)}</ul>}
    {canEdit && <>
      <form className="cronograma-previstas" onSubmit={e => { e.preventDefault(); if (Number.isSafeInteger(Number(previstas)) && Number(previstas) > 0) void salvar({ tipo: 'previstas', pessoasPrevistas: Number(previstas) }); }}>
        <label htmlFor={nome('previstas')}>Pessoas previstas (obrigatório)</label><input id={nome('previstas')} name="pessoasPrevistas" className={controle} type="number" min="1" step="1" required value={previstas} disabled={mutacao.isPending || mutacao.incerta} onChange={e => setPrevistas(e.target.value)} />
        <button type="submit" disabled={mutacao.isPending || mutacao.incerta} className="min-h-12 px-3 rounded-md border border-border-strong">Salvar pessoas previstas</button>
      </form>
      <form className="space-y-3 border-t border-border-subtle pt-3" onSubmit={e => {
        e.preventDefault();
        if (entrada < p.dataInicio || saida > p.dataFim || entrada > saida || diasUteisCivis(entrada, saida) < 1) { setErro('Informe ao menos um dia útil dentro da programação.'); return; }
        if (edicao) { void salvar({ tipo: 'datas', usuarioId: edicao.usuarioId, dataEntrada: entrada, dataSaida: saida }); return; }
        if (!consulta.isSuccess || consulta.isFetching || !usuarioId) { setErro('Consulte a disponibilidade e escolha um instalador livre.'); return; }
        void salvar({ tipo: 'incluir', usuarioId: Number(usuarioId), dataEntrada: entrada, dataSaida: saida });
      }}>
        <h4 className="font-medium">{edicao ? `Editar datas: ${edicao.nome}` : 'Incluir integrante'}</h4>
        <div className="cronograma-form-datas"><div><label htmlFor={nome('entrada')}>Entrada (obrigatória)</label><input id={nome('entrada')} name="dataEntrada" className={controle} type="date" required min={p.dataInicio} max={p.dataFim} value={entrada} disabled={mutacao.isPending || mutacao.incerta} onChange={e => { setEntrada(e.target.value); setUsuarioId(''); }} /></div>
        <div><label htmlFor={nome('saida')}>Saída (obrigatória)</label><input id={nome('saida')} name="dataSaida" className={controle} type="date" required min={entrada || p.dataInicio} max={p.dataFim} value={saida} disabled={mutacao.isPending || mutacao.incerta} onChange={e => { setSaida(e.target.value); setUsuarioId(''); }} /></div></div>
        {!edicao && <div><label htmlFor={nome('instalador')}>Instalador (obrigatório)</label><select id={nome('instalador')} name="usuarioId" className={controle} required value={usuarioId} disabled={mutacao.isPending || mutacao.incerta || consulta.isFetching || !consulta.isSuccess} onChange={e => setUsuarioId(e.target.value)}>
          <option value="">Selecione um instalador livre</option>{consulta.data?.filter(i => !equipe.integrantes.some(m => m.usuarioId === i.usuarioId)).map(i => <option key={i.usuarioId} value={i.usuarioId} disabled={i.ocupado}>{i.nome} — {i.ocupado ? 'Ocupado' : 'Livre'}</option>)}
        </select></div>}
        {consulta.isLoading && <FeedbackLoading mensagem="Consultando disponibilidade..." />}
        {consulta.isError && <FeedbackErro mensagem="Não foi possível consultar disponibilidade." onTentarNovamente={() => void consulta.refetch()} />}
        <div className="cronograma-indisponibilidades">{consulta.data?.filter(i => i.ocupado).map(i => <p key={i.usuarioId} className="text-xs text-muted-foreground">{i.nome}: {i.ocupacoes.map(o => `Obra ${o.obraId}, ${formatarDataBR(o.dataInicio)} a ${formatarDataBR(o.dataFim)}`).join('; ')}</p>)}</div>
        <div className="flex gap-2"><button type="submit" disabled={mutacao.isPending || mutacao.incerta} className="cronograma-button cronograma-button-primary">{edicao ? 'Salvar datas' : 'Adicionar integrante'}</button>
          {edicao && <button type="button" className="min-h-12 px-3" onClick={() => { setEdicao(null); setEntrada(p.dataInicio); setSaida(p.dataFim); }}>Cancelar edição</button>}</div>
      </form>
      {mutacao.incerta && <div role="alert"><p>A alteração pode ter sido processada. Consulte os dados antes de repetir.</p><button type="button" className="min-h-12 underline" onClick={() => { void mutacao.reconciliar().catch(f => setErro(mensagemEquipe(f))); }}>Consultar equipe novamente</button></div>}
    </>}
    {erro && <p role="alert" className="text-destructive">{erro}</p>}{sucesso && <p role="status">{sucesso}</p>}
    <ConfirmDialog isOpen={Boolean(remocao)} titulo={vinculoIniciado ? 'Encerrar participação' : 'Remover integrante'}
      descricao={vinculoIniciado ? 'Informe a saída para preservar os dias trabalhados.' : 'Antes da entrada o vínculo será removido. Você também pode informar uma saída se o servidor já considerar o vínculo iniciado.'}
      labelConfirmar={vinculoIniciado ? 'Encerrar participação' : 'Remover integrante'} confirmarBloqueado={mutacao.isPending || mutacao.incerta || (vinculoIniciado && !saidaRemocao)}
      onClose={() => { if (!mutacao.isPending) setRemocao(null); }}
      onConfirm={() => { if (remocao && saidaRemocao && (saidaRemocao < remocao.dataEntrada || saidaRemocao > remocao.dataSaida)) { setErro('Informe uma saída dentro da participação.'); return; } if (remocao && (!vinculoIniciado || saidaRemocao)) void salvar({ tipo: 'remover', usuarioId: remocao.usuarioId, dataSaida: saidaRemocao || undefined }); }} conteudo={
      <div className="space-y-2"><label htmlFor={nome('encerrar')}>Data de saída{vinculoIniciado ? ' (obrigatória)' : ' (opcional)'}</label><input id={nome('encerrar')} name="dataSaida" className={controle} type="date" required={vinculoIniciado} min={remocao?.dataEntrada} max={remocao?.dataSaida} value={saidaRemocao} onChange={e => setSaidaRemocao(e.target.value)} />
        {erro && <p role="alert" className="text-destructive">{erro}</p>}</div>
    } />
  </section>;
}
