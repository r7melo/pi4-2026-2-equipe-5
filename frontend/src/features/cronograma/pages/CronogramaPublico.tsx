// frontend/src/pages/CronogramaPublico.tsx
// RF-16 & Rota #37: Tela de Visualização Pública Somente-Leitura do Cronograma Gantt
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
import type { NivelZoom } from "@/types";
import FeedbackLoading from "@/shared/components/feedback/FeedbackLoading";
import FeedbackErro from "@/shared/components/feedback/FeedbackErro";
import { EmptyState } from "@/shared/components/feedback/EmptyState";
import { CalendarX2, Shield, Sun } from "lucide-react";
import "@/features/cronograma/components/gantt.css";

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
      const nomeCliente = `Obra #${p.obraId}`;
      const fimNormalizado = p.dataFim;
      const duracaoCalculada = diasUteisCivis(p.dataInicio, fimNormalizado);

      return {
        id: p.id,
        text: `${nomeEquipe} — ${nomeCliente}`,
        start_date: dataCivilParaGanttPublico(p.dataInicio),
        end_date: dataCivilParaGanttPublico(fimNormalizado, 1),
        dataFimInclusiva: fimNormalizado,
        duration: duracaoCalculada,
        equipeId: p.equipeId,
        nomeEquipe,
        nomeCliente,
        duracaoDias: duracaoCalculada,
      };
    });
  }, [programacoes, erroProg]);

  const handleHoje = () => {
    setDataFoco(new Date());
  };

  const handleImprimir = () => {
    window.print();
  };

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
          {loadingProg ? (
            <div className="flex h-full items-center justify-center"><FeedbackLoading mensagem="Carregando cronograma..." /></div>
          ) : erroProg ? (
            <FeedbackErro
              titulo={status === 404 ? "Link inválido ou expirado" : status === 400 ? "Confira os filtros de data" : "Não foi possível carregar o cronograma"}
              mensagem={status === 404 ? "Confira o endereço recebido ou solicite um novo link." : status === 400 ? "Corrija ou limpe as datas na barra superior." : "Verifique sua conexão e tente novamente."}
              onTentarNovamente={status === 400 || status === 404 ? undefined : () => { void refetch(); }}
            />
          ) : (
          <>
          {dadosFormatados.length === 0 && (
            <EmptyState
              className="absolute inset-0 z-20 bg-surface/95 backdrop-blur-xs flex items-center justify-center animate-fade-in"
              icone={CalendarX2}
              titulo="Nenhuma alocação encontrada para este período"
              descricao="Ajuste ou limpe os filtros dentro do período compartilhado."
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
