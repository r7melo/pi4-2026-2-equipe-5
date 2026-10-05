// frontend/src/pages/Equipes.tsx
// RF-07, RF-08, RF-09, RF-16, RF-17: Cronograma de Equipes (Gantt v3.0)
import { useMemo, useState } from "react";
import { useAuthStore } from "@/stores/useAuthStore";
import {
  GanttDhtmlxWrapper,
  type GanttTask,
} from "@/components/gantt/GanttDhtmlxWrapper";
import { GanttToolbar } from "@/components/gantt/GanttToolbar";
import { GanttKpiBar } from "@/components/gantt/GanttKpiBar";
import { GanttNovaAlocacaoModal } from "@/components/gantt/GanttNovaAlocacaoModal";
import { GanttCompartilharModal } from "@/components/gantt/GanttCompartilharModal";
import {
  GanttTaskDrawer,
  type TarefaDetalhes,
} from "@/components/gantt/GanttTaskDrawer";
import { useObras, useHomologacoesObras } from "@/hooks/api/useObras";
import { useGanttStore } from "@/stores/useGanttStore";
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
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useEquipes } from "@/hooks/api/useEquipes";
import { PageHeader } from "@/components/ui/PageHeader";
import { Loader2, AlertCircle, CalendarX2, Plus, Search } from "lucide-react";
import { dataFimExclusivaParaUltimoDiaUtil } from "@/lib/formatters";
import "@/components/gantt/gantt.css";

export default function Equipes() {
  const queryClient = useQueryClient();
  const nivelZoom = useGanttStore((s) => s.nivelZoom);
  const setNivelZoom = useGanttStore((s) => s.setNivelZoom);
  const [dataFoco, setDataFoco] = useState<Date | null>(null);
  const [termoBusca, setTermoBusca] = useState("");
  const [equipeSelecionada, setEquipeSelecionada] = useState<number | null>(null);
  const [dataFiltroInicio, setDataFiltroInicio] = useState("");
  const [dataFiltroFim, setDataFiltroFim] = useState("");
  const [mostrarGrade, setMostrarGrade] = useState(() => {
    if (typeof window !== "undefined") {
      return window.innerWidth >= 768;
    }
    return true;
  });
  const [modalNovaAlocacaoAberto, setModalNovaAlocacaoAberto] = useState(false);
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

  const programacoesFiltradas = useMemo(() => {
    if (!programacoes) return [];
    let lista = programacoes;

    if (equipeSelecionada) {
      lista = lista.filter((p) => p.equipeId === equipeSelecionada);
    }

    if (dataFiltroInicio) {
      lista = lista.filter(
        (p) => dataFimExclusivaParaUltimoDiaUtil(p.dataFim) >= dataFiltroInicio
      );
    }

    if (dataFiltroFim) {
      lista = lista.filter((p) => p.dataInicio <= dataFiltroFim);
    }

    if (termoBusca.trim()) {
      const termo = termoBusca.toLowerCase().trim();
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

    return lista;
  }, [
    programacoes,
    equipeSelecionada,
    dataFiltroInicio,
    dataFiltroFim,
    termoBusca,
    listaObras,
    equipes,
  ]);

  const totalEquipesAtivas = useMemo(() => {
    const equipesComObra = new Set(programacoesFiltradas.map((p) => p.equipeId));
    return equipesComObra.size;
  }, [programacoesFiltradas]);

  const totalPaineisAgendados = useMemo(() => {
    if (!listaObras) return 0;
    const obrasAgendadasIds = new Set(programacoesFiltradas.map((p) => Number(p.obraId)));
    return listaObras
      .filter((o) => obrasAgendadasIds.has(Number(o.id)))
      .reduce((acc, o) => acc + (o.quantidadePaineis || 0), 0);
  }, [programacoesFiltradas, listaObras]);

  const totalObrasAgendadas = useMemo(() => {
    return new Set(programacoesFiltradas.map((p) => p.obraId)).size;
  }, [programacoesFiltradas]);

  const dadosFormatados: GanttTask[] = useMemo(() => {
    return programacoesFiltradas.map((p) => {
      const obra = listaObras?.find((o) => Number(o.id) === Number(p.obraId));
      const equipe = equipes?.find((e) => e.id === p.equipeId);
      const nomeEquipe = equipe?.nome || `Equipe ${p.equipeId}`;
      const nomeCliente = obra?.clienteNome || `Obra ID: ${p.obraId}`;

      const materialStatus = obra?.status;
      const materialPronto =
        materialStatus === "Separado" ||
        materialStatus === "EmAndamento" ||
        materialStatus === "Concluido";

      const homologacao = homologacoesMap?.[p.obraId];
      const homologacaoOk = homologacao?.parecerAcesso === "Aprovado";

      return {
        id: p.id,
        text: `${nomeEquipe} — ${nomeCliente}`,
        start_date: p.dataInicio,
        end_date: p.dataFim,
        duration: p.duracaoEstimadaDias,
        equipeId: p.equipeId,
        nomeEquipe,
        nomeCliente,
        paineis: obra?.quantidadePaineis,
        duracaoDias: p.duracaoEstimadaDias,
        statusObra: obra?.status,
        materialPronto,
        homologacaoOk,
      };
    });
  }, [programacoesFiltradas, listaObras, equipes, homologacoesMap]);

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

  // Reatribuição atômica oficial: Rota #22 (DELETE) e Rota #15 (POST)
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
        />
      </PageHeader>

      <div className="flex-1 flex flex-col gap-2 w-full bg-slate-50 p-2 md:p-3 overflow-hidden">
        <GanttKpiBar
          totalEquipes={totalEquipesAtivas}
          totalPaineis={totalPaineisAgendados}
          totalObras={totalObrasAgendadas}
          termoBusca={termoBusca}
          onBuscaChange={setTermoBusca}
          equipeSelecionada={equipeSelecionada}
          onEquipeChange={setEquipeSelecionada}
          equipes={equipes || []}
          canEdit={canEdit}
          onNovaAlocacao={() => setModalNovaAlocacaoAberto(true)}
          dataFiltroInicio={dataFiltroInicio}
          onDataInicioChange={setDataFiltroInicio}
          dataFiltroFim={dataFiltroFim}
          onDataFimChange={setDataFiltroFim}
          onLimparDatas={() => {
            setDataFiltroInicio("");
            setDataFiltroFim("");
          }}
        />

        {/* Container do Gantt */}
        <div className="relative flex-1 bg-white rounded-xl shadow-xs border border-slate-200 overflow-hidden flex flex-col min-h-0">
          {programacoesFiltradas.length === 0 && (
            <div className="absolute inset-0 z-20 bg-white/95 backdrop-blur-xs flex flex-col items-center justify-center p-8 text-center gap-3 animate-fade-in">
              <Search className="w-8 h-8 text-slate-300" />
              <div>
                <p className="text-sm font-semibold text-slate-700">
                  Nenhuma alocação encontrada para os filtros aplicados
                </p>
                <p className="text-xs text-slate-400 mt-0.5">
                  Tente alterar o termo de busca, período de datas ou selecione outra equipe.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setTermoBusca("");
                  setEquipeSelecionada(null);
                  setDataFiltroInicio("");
                  setDataFiltroFim("");
                }}
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
    </div>
  );
}
