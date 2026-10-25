import { capturarSessaoOperacional, deveExibirErroLocal } from "@/shared/lib/sessaoOperacao";
import { useState, useMemo, useLayoutEffect, useRef, type SetStateAction, type ReactNode } from "react";
import { useGanttStore } from "@/features/cronograma/stores/useGanttStore";
import type { GanttFiltrosAvancados } from "@/types";
import { useAuthStore } from "@/features/auth/stores/useAuthStore";
import {
  GanttDhtmlxWrapper,
  type GanttTask,
} from "@/features/cronograma/components/GanttDhtmlxWrapper";
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
import { CalendarX2, Search } from "lucide-react";
import {
  normalizarDataFimInclusiva,
  dataFimInclusivaParaDhtmlx,
  calcularDiasUteisInclusivos,
  formatarDataISO,
} from "@/shared/lib/formatters";
import { obterConflitosEquipe } from "@/features/cronograma/lib/ganttCalculos";
import { useModoDisplay } from "@/shared/contexts/ModoDisplayContext";
import { podeVerModo } from "@/shared/lib/podeVerModo";
import { BotaoModoDisplay } from "@/shared/components/display/BotaoModoDisplay";
import "@/features/cronograma/components/gantt.css";

const HOJE_ISO = formatarDataISO(new Date());

