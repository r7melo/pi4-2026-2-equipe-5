// RF-07, RF-08, RF-09: Cronograma de Equipes (Gantt)
import { useMemo, useState } from "react";
import { useAuthStore } from "@/stores/useAuthStore";
import { GanttDhtmlxWrapper } from "@/components/gantt/GanttDhtmlxWrapper";
import { GanttToolbar, type NivelZoom } from "@/components/gantt/GanttToolbar";
import { useObras } from "@/hooks/api/useObras";
import {
  useProgramacoes,
  useReordenarProgramacao,
} from "@/hooks/api/useProgramacoes";
import { useEquipes } from "@/hooks/api/useEquipes";
import { PageHeader } from "@/components/ui/PageHeader";
import { Loader2, AlertCircle, CalendarX2, Info } from "lucide-react";
import "@/components/gantt/gantt.css";


export default function Equipes() {
  const [nivelZoom, setNivelZoom] = useState<NivelZoom>("week");
  const [dataFoco, setDataFoco] = useState<Date | null>(null);

  const nomePerfil = useAuthStore((s) => s.usuario?.perfil?.nomePerfil);
  const canDrag = nomePerfil === "Administrador" || nomePerfil === "EngenhariaObras";

  const { data: programacoes, isLoading: loadingProg, isError: erroProg, error: errorProg } = useProgramacoes();
  const { data: obras, isLoading: loadingObras } = useObras({ pageSize: 1000 });
  const { data: equipes, isLoading: loadingEquipes } = useEquipes();
  const { mutate: reordenar } = useReordenarProgramacao();

  const isLoading = loadingProg || loadingObras || loadingEquipes;

  // Join Programações + Obras + Equipes → dados do Gantt com metadados para tooltip
  const dadosFormatados = useMemo(() => {
    return (programacoes || []).map((p) => {
      const obra = obras?.itens.find((o) => Number(o.id) === Number(p.obraId));
      const equipe = equipes?.find((e) => e.id === p.equipeId);
      const nomeEquipe = equipe?.nome || `Equipe ${p.equipeId}`;
      const nomeCliente = obra?.clienteNome || `Obra ID: ${p.obraId}`;
      return {
        id: p.id,
        text: `${nomeEquipe} — ${nomeCliente}`,
        start_date: p.dataInicio,
        end_date: p.dataFim,
        equipeId: p.equipeId,
        // Metadados extras para tooltip
        nomeEquipe,
        nomeCliente,
        paineis: obra?.quantidadePaineis,
        duracaoDias: p.duracaoEstimadaDias,
      };
    });
  }, [programacoes, obras?.itens, equipes]);

  const handleReorder = (id: number, novaData: string, novaDataFim: string) => {
    reordenar({ id, novaDataInicio: novaData, novaDataFim });
  };

  const handleHoje = () => {
    setDataFoco(new Date());
  };

  // ─── Estado: Carregando ───
  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        <PageHeader title="Cronograma de Equipes" subtitle="Gestão de alocações e cronograma de obras (Gantt)" />
        <div className="flex-1 flex items-center justify-center bg-slate-50">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
            <p className="text-sm font-medium text-slate-500">Carregando cronograma...</p>
          </div>
        </div>
      </div>
    );
  }

  // ─── Estado: Erro ───
  if (erroProg) {
    return (
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        <PageHeader title="Cronograma de Equipes" subtitle="Gestão de alocações e cronograma de obras (Gantt)" />
        <div className="flex-1 flex items-center justify-center bg-slate-50">
          <div className="bg-red-50 border border-red-200 rounded-xl p-8 text-center flex flex-col items-center gap-3 max-w-md">
            <AlertCircle className="w-8 h-8 text-red-500" />
            <p className="text-red-700 font-semibold">Erro ao carregar cronograma</p>
            <p className="text-red-500 text-sm">{(errorProg as Error).message}</p>
          </div>
        </div>
      </div>
    );
  }

  // ─── Estado: Vazio ───
  if (!programacoes || programacoes.length === 0) {
    return (
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        <PageHeader title="Cronograma de Equipes" subtitle="Gestão de alocações e cronograma de obras (Gantt)" />
        <div className="flex-1 flex items-center justify-center bg-slate-50">
          <div className="flex flex-col items-center gap-3">
            <CalendarX2 className="w-10 h-10 text-slate-300" />
            <p className="text-slate-400 font-medium">Nenhuma programação encontrada</p>
            <p className="text-slate-400 text-sm">Aloque equipes a obras para visualizar o cronograma.</p>
          </div>
        </div>
      </div>
    );
  }

  // ─── Estado: Com Dados ───
  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      <PageHeader title="Cronograma de Equipes" subtitle="Gestão de alocações e cronograma de obras (Gantt)">
        {/* TOOLBAR: Zoom + Hoje movida para o header para economizar espaço vertical */}
        <GanttToolbar nivelAtual={nivelZoom} onMudarNivel={setNivelZoom} onHoje={handleHoje} />
      </PageHeader>

      <div className="flex-1 flex flex-col gap-2 w-full bg-slate-50 p-2 md:p-3 overflow-hidden">
        {/* GANTT CHART */}
        <div className="flex-1 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <GanttDhtmlxWrapper
            tarefas={dadosFormatados}
            canDrag={canDrag}
            nivelZoom={nivelZoom}
            focarData={dataFoco}
            onReorder={handleReorder}
          />
        </div>

        {/* NOTA RODAPÉ (conforme protótipo) */}
        <div className="flex items-center gap-2 px-2 py-1 shrink-0">
          <Info className="w-3.5 h-3.5 text-slate-400" />
          <span className="text-xs text-slate-400 font-medium">
            Estimativa automática: ~9 painéis/dia · Finais de semana desconsiderados
          </span>
        </div>
      </div>
    </div>
  );
}
