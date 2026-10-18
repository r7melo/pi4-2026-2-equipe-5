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
import { GanttToolbar } from "@/components/gantt/GanttToolbar";
import type { NivelZoom } from "@/types";
import FeedbackLoading from "@/components/feedback/FeedbackLoading";
import FeedbackErro from "@/components/feedback/FeedbackErro";
import { EmptyState } from "@/components/feedback/EmptyState";
import { CalendarX2, Shield, Sun } from "lucide-react";
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
      <div className="min-h-screen bg-background-app flex flex-col items-center justify-center p-4">
        <FeedbackLoading mensagem="Carregando cronograma..." />
      </div>
    );
  }

  if (erroProg) {
    const msg =
      (errorProg as { response?: { data?: { error?: { message?: string } } } })
        ?.response?.data?.error?.message ||
      "O link informado não é válido ou foi desativado pelo administrador.";
    return (
      <div className="min-h-screen bg-background-app flex flex-col items-center justify-center p-4">
        <FeedbackErro
          titulo="Acesso não autorizado ou expirado"
          mensagem={msg}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-background-app">
      {/* Header Público Limpo */}
      <header className="bg-surface border-b border-border-subtle px-4 py-3 flex flex-wrap items-center justify-between gap-3 shrink-0 no-print">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-info text-primary-foreground flex items-center justify-center shadow-xs">
            <Sun className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-bold text-foreground-secondary">ZL Engenharia Solar</h1>
              <span className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-success-light text-success border border-success-border">
                <Shield className="w-2.5 h-2.5" />
                Visualização Pública
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
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
        <div className="relative flex-1 bg-surface rounded-xl shadow-xs border border-border-subtle overflow-hidden flex flex-col min-h-0">
          {dadosFormatados.length === 0 && (
            <EmptyState
              className="absolute inset-0 z-20 bg-surface/95 backdrop-blur-xs flex items-center justify-center animate-fade-in"
              icone={CalendarX2}
              titulo="Nenhuma alocação encontrada para este período"
              descricao="Ajuste os filtros de data na barra superior para expandir a busca."
            />
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
      <footer className="bg-surface border-t border-border-subtle px-4 py-2 flex items-center justify-between text-[11px] text-muted-foreground shrink-0 no-print">
        <span>© {ANO_ATUAL} ZL Engenharia Solar · Todos os direitos reservados</span>
        <span>Acesso com permissões restritas (somente-leitura)</span>
      </footer>
    </div>
  );
}