export default function Equipes({
  renderizarAcoesObra,
}: {
  renderizarAcoesObra?: (obraId: number) => ReactNode;
} = {}) {
  const { ativo: modoAtivo, elegivelParaModo, alturaSelo, lerEpoch, podeInteragir } = useModoDisplay();
  const epochRender = lerEpoch();
  const nivelZoom = useGanttStore((s) => s.nivelZoom);
  const setNivelZoom = useGanttStore((s) => s.setNivelZoom);
  const filtrosSalvos = useGanttStore((s) => s.filtrosSalvos);
  const salvarFiltrosNaStore = useGanttStore((s) => s.salvarFiltros);

  const [prevFiltrosSalvos, setPrevFiltrosSalvos] = useState(filtrosSalvos);
  const [dataFoco, setDataFoco] = useState<Date | null>(null);
  const [drawerFiltrosAberto, setDrawerFiltrosAberto] = useState(false);
  const [filtros, setFiltros] = useState<GanttFiltrosAvancados>(() => filtrosSalvos || {});

  if (filtrosSalvos !== prevFiltrosSalvos) {
    setPrevFiltrosSalvos(filtrosSalvos);
    if (filtrosSalvos) {
      setFiltros(filtrosSalvos);
    }
  }

  const [mostrarGrade, setMostrarGrade] = useState(() => {
    if (typeof window !== "undefined") {
      return window.innerWidth >= 768;
    }
    return true;
  });
  const [modalNovaAlocacaoAberto, setModalNovaAlocacaoAberto] = useState(false);
  const [modalNovaEquipeAberto, setModalNovaEquipeAberto] = useState(false);
  const [modalCompartilharAberto, setModalCompartilharAberto] = useState(false);
  const [tarefaSelecionadaId, setTarefaSelecionadaId] = useState<number | null>(null);
  const [epochOverlays, setEpochOverlays] = useState(epochRender);
  if (epochOverlays !== epochRender) {
    setEpochOverlays(epochRender);
    setDrawerFiltrosAberto(false);
    setModalNovaAlocacaoAberto(false);
    setModalNovaEquipeAberto(false);
    setModalCompartilharAberto(false);
    setTarefaSelecionadaId(null);
  }

  const nomePerfil = useAuthStore((s) => s.usuario?.perfil?.nomePerfil);
  const canEdit =
    nomePerfil === "Administrador" || nomePerfil === "Engenharia";
  const canDrag = canEdit && !modoAtivo;
  const canEditRef = useRef(canEdit);
  const montadoRef = useRef(false);
  useLayoutEffect(() => { canEditRef.current = canEdit; }, [canEdit]);
  useLayoutEffect(() => {
    montadoRef.current = true;
    return () => { montadoRef.current = false; };
  }, []);
  const podeUsarInterface = () => montadoRef.current && podeInteragir(epochRender);
  const podeEditar = () => canEditRef.current && podeUsarInterface();
  const atualizarFiltros = (atualizacao: SetStateAction<GanttFiltrosAvancados>) => {
    if (!podeUsarInterface()) return;
    setFiltros(atualizacao);
  };

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

  const { mutate: reordenar } = useReordenarProgramacao();
  const { mutateAsync: criarAlocacao, isPending: criandoAlocacao } =
    useCriarProgramacao();
  const { mutateAsync: deletarAlocacao } = useDeletarProgramacao();

  const isLoading = loadingProg || loadingObras || loadingEquipes;
  const listaObras = obras?.itens;

  const obrasElegiveis = useMemo(() => {
    if (!listaObras) return [];
    return listaObras.filter((o) => o.status !== "Concluido");
  }, [listaObras]);

  const totalFiltrosAtivos = useMemo(() => {
    return [
      filtros.termoBusca,
      filtros.categoria,
      filtros.equipeId,
      filtros.statusObra,
      filtros.prioridade !== undefined,
      filtros.responsavel,
      filtros.dataInicioDe,
      filtros.dataInicioAte,
      filtros.dataFimDe,
      filtros.dataFimAte,
      filtros.statusMaterial && filtros.statusMaterial !== "todos",
      filtros.apenasAtrasadas,
    ].filter(Boolean).length;
  }, [filtros]);

  const programacoesFiltradas = useMemo(() => {
    if (!programacoes) return [];
    let lista = programacoes;

    // 1. Equipe
    if (filtros.equipeId) {
      lista = lista.filter((p) => p.equipeId === filtros.equipeId);
    }

    // 2. Período de Início
    if (filtros.dataInicioDe) {
      lista = lista.filter((p) => p.dataInicio >= filtros.dataInicioDe!);
    }
    if (filtros.dataInicioAte) {
      lista = lista.filter((p) => p.dataInicio <= filtros.dataInicioAte!);
    }

    // 3. Período de Término
    if (filtros.dataFimDe) {
      lista = lista.filter(
        (p) => normalizarDataFimInclusiva(p.dataFim) >= filtros.dataFimDe!
      );
    }
    if (filtros.dataFimAte) {
      lista = lista.filter(
        (p) => normalizarDataFimInclusiva(p.dataFim) <= filtros.dataFimAte!
      );
    }

    // 4. Prioridade
    if (filtros.prioridade !== undefined) {
      lista = lista.filter((p) => p.prioridade === filtros.prioridade);
    }

    // 5. Termo de Busca (Texto livre)
    if (filtros.termoBusca?.trim()) {
      const termo = filtros.termoBusca.toLowerCase().trim();
      lista = lista.filter((p) => {
        const obra = listaObras?.find((o) => Number(o.id) === Number(p.obraId));
        const equipe = equipes?.find((e) => e.id === p.equipeId);
        return (
          Boolean(obra?.clienteNome?.toLowerCase().includes(termo)) ||
          String(p.obraId).includes(termo) ||
          String(p.id).includes(termo) ||
          Boolean(obra?.categoria?.toLowerCase().includes(termo)) ||
          Boolean(equipe?.nome?.toLowerCase().includes(termo))
        );
      });
    }

    // 6. Categoria da Obra
    if (filtros.categoria) {
      lista = lista.filter((p) => {
        const obra = listaObras?.find((o) => Number(o.id) === Number(p.obraId));
        return obra?.categoria === filtros.categoria;
      });
    }

    // 7. Status da Obra no Funil
    if (filtros.statusObra) {
      lista = lista.filter((p) => {
        const obra = listaObras?.find((o) => Number(o.id) === Number(p.obraId));
        return obra?.status === filtros.statusObra;
      });
    }

    // 8. Responsável pela Atualização
    if (filtros.responsavel?.trim()) {
      const respTermo = filtros.responsavel.toLowerCase().trim();
      lista = lista.filter((p) => {
        const obra = listaObras?.find((o) => Number(o.id) === Number(p.obraId));
        return Boolean(obra?.atualizadoPor?.toLowerCase().includes(respTermo));
      });
    }

    // 9. Prontidão dos Materiais
    if (filtros.statusMaterial && filtros.statusMaterial !== "todos") {
      lista = lista.filter((p) => {
        const obra = listaObras?.find((o) => Number(o.id) === Number(p.obraId));
        const st = obra?.status;
        const pronto = st === "Separado" || st === "EmAndamento" || st === "Concluido";
        return filtros.statusMaterial === "pronto" ? pronto : !pronto;
      });
    }

    // 10. Checkbox: Apenas Tarefas Atrasadas
    if (filtros.apenasAtrasadas) {
      lista = lista.filter((p) => {
        const obra = listaObras?.find((o) => Number(o.id) === Number(p.obraId));
        return normalizarDataFimInclusiva(p.dataFim) < HOJE_ISO && obra?.status !== "Concluido";
      });
    }

    return lista;
  }, [
    programacoes,
    filtros,
    listaObras,
    equipes,
  ]);


  const programacoesVisiveis = useMemo(
    () => modoAtivo ? programacoes ?? [] : programacoesFiltradas,
    [modoAtivo, programacoes, programacoesFiltradas]
  );

  const dadosFormatados: GanttTask[] = useMemo(() => {
    if (!equipes) return [];

    const resultado: GanttTask[] = [];

    // Agrupa programações por equipe
    const mapaEquipes = new Map<number, typeof programacoesVisiveis>();
    for (const p of programacoesVisiveis) {
      const lista = mapaEquipes.get(p.equipeId) || [];
      lista.push(p);
      mapaEquipes.set(p.equipeId, lista);
    }

    // Para cada equipe que possui obras correspondentes aos filtros (supressão de vazias)
    for (const equipe of equipes) {
      const progsEquipe = mapaEquipes.get(equipe.id);
      if (!progsEquipe || progsEquipe.length === 0) continue;

      progsEquipe.sort((a, b) => a.dataInicio.localeCompare(b.dataInicio));

      // Cálculo exato do span de datas da equipe (menor início e maior fim)
      const menorInicio = progsEquipe.reduce(
        (min, p) => (p.dataInicio < min ? p.dataInicio : min),
        progsEquipe[0].dataInicio
      );
      const maiorFim = progsEquipe.reduce(
        (max, p) => (p.dataFim > max ? p.dataFim : max),
        progsEquipe[0].dataFim
      );

      // 1. Nó Pai de Equipe (Projeto)
      const maiorFimNormalizado = normalizarDataFimInclusiva(maiorFim);
      resultado.push({
        id: `equipe-${equipe.id}`,
        text: `${equipe.nome} — ${equipe.especialidade || "Instalação"}`,
        start_date: menorInicio,
        end_date: dataFimInclusivaParaDhtmlx(maiorFimNormalizado),
        dataFimInclusiva: maiorFimNormalizado,
        type: "project",
        open: true,
        equipeId: equipe.id,
        nomeEquipe: equipe.nome,
      });

      // 2. Nós Filhos (Obras)
      for (const p of progsEquipe) {
        const obra = listaObras?.find((o) => Number(o.id) === Number(p.obraId));
        const materialStatus = obra?.status;
        const materialPronto =
          materialStatus === "Separado" ||
          materialStatus === "EmAndamento" ||
          materialStatus === "Concluido";

        const homologacao = homologacoesMap?.[p.obraId];
        const homologacaoOk = homologacao?.parecerAcesso === "Aprovado";
        const fimNormalizado = normalizarDataFimInclusiva(p.dataFim);
        const duracaoCalculada = calcularDiasUteisInclusivos(p.dataInicio, fimNormalizado);

        resultado.push({
          id: p.id,
          parent: `equipe-${equipe.id}`,
          type: "task",
          text: obra?.clienteNome || `Obra ${p.obraId}`,
          start_date: p.dataInicio,
          end_date: dataFimInclusivaParaDhtmlx(fimNormalizado),
          dataFimInclusiva: fimNormalizado,
          duration: duracaoCalculada,
          equipeId: p.equipeId,
          nomeEquipe: equipe.nome,
          nomeCliente: obra?.clienteNome,
          paineis: obra?.quantidadePaineis,
          duracaoDias: duracaoCalculada,
          statusObra: obra?.status,
          materialPronto,
          homologacaoOk,
        });
      }
    }

    return resultado;
  }, [equipes, programacoesVisiveis, listaObras, homologacoesMap]);

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
      duracaoDias: calcularDiasUteisInclusivos(prog.dataInicio, normalizarDataFimInclusiva(prog.dataFim)),
      paineis: obra?.quantidadePaineis,
      obra,
    };
  }, [tarefaSelecionadaId, programacoes, listaObras, equipes]);

  const handleReorder = (id: number, novaData: string, novaDataFim: string) => {
    if (!podeEditar()) return;
    reordenar({ id, novaDataInicio: novaData, novaDataFim });
  };

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
        {!isLoading && !erroProg && Boolean(programacoes?.length) && (
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

      {isLoading ? (
        <div className="flex-1 flex items-center justify-center bg-background-app">
          <FeedbackLoading mensagem="Carregando cronograma..." />
        </div>
      ) : erroProg ? (
        <div className="flex-1 flex items-center justify-center bg-background-app p-4">
          <FeedbackErro mensagem={errorProg?.message || "Ocorreu um erro ao carregar o cronograma."}
            onTentarNovamente={() => void refetchProg()} />
        </div>
      ) : programacoesVisiveis.length === 0 && (modoAtivo || !programacoes?.length) ? (
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
            tarefas={dadosFormatados}
            canDrag={canDrag}
            epochInteracao={epochRender}
            nivelZoom={nivelZoom}
            focarData={dataFoco}
            mostrarGrade={mostrarGrade}
            onReorder={handleReorder}
            onSelectTask={modoAtivo ? undefined : handleSelectTask}
          />
        </div>
      </div>
      )}

      {!modoAtivo && !isLoading && !erroProg && (
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

      {Boolean(programacoes?.length) && (
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
        onClose={() => { if (podeUsarInterface()) setModalCompartilharAberto(false); }}
      />}

      <GanttTaskDrawer
        tarefa={tarefaDrawer}
        onClose={() => { if (podeUsarInterface()) setTarefaSelecionadaId(null); }}
        canEdit={canEdit}
        onDesalocar={handleDesalocar}
        equipes={equipes || []}
        programacoes={programacoes || []}
        onMudarEquipe={handleMudarEquipe}
        renderizarAcoesObra={renderizarAcoesObra}
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
