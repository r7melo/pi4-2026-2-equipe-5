// frontend/src/pages/CronogramaPublico.tsx
// RF-16 & Rota #21: Tela de Visualização Pública Somente-Leitura do Cronograma Gantt
import { useState, useMemo, useEffect } from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { obterCronogramaCompartilhado } from "@/services/cronogramaPublico";
import {
  GanttDhtmlxWrapper,
  type GanttTask,
} from "@/components/gantt/GanttDhtmlxWrapper";
import { GanttToolbar, type NivelZoom } from "@/components/gantt/GanttToolbar";
import { Loader2, AlertCircle, CalendarX2, Shield, Sun } from "lucide-react";
import "@/components/gantt/gantt.css";

const ANO_ATUAL = new Date().getFullYear();

export default function CronogramaPublico() {
  const { token = "" } = useParams<{ token: string }>();
  const [nivelZoom, setNivelZoom] = useState<NivelZoom>("day");
  const [dataFoco, setDataFoco] = useState<Date | null>(null);
  const [dataFiltroInicio, setDataFiltroInicio] = useState("");
  const [dataFiltroFim, setDataFiltroFim] = useState("");
  const [mostrarGrade, setMostrarGrade] = useState(() => {
    if (typeof window !== "undefined") {
      return window.innerWidth >= 768;
    }
    return true;
  });

  useEffect(() => {
    document.title = "Cronograma Público — ZL Engenharia Solar";
  }, []);

  const {
    data: programacoes,
    isLoading: loadingProg,
    isError: erroProg,
    error: errorProg,
  } = useQuery({
    queryKey: ["cronogramaPublico", token, dataFiltroInicio, dataFiltroFim],
    queryFn: () =>
      obterCronogramaCompartilhado(token, {
        dataInicio: dataFiltroInicio || undefined,
        dataFim: dataFiltroFim || undefined,
      }),
    enabled: Boolean(token),
  });

  const dadosFormatados: GanttTask[] = useMemo(() => {
    if (!programacoes) return [];
    return programacoes.map((p) => {
      const nomeEquipe = `Equipe ${p.equipeId}`;
      const nomeCliente = `Obra #${p.obraId}`;

      return {
        id: p.id,
        text: `${nomeEquipe} — ${nomeCliente}`,
        start_date: p.dataInicio,
        end_date: p.dataFim,
        duration: p.duracaoEstimadaDias,
        equipeId: p.equipeId,
        nomeEquipe,
        nomeCliente,
        duracaoDias: p.duracaoEstimadaDias,
      };
    });
  }, [programacoes]);

  const handleHoje = () => {
    setDataFoco(new Date());
  };

  const handleImprimir = () => {
    window.print();
  };

  if (loadingProg) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600 mb-2" />
        <p className="text-sm font-medium text-slate-600">Carregando cronograma...</p>
      </div>
    );
  }

  if (erroProg) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="bg-white border border-red-200 rounded-2xl p-8 max-w-md text-center flex flex-col items-center gap-3 shadow-xs">
          <AlertCircle className="w-10 h-10 text-red-500" />
          <h2 className="text-base font-bold text-slate-800">
            Acesso não autorizado ou expirado
          </h2>
          <p className="text-xs text-slate-500">
            {(errorProg as { response?: { data?: { error?: { message?: string } } } })
              ?.response?.data?.error?.message ||
              "O link informado não é válido ou foi desativado pelo administrador."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-slate-100">
      {/* Header Público Limpo */}
      <header className="bg-white border-b border-slate-200 px-4 py-3 flex flex-wrap items-center justify-between gap-3 shrink-0 no-print">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
            <Sun className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-bold text-slate-800">ZL Engenharia Solar</h1>
              <span className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                <Shield className="w-2.5 h-2.5" />
                Visualização Pública
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Cronograma Executivo de Instalações e Obras
            </p>
          </div>
        </div>

        <GanttToolbar
          nivelAtual={nivelZoom}
          onMudarNivel={setNivelZoom}
          onHoje={handleHoje}
          mostrarGrade={mostrarGrade}
          onToggleGrade={() => setMostrarGrade((prev) => !prev)}
          dataFiltroInicio={dataFiltroInicio}
          onDataInicioChange={setDataFiltroInicio}
          dataFiltroFim={dataFiltroFim}
          onDataFimChange={setDataFiltroFim}
          onLimparDatas={() => {
            setDataFiltroInicio("");
            setDataFiltroFim("");
          }}
          onImprimir={handleImprimir}
        />
      </header>

      {/* Conteúdo do Cronograma */}
      <main className="flex-1 p-2 md:p-3 overflow-hidden flex flex-col min-h-0">
        <div className="relative flex-1 bg-white rounded-xl shadow-xs border border-slate-200 overflow-hidden flex flex-col min-h-0">
          {dadosFormatados.length === 0 && (
            <div className="absolute inset-0 z-20 bg-white/95 backdrop-blur-xs flex flex-col items-center justify-center p-8 text-center gap-2 animate-fade-in">
              <CalendarX2 className="w-10 h-10 text-slate-300" />
              <p className="text-sm font-semibold text-slate-700">
                Nenhuma alocação encontrada para este período
              </p>
              <p className="text-xs text-slate-400">
                Ajuste os filtros de data na barra superior para expandir a busca.
              </p>
            </div>
          )}

          <GanttDhtmlxWrapper
            tarefas={dadosFormatados}
            canDrag={false}
            nivelZoom={nivelZoom}
            focarData={dataFoco}
            mostrarGrade={mostrarGrade}
          />
        </div>
      </main>

      {/* Rodapé Informativo */}
      <footer className="bg-white border-t border-slate-200 px-4 py-2 flex items-center justify-between text-[11px] text-slate-400 shrink-0 no-print">
        <span>© {ANO_ATUAL} ZL Engenharia Solar · Todos os direitos reservados</span>
        <span>Acesso com permissões restritas (somente-leitura)</span>
      </footer>
    </div>
  );
}
