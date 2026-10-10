import { useState, useMemo } from "react";
import { useGanttStore, type GanttFiltrosAvancados } from "@/stores/useGanttStore";
import { useAuthStore } from "@/stores/useAuthStore";
import {
  GanttDhtmlxWrapper,
  type GanttTask,
} from "@/components/gantt/GanttDhtmlxWrapper";
import { GanttToolbar } from "@/components/gantt/GanttToolbar";
import { GanttKpiBar } from "@/components/gantt/GanttKpiBar";
import { GanttFilterDrawer } from "@/components/gantt/GanttFilterDrawer";
import { GanttNovaAlocacaoModal } from "@/components/gantt/GanttNovaAlocacaoModal";
import { GanttNovaEquipeModal } from "@/components/gantt/GanttNovaEquipeModal";
import { GanttCompartilharModal } from "@/components/gantt/GanttCompartilharModal";
import {
  GanttTaskDrawer,
  type TarefaDetalhes,
} from "@/components/gantt/GanttTaskDrawer";
import {
  useProgramacoes,
  useReordenarProgramacao,
  useCriarProgramacao,
  useDeletarProgramacao,
} from "@/hooks/api/useProgramacoes";
import {
  deletarProgramacao as deletarProgramacaoService,
  criarProgramacao as criarProgramacaoService,
} from "@/services/programacoes";
import { useObras, useHomologacoesObras } from "@/hooks/api/useObras";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useEquipes } from "@/hooks/api/useEquipes";
import { PageHeader } from "@/components/ui/PageHeader";
import { Loader2, AlertCircle, CalendarX2, Plus, Search } from "lucide-react";
import { dataFimExclusivaParaUltimoDiaUtil } from "@/lib/formatters";
import "@/components/gantt/gantt.css";

const HOJE_ISO = new Date().toISOString().split("T")[0];

