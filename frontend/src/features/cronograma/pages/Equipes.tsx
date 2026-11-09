import {
  capturarSessaoOperacional,
  deveExibirErroLocal,
  assinarSessaoOperacional,
  sessaoOperacionalVigente,
} from "@/shared/lib/sessaoOperacao";
import {
  useState,
  useMemo,
  useCallback,
  useLayoutEffect,
  useRef,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { useGanttStore } from "@/features/cronograma/stores/useGanttStore";
import { useAuthStore } from "@/features/auth/stores/useAuthStore";
import { GanttDhtmlxWrapper } from "@/features/cronograma/components/GanttDhtmlxWrapper";
import type { GanttTask } from "@/features/cronograma/types/gantt";
import {
  criarArmazenamentoEstadoVisual,
} from "@/features/cronograma/lib/estadoVisualGantt";
import { GanttToolbar } from "@/features/cronograma/components/GanttToolbar";
import { GanttKpiBar } from "@/features/cronograma/components/GanttKpiBar";
import { GanttFilterDrawer } from "@/features/cronograma/components/GanttFilterDrawer";
import { GanttNovaAlocacaoModal } from "@/features/cronograma/components/GanttNovaAlocacaoModal";
import { GanttNovaEquipeModal } from "@/features/cronograma/components/GanttNovaEquipeModal";
import { GanttCompartilharModal } from "@/features/cronograma/components/GanttCompartilharModal";
import {
  GanttTaskDrawer,
  type TarefaDetalhes,
} from "@/features/cronograma/components/GanttTaskDrawer";
import {
  useProgramacoes,
  useReordenarProgramacao,
  useCriarProgramacao,
  useDeletarProgramacao,
} from "@/features/cronograma/hooks/useProgramacoes";
import { useObras, useHomologacoesObras } from "@/features/obras/hooks/useObras";
import { toast } from "sonner";
import { useEquipes } from "@/features/cronograma/hooks/useEquipes";
import { PageHeader } from "@/shared/components/ui/PageHeader";
import FeedbackLoading from "@/shared/components/feedback/FeedbackLoading";
import FeedbackErro from "@/shared/components/feedback/FeedbackErro";
import { EmptyState } from "@/shared/components/feedback/EmptyState";
import { CalendarX2, Search, AlertTriangle } from "lucide-react";
import { calcularJanelaProgramacoes } from "@/features/cronograma/lib/janelaProgramacoes";
import { diasUteisCivis } from "@/shared/lib/datasCivis";
import { obterConflitosEquipe } from "@/features/cronograma/lib/ganttCalculos";
import { useModoDisplay } from "@/shared/contexts/ModoDisplayContext";
import { podeVerModo } from "@/shared/lib/podeVerModo";
import { BotaoModoDisplay } from "@/shared/components/display/BotaoModoDisplay";
import { transformarTarefasGantt } from "@/features/cronograma/lib/transformarTarefasGantt";
import { useGanttFiltros } from "@/features/cronograma/hooks/useGanttFiltros";
import { useEquipesOverlays } from "@/features/cronograma/hooks/useEquipesOverlays";
import "@/features/cronograma/components/gantt.css";

export default function Equipes({
  renderizarAcoesObra,
}: {
  renderizarAcoesObra?: (obraId: number) => ReactNode;
} = {}) {
  const { ativo: modoAtivo, elegivelParaModo, alturaSelo, lerEpoch, podeInteragir } = useModoDisplay();
  const epochRender = lerEpoch();
  const sessaoRender = useSyncExternalStore(assinarSessaoOperacional, capturarSessaoOperacional, capturarSessaoOperacional);
  const { obterEstadoVisual, salvarEstadoVisual } = useMemo(
    () => criarArmazenamentoEstadoVisual(sessaoRender),
    [sessaoRender]
  );

  const nivelZoom = useGanttStore((s) => s.nivelZoom);
  const setNivelZoom = useGanttStore((s) => s.setNivelZoom);
  const salvarFiltrosNaStore = useGanttStore((s) => s.salvarFiltros);

  const [dataFoco, setDataFoco] = useState<Date | null>(null);

  const [mostrarGrade, setMostrarGrade] = useState(() => {
    if (typeof window !== "undefined") {
      return window.innerWidth >= 768;
    }
    return true;
  });

  const {
    drawerFiltrosAberto,
    setDrawerFiltrosAberto,
    modalNovaAlocacaoAberto,
    setModalNovaAlocacaoAberto,
    modalNovaEquipeAberto,
    setModalNovaEquipeAberto,
    modalCompartilharAberto,
    setModalCompartilharAberto,
    tarefaSelecionadaId,
    setTarefaSelecionadaId,
  } = useEquipesOverlays(epochRender, sessaoRender);
  const nomePerfil = useAuthStore((s) => s.usuario?.perfil?.nomePerfil);
  const canEdit =
    nomePerfil === "Administrador" || nomePerfil === "Engenharia";
  const {
    mutate: reordenar,
    mutateAsync: reordenarAsync,
    bloqueado: reagendamentoBloqueado,
    fase: reagendamentoFase,
    aviso: avisoReagendamento,
    recuperar: recuperarReagendamento,
  } = useReordenarProgramacao();
  const canDrag = canEdit && !modoAtivo && !reagendamentoBloqueado;
  const canEditRef = useRef(canEdit);
  const montadoRef = useRef(false);
  useLayoutEffect(() => { canEditRef.current = canEdit; }, [canEdit]);
  useLayoutEffect(() => {
    montadoRef.current = true;
    return () => { montadoRef.current = false; };
  }, []);
  const podeUsarInterface = useCallback(
    () => montadoRef.current && podeInteragir(epochRender),
    [podeInteragir, epochRender]
  );
  const podeEditar = useCallback(
    () => canEditRef.current && podeUsarInterface(),
    [podeUsarInterface]
  );


  const {
    data: programacoes,
    isLoading: loadingProg,
    isError: erroProg,
    error: errorProg,
    refetch: refetchProg,
  } = useProgramacoes();
  const { data: obras, isLoading: loadingObras } = useObras({ pageSize: 1000 });
  const { data: equipes, isLoading: loadingEquipes } = useEquipes();

  const obraIdsUnicos = useMemo(() => {
    if (!programacoes) return [];
    return Array.from(new Set(programacoes.map((p) => p.obraId)));
  }, [programacoes]);

  const { data: homologacoesMap } = useHomologacoesObras(obraIdsUnicos);

  const { janelaDatas, erroValidacaoJanela } = useMemo(() => {
    if (!programacoes || programacoes.length === 0) {
      return { janelaDatas: null, erroValidacaoJanela: null };
    }
    try {
      const janela = calcularJanelaProgramacoes(programacoes);
      return { janelaDatas: janela, erroValidacaoJanela: null };
    } catch (err) {
      return {
        janelaDatas: null,
        erroValidacaoJanela:
          err instanceof Error ? err.message : "Dados de programação inválidos.",
      };
    }
  }, [programacoes]);

  const temBaseValida = Array.isArray(programacoes) && !erroValidacaoJanela;
  const baseVazia = temBaseValida && programacoes.length === 0;
  const reconciliacaoPendente = Boolean(
    reagendamentoFase !== "livre"
  );
  const exibirErroProg = Boolean(
    (erroProg && !(reconciliacaoPendente && temBaseValida)) || erroValidacaoJanela
  );

  const { mutateAsync: criarAlocacao, isPending: criandoAlocacao } =
    useCriarProgramacao();
  const { mutateAsync: deletarAlocacao } = useDeletarProgramacao();

  const isLoading = loadingProg || loadingObras || loadingEquipes;
  const listaObras = obras?.itens;

  const obrasElegiveis = useMemo(() => {
    if (!listaObras) return [];
    return listaObras.filter((o) => o.status !== "Concluido");
  }, [listaObras]);


  const {
    filtros,
    atualizarFiltros,
    totalFiltrosAtivos,
    programacoesFiltradas,
  } = useGanttFiltros({
    programacoes,
    obras: listaObras,
    equipes,
    podeUsarInterface,
  });

  const programacoesVisiveis = useMemo(
    () => (modoAtivo ? programacoes ?? [] : programacoesFiltradas),
    [modoAtivo, programacoes, programacoesFiltradas]
  );

  const dadosFormatados: GanttTask[] = useMemo(() => {
    return transformarTarefasGantt({
      programacoesVisiveis,
      equipes,
      obras: listaObras,
      homologacoesMap,
    });
  }, [programacoesVisiveis, equipes, listaObras, homologacoesMap]);
  const tarefaDrawer = useMemo<TarefaDetalhes | null>(() => {
    if (!tarefaSelecionadaId) return null;
    const prog = programacoes?.find((p) => p.id === tarefaSelecionadaId);
    if (!prog) return null;

    const obra = listaObras?.find((o) => Number(o.id) === Number(prog.obraId));
    const equipe = equipes?.find((e) => e.id === prog.equipeId);

    return {
      id: prog.id,
      obraId: prog.obraId,
      equipeId: prog.equipeId,
      nomeEquipe: equipe?.nome || `Equipe ${prog.equipeId}`,
      nomeCliente: obra?.clienteNome || `Obra ID: ${prog.obraId}`,
      dataInicio: prog.dataInicio,
      dataFim: prog.dataFim,
      duracaoDias: diasUteisCivis(prog.dataInicio, prog.dataFim),
      paineis: obra?.quantidadePaineis,
      obra,
    };
  }, [tarefaSelecionadaId, programacoes, listaObras, equipes]);

  const handleReorder = (id: number, novaData: string) => {
    if (!podeEditar() || reagendamentoBloqueado) return;
    reordenar({ id, novaDataInicio: novaData });
  };

  const handleReagendar = useCallback(
    async (id: number, novaDataInicio: string): Promise<boolean | null> => {
      if (!podeEditar() || reagendamentoBloqueado) return null;
      const sessaoAntes = capturarSessaoOperacional();
      try {
        const resposta = await reordenarAsync({ id, novaDataInicio });
        if (!sessaoOperacionalVigente(sessaoAntes)) return null;
        return resposta !== null ? true : null;
      } catch {
        if (!sessaoOperacionalVigente(sessaoAntes)) return null;
        return false;
      }
    },
    [podeEditar, reagendamentoBloqueado, reordenarAsync]
  );

  const obterFocoRetorno = useCallback((): HTMLElement | null => {
    if (tarefaSelecionadaId !== null) {
      const elementoTarefa = document.querySelector<HTMLElement>(
        `button.gantt-btn-alocacao[data-task-id="${tarefaSelecionadaId}"]`
      );
      if (elementoTarefa && elementoTarefa.isConnected) {
        return elementoTarefa;
      }
    }
    const fallback = document.querySelector<HTMLElement>(".gantt-toolbar button");
    if (fallback && fallback.isConnected) {
      return fallback;
    }
    return null;
  }, [tarefaSelecionadaId]);

  const handleHoje = () => {
    setDataFoco(new Date());
  };

  const handleSelectTask = (taskId: number) => {
    if (!podeUsarInterface()) return;
    setTarefaSelecionadaId(taskId);
  };

  const handleConfirmarAlocacao = async (dados: {
    obraId: number;
    equipeId: number;
    dataInicio: string;
    dataFim?: string;
  }) => {
    if (!podeEditar()) return;
    await criarAlocacao(dados);
  };

  const handleDesalocar = (id: number) => {
    if (!podeEditar()) return;
    void deletarAlocacao(id).catch(() => undefined);
  };

  const handleMudarEquipe = async (id: number, novaEquipeId: number) => {
    if (!podeEditar()) return;
    const progAtual = programacoes?.find((p) => p.id === id);
    if (!progAtual) return;

    const novaEquipe = equipes?.find((e) => e.id === novaEquipeId);
    const nomeNovaEquipe = novaEquipe?.nome || `Equipe ${novaEquipeId}`;

    // 1. Verificação prévia de conflito: impede perda da alocação existente caso haja sobreposição
    const conflitos = obterConflitosEquipe(
      novaEquipeId,
      progAtual.dataInicio,
      progAtual.dataFim,
      programacoes || [],
      id // ignora a própria tarefa
    );

    if (conflitos.length > 0) {
      toast.error(
        `A ${nomeNovaEquipe} já possui a Obra #${conflitos[0].programacao.obraId} agendada de ${conflitos[0].periodoFormatado}. Reatribuição cancelada.`
      );
      return;
    }

    try {
      const sessao = capturarSessaoOperacional();
      await deletarAlocacao(id, undefined, sessao);
      const novaProg = await criarAlocacao({
        obraId: progAtual.obraId,
        equipeId: novaEquipeId,
        dataInicio: progAtual.dataInicio,
        dataFim: progAtual.dataFim,
      }, undefined, sessao);

      if (podeEditar()) setTarefaSelecionadaId(novaProg.id);
      toast.success(`Obra reatribuída com sucesso para ${nomeNovaEquipe}!`);
    } catch (erro) {
      if (!deveExibirErroLocal(erro)) return;
      toast.error("Erro ao reatribuir equipe para a obra.");
    }
  };

  const handleImprimir = () => {
    if (!podeUsarInterface()) return;
    window.print();
  };

  return (
    <div className="flex-1 flex flex-col h-full min-h-0 overflow-hidden"
      style={modoAtivo ? { paddingBottom: alturaSelo } : undefined}>
      <PageHeader title="Cronograma de Equipes"
        subtitle="Gestão de alocações e cronograma de obras (Gantt)"
        ocultarMenuLateral={modoAtivo}>
        {!isLoading && !exibirErroProg && temBaseValida && !baseVazia && (
          <GanttToolbar nivelAtual={nivelZoom} onMudarNivel={setNivelZoom}
            onHoje={handleHoje} mostrarGrade={mostrarGrade}
            onToggleGrade={() => setMostrarGrade((prev) => !prev)}
            onImprimir={handleImprimir}
            onAbrirCompartilhar={canEdit ? () => { if (podeEditar()) setModalCompartilharAberto(true); } : undefined}
            onAbrirFiltros={() => { if (podeUsarInterface()) setDrawerFiltrosAberto(true); }}
            totalFiltrosAtivos={totalFiltrosAtivos} modoAtivo={modoAtivo} />
        )}
        {podeVerModo(nomePerfil) && elegivelParaModo && <BotaoModoDisplay className="size-7.5 [&_svg]:size-3.5" />}
      </PageHeader>

      {isLoading && !temBaseValida ? (
        <div className="flex-1 flex items-center justify-center bg-background-app">
          <FeedbackLoading mensagem="Carregando cronograma..." />
        </div>
      ) : exibirErroProg ? (
        <div className="flex-1 flex items-center justify-center bg-background-app p-4">
          <FeedbackErro mensagem={erroValidacaoJanela || errorProg?.message || "Ocorreu um erro ao carregar o cronograma."}
            onTentarNovamente={() => void refetchProg()} />
        </div>
      ) : baseVazia ? (
        <div className="flex-1 flex items-center justify-center bg-background-app p-4">
          <EmptyState icone={CalendarX2} titulo="Nenhuma programação encontrada"
            descricao={modoAtivo ? undefined : "Aloque equipes a obras cadastradas para inicializar o cronograma."}
            acao={canEdit && !modoAtivo ? {
              label: "Nova Alocação",
              onClick: () => { if (podeEditar()) setModalNovaAlocacaoAberto(true); },
            } : undefined} />
        </div>
      ) : (
      <div className="flex-1 flex flex-col gap-2 w-full min-h-0 bg-background-app p-2 md:p-3 overflow-hidden">
        {avisoReagendamento && (
          <div
            role="alert"
            className="p-3 bg-warning-light border border-warning-border rounded-xl flex items-center justify-between gap-3 text-xs text-warning shrink-0"
          >
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-warning" />
              <span>{avisoReagendamento}</span>
            </div>
            <button
              type="button"
              onClick={() => {
                if (reagendamentoFase === "recuperacao") {
                  void recuperarReagendamento();
                } else {
                  void refetchProg();
                }
              }}
              className="px-3 py-1.5 font-semibold text-xs bg-surface border border-border-subtle rounded-lg hover:bg-surface-subtle text-foreground-secondary transition-colors cursor-pointer shrink-0"
            >
              Consultar novamente
            </button>
          </div>
        )}

        {/* Barra Rápida conectada 100% à Fonte Única de Verdade 'filtros': */}
        {!modoAtivo && (
        <GanttKpiBar
          termoBusca={filtros.termoBusca || ""}
          onBuscaChange={(termo) =>
            atualizarFiltros((prev) => ({ ...prev, termoBusca: termo || undefined }))
          }
          equipeSelecionada={filtros.equipeId ?? null}
          onEquipeChange={(equipeId) =>
            atualizarFiltros((prev) => ({ ...prev, equipeId: equipeId ?? undefined }))
          }
          equipes={equipes || []}
          canEdit={canEdit}
          onNovaAlocacao={() => { if (podeEditar()) setModalNovaAlocacaoAberto(true); }}
          onNovaEquipe={() => { if (podeEditar()) setModalNovaEquipeAberto(true); }}
          dataFiltroInicio={filtros.dataInicioDe || ""}
          onDataInicioChange={(val) =>
            atualizarFiltros((prev) => ({ ...prev, dataInicioDe: val || undefined }))
          }
          dataFiltroFim={filtros.dataFimAte || ""}
          onDataFimChange={(val) =>
            atualizarFiltros((prev) => ({ ...prev, dataFimAte: val || undefined }))
          }
          onLimparDatas={() =>
            atualizarFiltros((prev) => ({
              ...prev,
              dataInicioDe: undefined,
              dataFimAte: undefined,
              dataInicioAte: undefined,
              dataFimDe: undefined,
            }))
          }
        />
        )}

        {/* Container do Gantt com Empty State unificado: */}
        <div className="relative flex-1 bg-surface rounded-xl shadow-xs border border-border-subtle overflow-hidden flex flex-col min-h-0">
          {!modoAtivo && programacoesVisiveis.length === 0 && (
            <EmptyState
              className="absolute inset-0 z-20 bg-surface/95 backdrop-blur-xs flex items-center justify-center animate-fade-in"
              icone={Search}
              titulo="Nenhuma alocação encontrada para os filtros aplicados"
              descricao="Tente alterar os filtros na gaveta lateral ou na barra rápida."
              acao={{
                label: "Limpar Todos os Filtros",
                onClick: () => atualizarFiltros({}),
              }}
            />
          )}

          <GanttDhtmlxWrapper
            key={modoAtivo ? "display" : "operacao"}
            tarefas={dadosFormatados}
            canDrag={canDrag}
            janelaDatas={modoAtivo ? undefined : (janelaDatas ?? undefined)}
            epochInteracao={epochRender}
            nivelZoom={nivelZoom}
            focarData={dataFoco}
            mostrarGrade={mostrarGrade}
            onReorder={handleReorder}
            onSelectTask={modoAtivo ? undefined : handleSelectTask}
            modoAtivo={modoAtivo}
            obterEstadoVisual={obterEstadoVisual}
            salvarEstadoVisual={salvarEstadoVisual}
          />
        </div>
      </div>
      )}

      {!modoAtivo && (!isLoading || temBaseValida) && temBaseValida && !exibirErroProg && (
      <>
      {canEdit && <GanttNovaAlocacaoModal
        isOpen={modalNovaAlocacaoAberto}
        onClose={() => { if (podeUsarInterface()) setModalNovaAlocacaoAberto(false); }}
        obrasElegiveis={obrasElegiveis}
        equipes={equipes || []}
        programacoes={programacoes || []}
        onConfirmar={handleConfirmarAlocacao}
        isLoading={criandoAlocacao}
      />}

      {!baseVazia && (
      <>
      {canEdit && <GanttNovaEquipeModal isOpen={modalNovaEquipeAberto} podeInteragir={podeEditar}
        onClose={() => { if (podeUsarInterface()) setModalNovaEquipeAberto(false); }}
        onEquipeCriada={(novaEquipeId) => {
          if (!podeEditar()) return;
          atualizarFiltros((prev) => ({ ...prev, equipeId: novaEquipeId }));
          setModalNovaAlocacaoAberto(true);
        }} />}

      {canEdit && <GanttCompartilharModal
        isOpen={modalCompartilharAberto}
        podeInteragir={podeEditar}
        onClose={() => { if (podeUsarInterface()) setModalCompartilharAberto(false); }}
      />}

      <GanttTaskDrawer
        key={tarefaDrawer?.id ?? "fechado"}
        tarefa={tarefaDrawer}
        onClose={() => { if (podeUsarInterface()) setTarefaSelecionadaId(null); }}
        canEdit={canEdit}
        onDesalocar={handleDesalocar}
        equipes={equipes || []}
        programacoes={programacoes || []}
        onMudarEquipe={handleMudarEquipe}
        renderizarAcoesObra={renderizarAcoesObra}
        onReagendar={handleReagendar}
        reagendamentoBloqueado={reagendamentoBloqueado}
        reagendamentoFase={reagendamentoFase}
        avisoReagendamento={avisoReagendamento}
        focoRetorno={obterFocoRetorno}
      />

      {/* Gaveta de Filtros Avançados: */}
      <GanttFilterDrawer
        aberto={drawerFiltrosAberto}
        onFechar={() => { if (podeUsarInterface()) setDrawerFiltrosAberto(false); }}
        filtrosAtuais={filtros}
        onAplicarFiltros={atualizarFiltros}
        onSalvarVisaoFavorita={(novosFiltros) => {
          if (podeUsarInterface()) salvarFiltrosNaStore(novosFiltros);
        }}
        equipesDisponiveis={equipes || []}
      />
      </>
      )}
      </>
      )}
    </div>
  );
}
