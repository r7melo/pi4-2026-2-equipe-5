import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useIsMutating, useQueryClient } from '@tanstack/react-query';
import { Plus, Share2 } from 'lucide-react';
import { useAuthStore } from '@/shared/stores/useAuthStore';
import { PageHeader } from '@/shared/components/ui/PageHeader';
import { SegmentedControl } from '@/shared/components/ui/SegmentedControl';
import FeedbackLoading from '@/shared/components/feedback/FeedbackLoading';
import FeedbackErro from '@/shared/components/feedback/FeedbackErro';
import { EmptyState } from '@/shared/components/feedback/EmptyState';
import { SearchInput } from '@/shared/components/ui/SearchInput';
import { useModoDisplay } from '@/shared/contexts/ModoDisplayContext';
import { BotaoModoDisplay } from '@/shared/components/display/BotaoModoDisplay';
import { podeVerModo } from '@/shared/lib/podeVerModo';
import { capturarSessaoOperacional, sessaoOperacionalVigente } from '@/shared/lib/sessaoOperacao';
import { temVinculosParciais } from '@/shared/lib/equipeTemporal';
import { useSessaoCronograma, confirmarConsultaTemporal, mensagemEquipe } from '../hooks/useEquipeTemporal';
import { useOperacoesTemporais } from '../stores/useOperacoesTemporais';
import { useProgramacoes, useReordenarProgramacao } from '../hooks/useProgramacoes';
import { useGanttStore } from '../stores/useGanttStore';
import { useGanttFiltros } from '../hooks/useGanttFiltros';
import { useEquipesOverlays } from '../hooks/useEquipesOverlays';
import { transformarTarefasGantt } from '../lib/transformarTarefasGantt';
import { calcularJanelaProgramacoes } from '../lib/janelaProgramacoes';
import { criarArmazenamentoEstadoVisual } from '../lib/estadoVisualGantt';
import { GanttDhtmlxWrapper } from '../components/GanttDhtmlxWrapper';
import { GanttToolbar } from '../components/GanttToolbar';
import { GanttFilterDrawer } from '../components/GanttFilterDrawer';
import { GanttCompartilharModal } from '../components/GanttCompartilharModal';
import { ProgramarObraModal } from '../components/ProgramarObraModal';
import { ProgramacaoDrawer } from '../components/ProgramacaoDrawer';
import { OcupacaoInstaladores } from '../components/OcupacaoInstaladores';
import type { ObraGanttResumo, MapaHomologacoesGantt } from '../types/visaoCronograma';
import '../components/gantt.css';
import '../components/cronograma-ui.css';

