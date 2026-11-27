import { useCallback, useId, useMemo, useState } from 'react';
import { CalendarDays, Pencil, Trash2, Users } from 'lucide-react';
import type { Programacao } from '@/shared/types/programacoes';
import type { IntegranteTemporal, AlteracaoEquipeTemporal } from '@/shared/types/equipeTemporal';
import { resumirEquipe, diasComFaltaCobertura } from '@/shared/lib/equipeTemporal';
import { diasUteisCivis, hojeCivilSaoPaulo } from '@/shared/lib/datasCivis';
import { dataBRParaIso, isoParaDataBR } from '@/shared/lib/datasBrasileiras';
import { formatarDataBR } from '@/shared/lib/formatters';
import { capturarSessaoOperacional, sessaoOperacionalVigente } from '@/shared/lib/sessaoOperacao';
import { useAuthStore } from '@/shared/stores/useAuthStore';
import { cn } from '@/shared/lib/utils';
import { useAlterarEquipeTemporal, useDisponibilidade, mensagemEquipe } from '../hooks/useEquipeTemporal';
import { ConfirmDialog } from '@/shared/components/feedback/ConfirmDialog';
import FeedbackErro from '@/shared/components/feedback/FeedbackErro';
import FeedbackLoading from '@/shared/components/feedback/FeedbackLoading';
import { EmptyState } from '@/shared/components/feedback/EmptyState';
import { ComboboxPesquisavel, type OpcaoCombobox } from '@/shared/components/ui/ComboboxPesquisavel';
import { DateInputBR } from '@/shared/components/ui/DateInputBR';
import { Badge } from '@/shared/components/ui/Badge';
import { Button } from '@/shared/components/ui/Button';
import { IconActionButton } from '@/shared/components/ui/IconActionButton';
import { AvatarIniciais } from '@/shared/components/ui/AvatarIniciais';

export interface PainelEquipeTemporalProps {
  programacao: Programacao | null;
  canEdit: boolean;
  podeEditar?: () => boolean;
  variante?: 'cronograma' | 'kanban';
}

