// frontend/src/features/cronograma/pages/CronogramaPublico.tsx
// RF-16 & Rota #43 (GET /api/cronograma/compartilhado/{token}): Visualização Pública Somente-Leitura do Cronograma Gantt
import { useState, useMemo, useEffect } from "react";
import { useParams } from "react-router-dom";
import { useCronogramaPublico } from "@/features/cronograma/hooks/useCronogramaPublico";
import { dataCivilParaGanttPublico } from "@/features/cronograma/lib/compartilhamento";
import { statusHttp } from "@/shared/lib/sessaoOperacao";
import { diasUteisCivis } from "@/shared/lib/datasCivis";
import {
  GanttDhtmlxWrapper,
  type GanttTask,
} from "@/features/cronograma/components/GanttDhtmlxWrapper";
import { GanttToolbar } from "@/features/cronograma/components/GanttToolbar";
import type { NivelZoom } from "../types/gantt";
import FeedbackLoading from "@/shared/components/feedback/FeedbackLoading";
import FeedbackErro from "@/shared/components/feedback/FeedbackErro";
import { EmptyState } from "@/shared/components/feedback/EmptyState";
import { Badge } from "@/shared/components/ui/Badge";
import { CalendarX2 } from "lucide-react";
import "@/features/cronograma/components/gantt.css";

export default function CronogramaPublico() {
  const { token = "" } = useParams<{ token: string }>();
  const [nivelZoom, setNivelZoom] = useState<NivelZoom>("day");
  const [dataFoco, setDataFoco] = useState<Date | null>(() => new Date());
  const [dataFiltroInicio, setDataFiltroInicio] = useState("");
  const [dataFiltroFim, setDataFiltroFim] = useState("");
  const [isDesktop, setIsDesktop] = useState(() =>
    typeof window !== "undefined" ? window.matchMedia("(min-width: 768px)").matches : true
  );
  const [mostrarGrade, setMostrarGrade] = useState(() => {
    if (typeof window !== "undefined") {
      return window.innerWidth >= 768;
    }
    return true;
  });

  useEffect(() => {
    document.title = "Cronograma Público — ZL Engenharia Solar";
  }, []);

  useEffect(() => {
    const mql = window.matchMedia("(min-width: 768px)");
    const handler = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, []);

  const {
    data: programacoes,
    isLoading: loadingProg,
    isError: erroProg,
    error: errorProg,
    refetch,
  } = useCronogramaPublico(token, {
    dataInicio: dataFiltroInicio || undefined,
    dataFim: dataFiltroFim || undefined,
  });
  const status = statusHttp(errorProg);

  const dadosFormatados: GanttTask[] = useMemo(() => {
    if (!programacoes || erroProg) return [];
    return programacoes.map((p) => {
      const nomeEquipe = `Equipe ${p.equipeId}`;
      const tituloObra = `Obra ${p.obraId}`;
      const fimNormalizado = p.dataFim;
      const duracaoCalculada = diasUteisCivis(p.dataInicio, fimNormalizado);

      return {
        id: p.id,
        text: tituloObra,
        start_date: dataCivilParaGanttPublico(p.dataInicio),
        end_date: dataCivilParaGanttPublico(fimNormalizado, 1),
        dataFimInclusiva: fimNormalizado,
        duration: duracaoCalculada,
        equipeId: p.equipeId,
        nomeEquipe,
        nomeCliente: tituloObra,
        duracaoDias: duracaoCalculada,
      };
    });
  }, [programacoes, erroProg]);

  const handleHoje = () => {
    setDataFoco(new Date());
  };

  const limparDatas = () => {
    setDataFiltroInicio("");
    setDataFiltroFim("");
  };

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-background-app">
      {/* Header Público Limpo (P04) */}
      <header className="bg-surface border-b border-border-subtle px-3 sm:px-4 py-1.5 flex flex-wrap items-center justify-between gap-2 shrink-0 no-print">
        <div className="flex items-center gap-2.5 min-w-0 max-w-full">
          <span className="w-7 h-7 shrink-0 rounded-md bg-primary text-primary-foreground flex items-center justify-center text-xs font-semibold">
            ZL
          </span>
          <div className="min-w-0 flex flex-wrap items-center gap-2">
            <h1 className="text-base font-bold text-foreground truncate">Cronograma de Obras</h1>
            <Badge comBorda className="font-medium">
              Somente leitura
            </Badge>
          </div>
        </div>

        <GanttToolbar
          nivelAtual={nivelZoom}
          onMudarNivel={setNivelZoom}
          onHoje={handleHoje}
          mostrarGrade={mostrarGrade}
          onToggleGrade={() => setMostrarGrade((prev) => !prev)}
          dataFiltroInicio={dataFiltroInicio}
          onDataInicioChange={isDesktop ? setDataFiltroInicio : undefined}
          dataFiltroFim={dataFiltroFim}
          onDataFimChange={isDesktop ? setDataFiltroFim : undefined}
          onLimparDatas={isDesktop ? limparDatas : undefined}
        />
      </header>

      {/* Conteúdo 100% área útil (P04) */}
      <main className="relative flex-1 min-h-0 flex flex-col overflow-hidden bg-surface">
        {loadingProg ? (
          <div className="flex h-full items-center justify-center">
            <FeedbackLoading mensagem="Carregando cronograma..." />
          </div>
        ) : erroProg ? (
          <FeedbackErro
            titulo={
              status === 404
                ? "Link inválido ou expirado"
                : status === 400
                ? "Confira os filtros de data"
                : "Não foi possível carregar o cronograma"
            }
            mensagem={
              status === 404
                ? "Confira o endereço recebido ou solicite um novo link."
                : status === 400
                ? "Corrija ou limpe as datas na barra superior."
                : "Verifique sua conexão e tente novamente."
            }
            onTentarNovamente={
              status === 400 || status === 404
                ? undefined
                : () => {
                    void refetch();
                  }
            }
          />
        ) : (
          <>
            {dadosFormatados.length === 0 && (
              <EmptyState
                className="absolute inset-0 z-20 bg-surface/95 backdrop-blur-xs flex items-center justify-center"
                icone={CalendarX2}
                titulo="Nenhuma alocação encontrada para este período"
                descricao="Ajuste ou limpe os filtros dentro do período compartilhado."
                acao={
                  dataFiltroInicio || dataFiltroFim
                    ? { label: "Limpar filtros", onClick: limparDatas }
                    : undefined
                }
              />
            )}

            <GanttDhtmlxWrapper
              tarefas={dadosFormatados}
              canDrag={false}
              nivelZoom={nivelZoom}
              focarData={dataFoco}
              mostrarGrade={mostrarGrade}
            />
          </>
        )}
      </main>
    </div>
  );
}