export interface EquipesProps {
  renderizarAcoesObra?: (obraId: number) => ReactNode;
  obras?: ObraGanttResumo[]; carregandoObras?: boolean; mapaHomologacoes?: MapaHomologacoesGantt;
}
export default function Equipes({ obras, carregandoObras = false, mapaHomologacoes, renderizarAcoesObra }: EquipesProps = {}) {
  const modo = useModoDisplay();
  const epoch = modo.lerEpoch();
  const sessao = useSessaoCronograma();
  const cliente = useQueryClient();
  const temporalBloqueado = useOperacoesTemporais(s => s.sessao === sessao && Object.values(s.fases).some(f => f !== 'livre'));
  const temporalIncerta = useOperacoesTemporais(s => s.sessao === sessao && Object.values(s.fases).includes('incerta'));
  const [erroRecuperacao, setErroRecuperacao] = useState('');
  const perfil = useAuthStore(s => s.usuario?.perfil.nomePerfil);
  const canEdit = perfil === 'Administrador' || perfil === 'Engenharia';
  const montado = useRef(true);
  useEffect(() => { montado.current = true; return () => { montado.current = false; }; }, []);
  const podeInteragir = useCallback(() => montado.current && sessaoOperacionalVigente(sessao) && modo.podeInteragir(epoch), [modo, epoch, sessao]);
  const consulta = useProgramacoes();
  const reagendamento = useReordenarProgramacao();
  const [visao, setVisao] = useState('gantt');
  const [aviso, setAviso] = useState('');
  const [dataFoco, setDataFoco] = useState<Date | null>(null);
  const [mostrarGrade, setMostrarGrade] = useState(() => window.innerWidth >= 768);
  const [isDesktop, setIsDesktop] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia('(min-width: 768px)').matches : true
  );
  const buscaInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(min-width: 768px)');
    const sync = () => setIsDesktop(mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== '/' || e.metaKey || e.ctrlKey || e.altKey || modo.ativo || visao !== 'gantt') return;
      const alvo = e.target as HTMLElement | null;
      if (
        alvo &&
        (alvo.tagName === 'INPUT' ||
          alvo.tagName === 'TEXTAREA' ||
          alvo.tagName === 'SELECT' ||
          alvo.isContentEditable)
      ) {
        return;
      }
      e.preventDefault();
      buscaInputRef.current?.focus();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [modo.ativo, visao]);

  const zoom = useGanttStore(s => s.nivelZoom);
  const setZoom = useGanttStore(s => s.setNivelZoom);
  const salvarFiltros = useGanttStore(s => s.salvarFiltros);
  const overlays = useEquipesOverlays(epoch, sessao);
  const filtros = useGanttFiltros({ programacoes: consulta.data, obras, podeUsarInterface: podeInteragir });
  const armazenamento = useMemo(() => criarArmazenamentoEstadoVisual(sessao), [sessao]);
  const mutacoesAtivas = useIsMutating({ mutationKey: ["programacoes"] });
  const mutacaoEmVoo = reagendamento.bloqueado || mutacoesAtivas > 0 || temporalBloqueado;
  const podeEditar = useCallback(() => canEdit && !reagendamento.bloqueado && podeInteragir(), [canEdit, reagendamento.bloqueado, podeInteragir]);
  const janela = useMemo(() => consulta.data?.length ? calcularJanelaProgramacoes(consulta.data) : undefined, [consulta.data]);
  const linhas = useMemo(() => transformarTarefasGantt({ programacoesVisiveis: modo.ativo ? consulta.data : filtros.programacoesFiltradas, obras, equipes: undefined, homologacoesMap: mapaHomologacoes }), [consulta.data, filtros.programacoesFiltradas, obras, mapaHomologacoes, modo.ativo]);
  const instaladores = useMemo(() => [...new Map((consulta.data ?? []).flatMap(p => p.equipe?.integrantes ?? []).map(i => [i.usuarioId, { id: i.usuarioId, nome: i.nome }])).values()], [consulta.data]);
  const selecionada = consulta.data?.find(p => p.id === overlays.tarefaSelecionadaId);
  const aptas = (obras ?? []).filter(o => ['Separado', 'EmAndamento', 'Assistencia'].includes(o.status ?? '') && (o.quantidadePaineis ?? 0) > 0);
  const parcial = (id: number) => temVinculosParciais(consulta.data ?? [], id);
  const aoReordenar = (id: number, inicio: string) => {
    if (!podeEditar() || mutacoesAtivas || temporalBloqueado) return;
    if (parcial(id)) { setAviso('Há participações parciais nesta cadeia. Abra a programação para revisar as datas antes de reagendar.'); return; }
    setAviso(''); reagendamento.mutate({ id, novaDataInicio: inicio });
  };
  const aoReagendar = async (id: number, inicio: string) => {
    if (!podeEditar() || mutacoesAtivas || temporalBloqueado) return null;
    const origem = capturarSessaoOperacional();
    try { const resposta = await reagendamento.mutateAsync({ id, novaDataInicio: inicio }); return sessaoOperacionalVigente(origem) && resposta ? true : null; }
    catch { return sessaoOperacionalVigente(origem) ? false : null; }
  };
  const alternadorVisao = (compactoMobile = false) => (
    <SegmentedControl
      opcoes={[
        { valor: 'gantt', rotulo: compactoMobile ? 'Gantt' : 'Programações' },
        { valor: 'ocupacao', rotulo: 'Ocupação' },
      ]}
      valor={visao}
      onChange={setVisao}
      ariaLabel="Visualização do cronograma"
      tamanho="xs"
    />
  );

  return <div className="flex-1 flex flex-col h-full min-h-0 overflow-hidden">
    <PageHeader
      title="Cronograma de Equipes"
      ocultarMenuLateral={modo.ativo}
      badge={!modo.ativo && isDesktop ? alternadorVisao(false) : undefined}
      extraRow={
        !modo.ativo && !isDesktop ? (
          <div className="w-full flex items-center gap-1.5 pt-1.5 border-t border-border-subtle/60">
            {alternadorVisao(true)}
            {visao === 'gantt' && (
              <SearchInput
                ref={buscaInputRef}
                tamanho="xs"
                className="flex-1 min-w-0"
                valor={filtros.filtros.termoBusca ?? ''}
                onChange={termo => filtros.atualizarFiltros(f => ({ ...f, termoBusca: termo }))}
                placeholder="Buscar obra ou instalador..."
                ariaLabel="Buscar obra ou instalador"
              />
            )}
          </div>
        ) : undefined
      }
    >
      {!modo.ativo && isDesktop && visao === 'gantt' && (
        <SearchInput
          ref={buscaInputRef}
          tamanho="xs"
          className="w-48"
          valor={filtros.filtros.termoBusca ?? ''}
          onChange={termo => filtros.atualizarFiltros(f => ({ ...f, termoBusca: termo }))}
          placeholder="Buscar obra ou instalador (/)"
          ariaLabel="Buscar obra ou instalador"
        />
      )}
      {podeVerModo(perfil) && modo.elegivelParaModo && <BotaoModoDisplay compacto />}
      {!modo.ativo && canEdit && Boolean(consulta.data?.length) && (
        <button
          type="button"
          onClick={() => overlays.setModalCompartilharAberto(true)}
          aria-label="Compartilhar cronograma"
          title="Compartilhar cronograma"
          className="controle-compacto w-7 h-7 inline-flex items-center justify-center rounded-md border border-border-strong bg-surface hover:bg-surface-subtle text-foreground-muted cursor-pointer shrink-0 transition-colors"
        >
          <Share2 className="w-3.5 h-3.5" aria-hidden="true" />
        </button>
      )}
      {!modo.ativo && canEdit && (
        <button
          type="button"
          disabled={mutacaoEmVoo}
          onClick={() => { if (podeEditar()) overlays.setModalNovaAlocacaoAberto(true); }}
          className="controle-compacto h-7 px-2.5 inline-flex items-center gap-1 rounded-md bg-primary hover:bg-primary-hover text-primary-foreground text-xs font-medium cursor-pointer shrink-0 whitespace-nowrap disabled:opacity-50 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" aria-hidden="true" />
          <span>Programar obra</span>
        </button>
      )}
    </PageHeader>
    {!modo.ativo && temporalIncerta && <div role="alert" className="px-3 py-2 bg-warning-light text-warning text-sm">
      Uma alteração pode ter sido processada. Consulte o cronograma para liberar novas escritas.
      <button type="button" className="min-h-12 px-3 underline" onClick={() => { const origem = sessao; void confirmarConsultaTemporal(cliente, origem).then(() => setErroRecuperacao('')).catch(f => { if (sessaoOperacionalVigente(origem)) setErroRecuperacao(mensagemEquipe(f)); }); }}>Consultar cronograma novamente</button>
      {erroRecuperacao && <p>{erroRecuperacao}</p>}
    </div>}
    {visao === 'gantt' && Boolean(consulta.data?.length) && (
      <GanttToolbar
        variante="subbar"
        nivelAtual={zoom}
        onMudarNivel={setZoom}
        onHoje={() => setDataFoco(new Date())}
        mostrarGrade={mostrarGrade}
        onToggleGrade={() => setMostrarGrade(v => !v)}
        dataFiltroInicio={filtros.filtros.dataInicioDe ?? ''}
        onDataInicioChange={
          isDesktop
            ? v => filtros.atualizarFiltros(f => ({ ...f, dataInicioDe: v || undefined }))
            : undefined
        }
        dataFiltroFim={filtros.filtros.dataFimAte ?? ''}
        onDataFimChange={
          isDesktop
            ? v => filtros.atualizarFiltros(f => ({ ...f, dataFimAte: v || undefined }))
            : undefined
        }
        onLimparDatas={
          isDesktop
            ? () => filtros.atualizarFiltros(f => ({ ...f, dataInicioDe: undefined, dataFimAte: undefined }))
            : undefined
        }
        onAbrirFiltros={() => overlays.setDrawerFiltrosAberto(true)}
        totalFiltrosAtivos={filtros.totalFiltrosAtivos}
        modoAtivo={modo.ativo}
      />
    )}
    {!modo.ativo && visao === 'ocupacao' ? <OcupacaoInstaladores key={sessao} /> : <>
      {(aviso || reagendamento.aviso) && <div role="alert" className="px-3 py-2 text-warning bg-warning-light text-sm">{aviso || reagendamento.aviso}{reagendamento.aviso && <button type="button" className="min-h-12 px-3 underline" onClick={() => void reagendamento.recuperar()}>Consultar novamente</button>}</div>}
      {consulta.isLoading || carregandoObras ? <FeedbackLoading mensagem="Carregando cronograma..." /> : consulta.isError ? <FeedbackErro mensagem={consulta.error.message} onTentarNovamente={() => void consulta.refetch()} /> : !consulta.data?.length ? <EmptyState titulo="Nenhuma programação encontrada" descricao="Programe uma obra apta para iniciar o cronograma." /> :
        <div className="flex-1 min-h-0 p-2 relative">
          {!linhas.length ? <EmptyState titulo="Nenhuma alocação encontrada para os filtros aplicados" acao={{ label: 'Limpar filtros', onClick: () => filtros.atualizarFiltros({}) }} /> :
            <GanttDhtmlxWrapper key={modo.ativo ? 'display' : 'operacao'} tarefas={linhas} hojeCivil={modo.ativo ? undefined : filtros.hojeISO} canDrag={canEdit && !modo.ativo && !mutacaoEmVoo} janelaDatas={modo.ativo ? undefined : (janela ?? undefined)} nivelZoom={zoom} focarData={dataFoco} mostrarGrade={mostrarGrade}
              modoAtivo={modo.ativo} epochInteracao={epoch} onReorder={aoReordenar} onSelectTask={modo.ativo ? undefined : id => { if (podeInteragir()) { setAviso(''); overlays.setTarefaSelecionadaId(id); } }} obterEstadoVisual={armazenamento.obterEstadoVisual} salvarEstadoVisual={armazenamento.salvarEstadoVisual} />}
        </div>}
    </>}
    {!modo.ativo && <>
      {canEdit && overlays.modalNovaAlocacaoAberto && <ProgramarObraModal key={sessao} obras={aptas} podeEditar={podeEditar} onClose={() => overlays.setModalNovaAlocacaoAberto(false)} />}
      {selecionada && <ProgramacaoDrawer key={`${sessao}-${selecionada.id}`} programacao={selecionada} programacoes={consulta.data ?? []} obra={obras?.find(o => Number(o.id) === selecionada.obraId)} homologacao={mapaHomologacoes?.[selecionada.obraId]}
        canEdit={canEdit} podeEditar={podeEditar} onClose={() => overlays.setTarefaSelecionadaId(null)} onReagendar={aoReagendar} bloqueado={mutacaoEmVoo} fase={reagendamento.fase} aviso={reagendamento.aviso} renderizarAcoesObra={renderizarAcoesObra} />}
      {canEdit && <GanttCompartilharModal isOpen={overlays.modalCompartilharAberto} podeInteragir={podeEditar} onClose={() => overlays.setModalCompartilharAberto(false)} />}
      <GanttFilterDrawer aberto={overlays.drawerFiltrosAberto} onFechar={() => overlays.setDrawerFiltrosAberto(false)} filtrosAtuais={filtros.filtros} onAplicarFiltros={filtros.atualizarFiltros} equipesDisponiveis={instaladores} onSalvarVisaoFavorita={salvarFiltros} />
    </>}
  </div>;
}