export function PainelEquipeTemporal({
  programacao: p,
  canEdit,
  podeEditar,
  variante = 'cronograma',
}: PainelEquipeTemporalProps) {
  const prefixo = useId();
  const [previstas, setPrevistas] = useState(String(p?.equipe?.pessoasPrevistas ?? 1));
  const [usuarioId, setUsuarioId] = useState('');
  const [entradaTexto, setEntradaTexto] = useState(() => isoParaDataBR(p?.dataInicio));
  const [saidaTexto, setSaidaTexto] = useState(() => isoParaDataBR(p?.dataFim));
  const [edicao, setEdicao] = useState<IntegranteTemporal | null>(null);
  const [remocao, setRemocao] = useState<IntegranteTemporal | null>(null);
  const [saidaRemocaoTexto, setSaidaRemocaoTexto] = useState('');
  const [erro, setErro] = useState('');
  const [hoje, setHoje] = useState(() => hojeCivilSaoPaulo());
  const [sucesso, setSucesso] = useState('');

  const verificarPermissao = useCallback(() => {
    if (podeEditar) return podeEditar();
    const perfil = useAuthStore.getState().usuario?.perfil?.nomePerfil;
    return canEdit && (perfil === 'Administrador' || perfil === 'Engenharia');
  }, [podeEditar, canEdit]);

  const mutacao = useAlterarEquipeTemporal(p?.id ?? 0, verificarPermissao);

  const entrada = dataBRParaIso(entradaTexto) ?? '';
  const saida = dataBRParaIso(saidaTexto) ?? '';
  const saidaRemocao = dataBRParaIso(saidaRemocaoTexto) ?? '';

  const equipe = p?.equipe;
  const consulta = useDisponibilidade(
    entrada,
    saida,
    Boolean(p && equipe && canEdit && entrada && saida && entrada <= saida)
  );

  const opcoesInstaladores = useMemo<OpcaoCombobox[]>(() => {
    if (!consulta.data || !equipe) return [];
    return consulta.data
      .filter(i => !equipe.integrantes.some(m => m.usuarioId === i.usuarioId))
      .map(i => ({
        valor: String(i.usuarioId),
        rotulo: i.nome,
        badge: i.ocupado ? 'Ocupado' : 'Livre',
        badgeVariante: i.ocupado ? 'warning' : 'success',
        desabilitada: i.ocupado,
        subtitulo: i.ocupado && i.ocupacoes.length > 0
          ? i.ocupacoes.map(o => `${formatarDataBR(o.dataInicio)} a ${formatarDataBR(o.dataFim)}`).join(' · ')
          : undefined,
      }));
  }, [consulta.data, equipe]);

  const nome = (campo: string) => `${prefixo}-${campo}`;
  const isKanban = variante === 'kanban';

  if (!p) {
    return (
      <section
        className={cn('space-y-2.5 text-xs', isKanban && 'pt-3 border-t border-border-subtle')}
        aria-labelledby={nome('titulo')}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-muted-foreground" aria-hidden="true" />
            <h3 id={nome('titulo')} className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Equipe da programação
            </h3>
          </div>
          <Badge>Sem programação</Badge>
        </div>
        <p className="text-xs text-muted-foreground rounded-lg bg-surface-subtle px-3.5 py-2.5">
          Nenhuma equipe temporal vinculada no cronograma.
        </p>
      </section>
    );
  }

  if (!equipe) return <FeedbackErro mensagem="Equipe temporal não informada pelo servidor." />;
  const resumo = resumirEquipe(equipe, p.dataInicio, p.dataFim);
  const diasFaltantes = diasComFaltaCobertura(equipe, p.dataInicio, p.dataFim);
  const vinculoIniciado = remocao ? hoje >= remocao.dataEntrada : false;
  const equipeCompleta = resumo.faltantes === 0 && resumo.minima >= equipe.pessoasPrevistas;

  async function salvar(alteracao: AlteracaoEquipeTemporal) {
    const sessao = capturarSessaoOperacional();
    setErro(''); setSucesso('');
    try {
      if (!await mutacao.salvar(alteracao)) return;
      if (!sessaoOperacionalVigente(sessao) || !verificarPermissao()) return;
      setSucesso('Equipe atualizada.'); setEdicao(null); setUsuarioId(''); setRemocao(null);
    } catch (falha) {
      if (sessaoOperacionalVigente(sessao) && verificarPermissao()) { setErro(mensagemEquipe(falha)); void consulta.refetch(); }
    }
  }

  const campoDataClass =
    'w-full h-9 rounded-lg border border-border-subtle bg-surface-subtle focus:bg-surface px-2.5 text-xs tabular-nums text-foreground disabled:opacity-60';

  return <section className={cn('space-y-3 text-xs', isKanban && 'pt-3 border-t border-border-subtle')} aria-labelledby={nome('titulo')}>
    <div className="flex items-center justify-between gap-2">
      <div className="flex items-center gap-1.5">
        <Users className="w-3.5 h-3.5 text-muted-foreground" aria-hidden="true" />
        <h3 id={nome('titulo')} className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Equipe da programação
        </h3>
      </div>
      <Badge
        variante={equipeCompleta ? 'success' : 'warning'}
        className="tabular-nums"
      >
        {resumo.vinculadas}/{equipe.pessoasPrevistas} vinculadas
      </Badge>
    </div>

    <p className="text-xs text-muted-foreground">
      Cobertura mínima: <strong className="font-medium text-foreground">{resumo.minima}</strong> · Faltam até <strong className="font-medium text-foreground">{resumo.faltantes}</strong> · Esforço útil: <strong className="font-medium text-foreground">{resumo.esforcoUtil} pessoa-dia</strong>
      {resumo.esforcoUtil !== equipe.pessoaDia && ` (servidor informou ${equipe.pessoaDia})`}
    </p>

    {diasFaltantes.length > 0 && (
      <div
        className="rounded-lg border border-warning-border bg-warning-light/60 px-2.5 py-2 space-y-1.5"
        title={diasFaltantes.map(d => `${formatarDataBR(d.data)} (-${d.faltantes})`).join(' · ')}
      >
        <p className="text-[11px] font-medium text-warning">
          Dias úteis sem cobertura completa ({diasFaltantes.length})
        </p>
        <div className="flex flex-wrap gap-1">
          {diasFaltantes.slice(0, 8).map(d => (
            <span
              key={d.data}
              className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-medium tabular-nums bg-surface border border-warning-border text-warning"
            >
              {formatarDataBR(d.data).slice(0, 5)} (-{d.faltantes})
            </span>
          ))}
          {diasFaltantes.length > 8 && (
            <span className="inline-flex items-center px-1.5 py-0.5 text-[11px] font-medium text-warning tabular-nums">
              +{diasFaltantes.length - 8} dias
            </span>
          )}
        </div>
      </div>
    )}

    {equipe.integrantes.length === 0 ? <EmptyState titulo="Equipe sem integrantes" descricao="Complete a equipe quando os instaladores estiverem disponíveis." /> :
      <ul className="rounded-lg bg-surface-subtle border border-border-subtle divide-y divide-border-subtle">
        {equipe.integrantes.map(i => {
          const encerrada = i.dataSaida < hoje;
          return (
          <li key={i.usuarioId} className={cn('px-3 py-2.5 flex items-center justify-between gap-3', encerrada && 'opacity-75')}>
            <div className="flex items-center gap-2.5 min-w-0">
              <AvatarIniciais nome={i.nome} fallback="?" letras={1} size="sm" tone="surface" />
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 min-w-0">
                  <p className="text-xs font-medium text-foreground truncate">{i.nome}</p>
                  {encerrada && (
                    <Badge variante="neutral" tamanho="xs" comBorda className="shrink-0">
                      Encerrada
                    </Badge>
                  )}
                </div>
                <p className="text-[11px] text-muted-foreground tabular-nums flex items-center gap-1">
                  <CalendarDays className="w-3 h-3 shrink-0" aria-hidden="true" />
                  <span>{formatarDataBR(i.dataEntrada)} a {formatarDataBR(i.dataSaida)}</span>
                </p>
              </div>
            </div>
            {canEdit && (
              <div className="flex items-center gap-1 shrink-0">
                <IconActionButton
                  size="md"
                  disabled={mutacao.isPending || mutacao.incerta}
                  onClick={() => {
                    if (!verificarPermissao()) return;
                    setEdicao(i);
                    setEntradaTexto(isoParaDataBR(i.dataEntrada));
                    setSaidaTexto(isoParaDataBR(i.dataSaida));
                    setErro('');
                  }}
                  label={`Editar datas de ${i.nome}`}
                  title="Editar datas"
                >
                  <Pencil className="w-3.5 h-3.5" aria-hidden="true" />
                </IconActionButton>
                <IconActionButton
                  size="md"
                  tone="destructive"
                  disabled={mutacao.isPending || mutacao.incerta}
                  onClick={() => {
                    if (!verificarPermissao()) return;
                    setHoje(hojeCivilSaoPaulo());
                    setRemocao(i);
                    setSaidaRemocaoTexto('');
                    setErro('');
                  }}
                  label={`Remover ou encerrar ${i.nome}`}
                  title="Remover ou encerrar"
                >
                  <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                </IconActionButton>
              </div>
            )}
          </li>
          );
        })}
      </ul>}

    {canEdit && <>
      <form className="flex items-end gap-2 pt-1" onSubmit={e => { e.preventDefault(); if (Number.isSafeInteger(Number(previstas)) && Number(previstas) > 0) void salvar({ tipo: 'previstas', pessoasPrevistas: Number(previstas) }); }}>
        <div className="flex-1 min-w-0">
          <label htmlFor={nome('previstas')} className="block text-[11px] font-medium text-muted-foreground mb-1">
            Pessoas previstas
          </label>
          <input id={nome('previstas')} name="pessoasPrevistas" className={campoDataClass} type="number" min="1" step="1" required value={previstas} disabled={mutacao.isPending || mutacao.incerta} onChange={e => setPrevistas(e.target.value)} />
        </div>
        <Button
          type="submit"
          variant="outline"
          size="sm"
          disabled={mutacao.isPending || mutacao.incerta}
          className="h-9 text-foreground bg-surface hover:bg-muted border-border-subtle shadow-none shrink-0"
        >
          Salvar pessoas previstas
        </Button>
      </form>

      <form className="space-y-2.5 border-t border-border-subtle pt-3" onSubmit={e => {
        e.preventDefault();
        if (!entrada || !saida || entrada < p.dataInicio || saida > p.dataFim || entrada > saida || diasUteisCivis(entrada, saida) < 1) {
          setErro(`Informe Entrada e Saída válidas (dd/mm/aaaa), com ao menos um dia útil entre ${formatarDataBR(p.dataInicio)} e ${formatarDataBR(p.dataFim)}.`);
          return;
        }
        if (edicao) { void salvar({ tipo: 'datas', usuarioId: edicao.usuarioId, dataEntrada: entrada, dataSaida: saida }); return; }
        if (!consulta.isSuccess || consulta.isFetching || !usuarioId) { setErro('Consulte a disponibilidade e escolha um instalador livre.'); return; }
        void salvar({ tipo: 'incluir', usuarioId: Number(usuarioId), dataEntrada: entrada, dataSaida: saida });
      }}>
        <p className="text-xs font-semibold text-foreground">{edicao ? `Editar datas: ${edicao.nome}` : 'Incluir integrante'}</p>
        <div className="grid grid-cols-2 gap-2">
          <div className="min-w-0">
            <label htmlFor={nome('entrada')} className="block text-[11px] font-medium text-muted-foreground mb-1">Entrada</label>
            <DateInputBR
              id={nome('entrada')}
              name="dataEntrada"
              tamanho="md"
              required
              valor={entradaTexto}
              disabled={mutacao.isPending || mutacao.incerta}
              onChange={valor => { setEntradaTexto(valor); setUsuarioId(''); setErro(''); }}
            />
          </div>
          <div className="min-w-0">
            <label htmlFor={nome('saida')} className="block text-[11px] font-medium text-muted-foreground mb-1">Saída</label>
            <DateInputBR
              id={nome('saida')}
              name="dataSaida"
              tamanho="md"
              required
              valor={saidaTexto}
              disabled={mutacao.isPending || mutacao.incerta}
              onChange={valor => { setSaidaTexto(valor); setUsuarioId(''); setErro(''); }}
            />
          </div>
        </div>
        {!edicao && <div>
          <label htmlFor={nome('instalador')} className="block text-[11px] font-medium text-muted-foreground mb-1">Instalador</label>
          <ComboboxPesquisavel
            id={nome('instalador')}
            listboxAriaLabel="Instaladores disponíveis"
            placeholder={entrada && saida ? 'Pesquisar instalador...' : 'Informe Entrada e Saída válidas'}
            opcoes={opcoesInstaladores}
            valorSelecionado={usuarioId}
            direcao="cima"
            compacto={false}
            desabilitado={mutacao.isPending || mutacao.incerta || consulta.isFetching || !consulta.isSuccess}
            onSelecionar={val => { setUsuarioId(val); setErro(''); }}
          />
        </div>}
        {consulta.isLoading && <FeedbackLoading mensagem="Consultando disponibilidade..." />}
        {consulta.isError && <FeedbackErro mensagem="Não foi possível consultar disponibilidade." onTentarNovamente={() => void consulta.refetch()} />}
        <div className="flex items-center gap-2">
          <Button
            type="submit"
            size="sm"
            disabled={mutacao.isPending || mutacao.incerta}
            className="h-9 px-3.5 font-semibold shadow-none"
          >
            {edicao ? 'Salvar datas' : 'Adicionar integrante'}
          </Button>
          {edicao && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-9 text-foreground-secondary border-border-subtle hover:bg-surface-subtle shadow-none"
              onClick={() => {
                setEdicao(null);
                setEntradaTexto(isoParaDataBR(p.dataInicio));
                setSaidaTexto(isoParaDataBR(p.dataFim));
                setErro('');
              }}
            >
              Cancelar edição
            </Button>
          )}
        </div>
      </form>
      {mutacao.incerta && <div role="alert" className="text-xs text-warning space-y-1"><p>A alteração pode ter sido processada. Consulte os dados antes de repetir.</p><button type="button" className="underline cursor-pointer" onClick={() => { void mutacao.reconciliar().catch(f => setErro(mensagemEquipe(f))); }}>Consultar equipe novamente</button></div>}
    </>}
    {erro && <p role="alert" className="text-xs text-destructive font-medium">{erro}</p>}
    {sucesso && <p role="status" className="text-xs text-success font-medium">{sucesso}</p>}
    <ConfirmDialog
      isOpen={Boolean(remocao)}
      titulo={vinculoIniciado ? 'Encerrar participação' : 'Remover integrante'}
      descricao={vinculoIniciado ? 'Informe a saída para preservar os dias trabalhados.' : 'Antes da entrada o vínculo será removido. Você também pode informar uma saída se o servidor já considerar o vínculo iniciado.'}
      labelConfirmar={vinculoIniciado ? 'Encerrar participação' : 'Remover integrante'}
      confirmarBloqueado={mutacao.isPending || mutacao.incerta || (vinculoIniciado && !saidaRemocao)}
      onClose={() => { if (!mutacao.isPending) setRemocao(null); }}
      onConfirm={() => {
        if (saidaRemocaoTexto.trim() && !saidaRemocao) {
          setErro('Informe uma data de saída válida (dd/mm/aaaa).');
          return;
        }
        if (remocao && saidaRemocao && (saidaRemocao < remocao.dataEntrada || saidaRemocao > remocao.dataSaida)) {
          setErro(`Informe uma saída entre ${formatarDataBR(remocao.dataEntrada)} e ${formatarDataBR(remocao.dataSaida)}.`);
          return;
        }
        if (remocao && (!vinculoIniciado || saidaRemocao)) {
          void salvar({ tipo: 'remover', usuarioId: remocao.usuarioId, dataSaida: saidaRemocao || undefined });
        }
      }}
      conteudo={
        <div className="space-y-2 text-left">
          <label htmlFor={nome('encerrar')} className="block text-xs font-medium text-foreground-secondary">
            Data de saída{vinculoIniciado ? ' (obrigatória)' : ' (opcional)'}
          </label>
          <DateInputBR
            id={nome('encerrar')}
            name="dataSaida"
            tamanho="md"
            required={vinculoIniciado}
            valor={saidaRemocaoTexto}
            onChange={valor => { setSaidaRemocaoTexto(valor); setErro(''); }}
          />
          {erro && <p role="alert" className="text-xs text-destructive">{erro}</p>}
        </div>
      }
    />
  </section>;
}