export default function Equipes() {
  const queryClient = useQueryClient();
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

  const nomePerfil = useAuthStore((s) => s.usuario?.perfil?.nomePerfil);
  const canEdit =
    nomePerfil === "Administrador" || nomePerfil === "EngenhariaObras";
  const canDrag = canEdit;

  const {
    data: programacoes,
    isLoading: loadingProg,
    isError: erroProg,
    error: errorProg,
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
        (p) => dataFimExclusivaParaUltimoDiaUtil(p.dataFim) >= filtros.dataFimDe!
      );
    }
    if (filtros.dataFimAte) {
      lista = lista.filter(
        (p) => dataFimExclusivaParaUltimoDiaUtil(p.dataFim) <= filtros.dataFimAte!
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
        const ultimoDiaUtil = dataFimExclusivaParaUltimoDiaUtil(p.dataFim);
        return ultimoDiaUtil < HOJE_ISO && obra?.status !== "Concluido";
      });
    }

    return lista;
  }, [
    programacoes,
    filtros,
    listaObras,
    equipes,
  ]);


  const dadosFormatados: GanttTask[] = useMemo(() => {
    if (!equipes || !programacoesFiltradas) return [];

    const resultado: GanttTask[] = [];

    // Agrupa programações por equipe
    const mapaEquipes = new Map<number, typeof programacoesFiltradas>();
    for (const p of programacoesFiltradas) {
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
      resultado.push({
        id: `equipe-${equipe.id}`,
        text: `${equipe.nome} — ${equipe.especialidade || "Instalação"}`,
        start_date: menorInicio,
        end_date: maiorFim,
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

        resultado.push({
          id: p.id,
          parent: `equipe-${equipe.id}`,
          type: "task",
          text: obra?.clienteNome || `Obra ${p.obraId}`,
          start_date: p.dataInicio,
          end_date: p.dataFim,
          duration: p.duracaoEstimadaDias,
          equipeId: p.equipeId,
          nomeEquipe: equipe.nome,
          nomeCliente: obra?.clienteNome,
          paineis: obra?.quantidadePaineis,
          duracaoDias: p.duracaoEstimadaDias,
          statusObra: obra?.status,
          materialPronto,
          homologacaoOk,
        });
      }
    }

    return resultado;
  }, [equipes, programacoesFiltradas, listaObras, homologacoesMap]);

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
      duracaoDias: prog.duracaoEstimadaDias || 1,
      paineis: obra?.quantidadePaineis,
      obra,
    };
  }, [tarefaSelecionadaId, programacoes, listaObras, equipes]);

  const handleReorder = (id: number, novaData: string, novaDataFim: string) => {
    reordenar({ id, novaDataInicio: novaData, novaDataFim });
  };

  const handleHoje = () => {
    setDataFoco(new Date());
  };

  const handleSelectTask = (taskId: number) => {
    setTarefaSelecionadaId(taskId);
  };

  const handleConfirmarAlocacao = async (dados: {
    obraId: number;
    equipeId: number;
    dataInicio: string;
    dataFim?: string;
  }) => {
    await criarAlocacao(dados);
  };

  const handleDesalocar = (id: number) => {
    void deletarAlocacao(id);
  };

  const handleMudarEquipe = async (id: number, novaEquipeId: number) => {
    const progAtual = programacoes?.find((p) => p.id === id);
    if (!progAtual) return;

    const novaEquipe = equipes?.find((e) => e.id === novaEquipeId);
    const nomeNovaEquipe = novaEquipe?.nome || `Equipe ${novaEquipeId}`;

    try {
      await deletarProgramacaoService(id);
      const novaProg = await criarProgramacaoService({
        obraId: progAtual.obraId,
        equipeId: novaEquipeId,
        dataInicio: progAtual.dataInicio,
        dataFim: progAtual.dataFim,
      });

      setTarefaSelecionadaId(novaProg.id);
      await queryClient.invalidateQueries({ queryKey: ["programacoes"] });
      toast.success(`Obra reatribuída com sucesso para ${nomeNovaEquipe}!`);
    } catch {
      await queryClient.invalidateQueries({ queryKey: ["programacoes"] });
      toast.error("Erro ao reatribuir equipe para a obra.");
    }
  };

  const handleImprimir = () => {
    window.print();
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        <PageHeader
          title="Cronograma de Equipes"
          subtitle="Gestão de alocações e cronograma de obras (Gantt)"
        />
        <div className="flex-1 flex items-center justify-center bg-slate-50">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
            <p className="text-sm font-medium text-slate-500">
              Carregando cronograma...
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (erroProg) {
    return (
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        <PageHeader
          title="Cronograma de Equipes"
          subtitle="Gestão de alocações e cronograma de obras (Gantt)"
        />
        <div className="flex-1 flex items-center justify-center bg-slate-50">
          <div className="bg-red-50 border border-red-200 rounded-xl p-8 text-center flex flex-col items-center gap-3 max-w-md">
            <AlertCircle className="w-8 h-8 text-red-500" />
            <p className="text-red-700 font-semibold">
              Erro ao carregar cronograma
            </p>
            <p className="text-red-500 text-sm">
              {errorProg?.message || "Ocorreu um erro ao carregar o cronograma."}
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!programacoes || programacoes.length === 0) {
    return (
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        <PageHeader
          title="Cronograma de Equipes"
          subtitle="Gestão de alocações e cronograma de obras (Gantt)"
        />
        <div className="flex-1 flex items-center justify-center bg-slate-50 p-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center flex flex-col items-center gap-4 max-w-md shadow-xs">
            <CalendarX2 className="w-12 h-12 text-slate-300" />
            <div>
              <p className="text-slate-800 font-semibold text-base">
                Nenhuma programação encontrada
              </p>
              <p className="text-slate-500 text-xs mt-1">
                Aloque equipes a obras cadastradas para inicializar o cronograma.
              </p>
            </div>
            {canEdit && (
              <button
                onClick={() => setModalNovaAlocacaoAberto(true)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Nova Alocação</span>
              </button>
            )}
          </div>
        </div>

        <GanttNovaAlocacaoModal
          isOpen={modalNovaAlocacaoAberto}
          onClose={() => setModalNovaAlocacaoAberto(false)}
          obrasElegiveis={obrasElegiveis}
          equipes={equipes || []}
          onConfirmar={handleConfirmarAlocacao}
          isLoading={criandoAlocacao}
        />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      <PageHeader
        title="Cronograma de Equipes"
        subtitle="Gestão de alocações e cronograma de obras (Gantt)"
      >
        <GanttToolbar
          nivelAtual={nivelZoom}
          onMudarNivel={setNivelZoom}
          onHoje={handleHoje}
          mostrarGrade={mostrarGrade}
          onToggleGrade={() => setMostrarGrade((prev) => !prev)}
          onImprimir={handleImprimir}
          onAbrirCompartilhar={() => setModalCompartilharAberto(true)}
          onAbrirFiltros={() => setDrawerFiltrosAberto(true)}
          totalFiltrosAtivos={totalFiltrosAtivos}
        />
      </PageHeader>

      <div className="flex-1 flex flex-col gap-2 w-full bg-slate-50 p-2 md:p-3 overflow-hidden">
        {/* Barra Rápida conectada 100% à Fonte Única de Verdade 'filtros': */}
        <GanttKpiBar
          termoBusca={filtros.termoBusca || ""}
          onBuscaChange={(termo) =>
            setFiltros((prev) => ({ ...prev, termoBusca: termo || undefined }))
          }
          equipeSelecionada={filtros.equipeId ?? null}
          onEquipeChange={(equipeId) =>
            setFiltros((prev) => ({ ...prev, equipeId: equipeId ?? undefined }))
          }
          equipes={equipes || []}
          canEdit={canEdit}
          onNovaAlocacao={() => setModalNovaAlocacaoAberto(true)}
          onNovaEquipe={() => setModalNovaEquipeAberto(true)}
          dataFiltroInicio={filtros.dataInicioDe || ""}
          onDataInicioChange={(val) =>
            setFiltros((prev) => ({ ...prev, dataInicioDe: val || undefined }))
          }
          dataFiltroFim={filtros.dataFimAte || ""}
          onDataFimChange={(val) =>
            setFiltros((prev) => ({ ...prev, dataFimAte: val || undefined }))
          }
          onLimparDatas={() =>
            setFiltros((prev) => ({
              ...prev,
              dataInicioDe: undefined,
              dataFimAte: undefined,
              dataInicioAte: undefined,
              dataFimDe: undefined,
            }))
          }
        />

        {/* Container do Gantt com Empty State unificado: */}
        <div className="relative flex-1 bg-white rounded-xl shadow-xs border border-slate-200 overflow-hidden flex flex-col min-h-0">
          {programacoesFiltradas.length === 0 && (
            <div className="absolute inset-0 z-20 bg-white/95 backdrop-blur-xs flex flex-col items-center justify-center p-8 text-center gap-3 animate-fade-in">
              <Search className="w-8 h-8 text-slate-300" />
              <div>
                <p className="text-sm font-semibold text-slate-700">
                  Nenhuma alocação encontrada para os filtros aplicados
                </p>
                <p className="text-xs text-slate-400 mt-0.5">
                  Tente alterar os filtros na gaveta lateral ou na barra rápida.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setFiltros({})}
                className="px-3 py-1.5 text-xs font-semibold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 rounded-md border border-blue-200 transition-colors cursor-pointer"
              >
                Limpar Todos os Filtros
              </button>
            </div>
          )}

          <GanttDhtmlxWrapper
            tarefas={dadosFormatados}
            canDrag={canDrag}
            nivelZoom={nivelZoom}
            focarData={dataFoco}
            mostrarGrade={mostrarGrade}
            onReorder={handleReorder}
            onSelectTask={handleSelectTask}
          />
        </div>
      </div>

      <GanttNovaAlocacaoModal
        isOpen={modalNovaAlocacaoAberto}
        onClose={() => setModalNovaAlocacaoAberto(false)}
        obrasElegiveis={obrasElegiveis}
        equipes={equipes || []}
        onConfirmar={handleConfirmarAlocacao}
        isLoading={criandoAlocacao}
      />

      <GanttNovaEquipeModal
        isOpen={modalNovaEquipeAberto}
        onClose={() => setModalNovaEquipeAberto(false)}
        onEquipeCriada={(novaEquipeId) => {
          setFiltros((prev) => ({ ...prev, equipeId: novaEquipeId }));
          setModalNovaAlocacaoAberto(true);
        }}
      />

      <GanttCompartilharModal
        isOpen={modalCompartilharAberto}
        onClose={() => setModalCompartilharAberto(false)}
      />

      <GanttTaskDrawer
        tarefa={tarefaDrawer}
        onClose={() => setTarefaSelecionadaId(null)}
        canEdit={canEdit}
        onDesalocar={handleDesalocar}
        equipes={equipes || []}
        onMudarEquipe={handleMudarEquipe}
        onReorder={handleReorder}
      />

      {/* Gaveta de Filtros Avançados: */}
      <GanttFilterDrawer
        aberto={drawerFiltrosAberto}
        onFechar={() => setDrawerFiltrosAberto(false)}
        filtrosAtuais={filtros}
        onAplicarFiltros={setFiltros}
        onSalvarVisaoFavorita={salvarFiltrosNaStore}
        equipesDisponiveis={equipes || []}
      />
    </div>
  );
}
