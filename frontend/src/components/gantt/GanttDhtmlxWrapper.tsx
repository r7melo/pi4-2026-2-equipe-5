import { useEffect, useRef } from "react";
import "dhtmlx-gantt/codebase/dhtmlxgantt.css";
import { gantt } from "dhtmlx-gantt";
import type { NivelZoom } from "./GanttToolbar";
import {
  formatarDiasUteis,
  formatarDataBR,
  dataFimExclusivaParaUltimoDiaUtil,
  normalizarDataMeioDiaUTC,
  formatarDataISO,
  calcularDiasUteisEntre,
  proximoDiaUtil,
  adicionarDiasUteis,
} from "@/lib/formatters";

export interface GanttTask {
  id: number;
  text: string;
  start_date: string;
  end_date: string;
  duration?: number;
  equipeId: number;
  nomeEquipe?: string;
  nomeCliente?: string;
  paineis?: number;
  duracaoDias?: number;
  statusObra?: string;
  materialPronto?: boolean;
  homologacaoOk?: boolean;
}

interface GanttWrapperProps {
  tarefas: GanttTask[];
  canDrag: boolean;
  nivelZoom: NivelZoom;
  focarData?: Date | null;
  mostrarGrade?: boolean;
  onReorder?: (id: number, novaData: string, novaDataFim: string) => void;
  onSelectTask?: (id: number) => void;
}

export function GanttDhtmlxWrapper({
  tarefas,
  canDrag,
  nivelZoom,
  focarData,
  mostrarGrade = true,
  onReorder,
  onSelectTask,
}: GanttWrapperProps) {
  const container = useRef<HTMLDivElement>(null);
  const onReorderRef = useRef(onReorder);
  const onSelectTaskRef = useRef(onSelectTask);
  const canDragRef = useRef(canDrag);
  const mostrarGradeRef = useRef(mostrarGrade);
  const inicializado = useRef(false);
  const dragEmAndamentoRef = useRef(false);

  useEffect(() => {
    onReorderRef.current = onReorder;
  }, [onReorder]);

  useEffect(() => {
    onSelectTaskRef.current = onSelectTask;
  }, [onSelectTask]);

  useEffect(() => {
    canDragRef.current = canDrag;
    if (inicializado.current) {
      gantt.config.drag_move = canDrag;
      gantt.config.drag_resize = canDrag;
    }
  }, [canDrag]);

  useEffect(() => {
    mostrarGradeRef.current = mostrarGrade;
  }, [mostrarGrade]);

  useEffect(() => {
    if (inicializado.current) return;

    gantt.plugins({ tooltip: true });
    gantt.i18n.setLocale("pt_br");

    gantt.config.tooltip_hide_timeout = 30;
    gantt.config.tooltip_timeout = 150;

    gantt.config.details_on_dblclick = false;
    gantt.config.show_links = false;
    gantt.config.show_progress = false;
    gantt.config.date_format = "%Y-%m-%d";
    gantt.config.row_height = 40;
    gantt.config.bar_height = 28;

    gantt.config.show_grid = mostrarGradeRef.current;
    gantt.config.columns = [
      { name: "text", label: "Obra", width: 220, tree: true },
      {
        name: "duration",
        label: "Dias",
        align: "center",
        width: 50,
        template: (rawTask: unknown) => {
          const task = rawTask as GanttTask;
          const dur = Math.max(
            1,
            task.duracaoDias ||
              calcularDiasUteisEntre(task.start_date, task.end_date) ||
              1
          );
          return `${dur}`;
        },
      },
    ];

    // Weekends como não-trabalho e ajuste automático no drop (RF-08, RF-09)
    gantt.config.work_time = true;
    gantt.config.correct_work_time = true;
    gantt.setWorkTime({ day: 0, hours: false });
    gantt.setWorkTime({ day: 6, hours: false });

    gantt.templates.timeline_cell_class = (_item: unknown, date: Date) => {
      const classes = [];
      if (date.getDay() === 0 || date.getDay() === 6) classes.push("weekend");

      const hoje = new Date();
      if (
        date.getDate() === hoje.getDate() &&
        date.getMonth() === hoje.getMonth() &&
        date.getFullYear() === hoje.getFullYear()
      ) {
        classes.push("today-cell");
      }
      return classes.join(" ");
    };

    gantt.templates.scale_cell_class = (date: Date) => {
      if (date.getDay() === 0 || date.getDay() === 6) return "weekend";
      return "";
    };

    gantt.templates.task_class = (_start: Date, _end: Date, rawTask: unknown) => {
      const task = rawTask as GanttTask;
      const indice = (Number(task.equipeId) % 8) || 8;
      return `gantt-color-${indice}`;
    };

    gantt.templates.task_text = (_start: Date, _end: Date, rawTask: unknown) => {
      const task = rawTask as GanttTask;
      const matBadge = task.materialPronto
        ? `<span class="gantt-bar-badge" title="Materiais prontos p/ obra">📦</span>`
        : "";
      const homBadge = task.homologacaoOk
        ? `<span class="gantt-bar-badge" title="Homologação concluída na concessionária">⚡</span>`
        : "";
      const rotuloBarra = task.nomeCliente || task.text || "";
      return `<span>${rotuloBarra}</span> ${matBadge} ${homBadge}`;
    };

    // Tooltip dinâmico: oculta linhas de materiais e homologação se os dados forem undefined (ex: tela pública)
    gantt.templates.tooltip_text = (start: Date, end: Date, rawTask: unknown) => {
      const task = rawTask as GanttTask;
      const dataIni = formatarDataBR(formatarDataISO(start));
      const ultimoDiaUtil = dataFimExclusivaParaUltimoDiaUtil(end);
      const dataFim = formatarDataBR(ultimoDiaUtil);
      const matRotulo =
        task.statusObra === "Assistencia"
          ? "Peças p/ Manutenção 🔧"
          : task.materialPronto
          ? "Separado p/ Obra 📦"
          : "Em trânsito / depósito";

      const linhas = [
        `<div class="tooltip-title">${task.text || ""}</div>`,
        `<div class="tooltip-row"><span class="tooltip-label">Equipe:</span> <span class="tooltip-value">${task.nomeEquipe || "—"}</span></div>`,
        `<div class="tooltip-row"><span class="tooltip-label">Cliente:</span> <span class="tooltip-value">${task.nomeCliente || "—"}</span></div>`,
      ];

      if (task.paineis !== undefined) {
        linhas.push(`<div class="tooltip-row"><span class="tooltip-label">Painéis:</span> <span class="tooltip-value">${task.paineis} un.</span></div>`);
      }

      linhas.push(`<div class="tooltip-row"><span class="tooltip-label">Período:</span> <span class="tooltip-value">${dataIni} — ${dataFim}</span></div>`);

      if (task.duracaoDias !== undefined || task.duration !== undefined) {
        const dur = Math.max(
          1,
          task.duracaoDias ||
            calcularDiasUteisEntre(start, end) ||
            1
        );
        linhas.push(`<div class="tooltip-row"><span class="tooltip-label">Duração:</span> <span class="tooltip-value">${formatarDiasUteis(dur)}</span></div>`);
      }

      if (task.materialPronto !== undefined || task.statusObra !== undefined) {
        linhas.push(`<div class="tooltip-row"><span class="tooltip-label">Materiais:</span> <span class="tooltip-value">${matRotulo}</span></div>`);
      }

      if (task.homologacaoOk !== undefined) {
        linhas.push(`<div class="tooltip-row"><span class="tooltip-label">Homologação:</span> <span class="tooltip-value">${task.homologacaoOk ? "Parecer Aprovado ⚡" : "Em análise / pendente"}</span></div>`);
      }

      return linhas.join("");
    };

    gantt.config.drag_move = canDragRef.current;
    gantt.config.drag_resize = canDragRef.current;
    gantt.config.drag_progress = false;
    gantt.config.drag_links = false;

    gantt.init(container.current!);
    inicializado.current = true;

    const esconderTooltipDhtmlx = () => {
      try {
        (gantt as unknown as { ext?: { tooltips?: { tooltip?: { hide?: () => void } } } })
          .ext?.tooltips?.tooltip?.hide?.();
      } catch {
        // Silencia exceções
      }
      document.querySelectorAll(".gantt_tooltip").forEach((el) => {
        (el as HTMLElement).style.display = "none";
      });
    };

    const containerEl = container.current;
    containerEl?.addEventListener("mouseleave", esconderTooltipDhtmlx);

    const mouseMoveEventId = gantt.attachEvent("onMouseMove", (id) => {
      if (!id) {
        esconderTooltipDhtmlx();
      }
      return true;
    });

    const scrollEventId = gantt.attachEvent("onGanttScroll", () => {
      esconderTooltipDhtmlx();
      return true;
    });

    const handleDocumentMouseMove = (e: MouseEvent) => {
      const tooltipEl = document.querySelector(".gantt_tooltip") as HTMLElement | null;
      if (!tooltipEl || tooltipEl.style.display === "none") return;

      const target = e.target as Element | null;
      const estaSobreBarra = Boolean(target?.closest?.(".gantt_task_line"));
      if (!estaSobreBarra) {
        esconderTooltipDhtmlx();
      }
    };

    const handleWindowMouseOut = (e: MouseEvent) => {
      if (!e.relatedTarget) {
        esconderTooltipDhtmlx();
      }
    };

    document.addEventListener("mousemove", handleDocumentMouseMove, { passive: true });
    window.addEventListener("mouseout", handleWindowMouseOut, { passive: true });

    const dragEventId = gantt.attachEvent("onAfterTaskDrag", (id, mode) => {
      dragEmAndamentoRef.current = true;
      setTimeout(() => {
        dragEmAndamentoRef.current = false;
      }, 150);

      const task = gantt.getTask(id) as Omit<GanttTask, "start_date" | "end_date"> & {
        start_date: Date;
        end_date: Date;
        duracaoDias?: number;
        duration?: number;
      };

      if (mode === "resize") {
        // Preserva ou ajusta o início para dia útil caso redimensionado pela alça esquerda sobre fim de semana
        const dataInicioObj = proximoDiaUtil(normalizarDataMeioDiaUTC(task.start_date));
        const dataFimObjBruta = normalizarDataMeioDiaUTC(task.end_date);

        // Calcula estritamente os dias úteis selecionados pelo arraste
        const diasCalculados = calcularDiasUteisEntre(dataInicioObj, dataFimObjBruta);
        const duracaoFinal = Math.max(1, diasCalculados);
        const dataFimObj = adicionarDiasUteis(dataInicioObj, duracaoFinal);

        // Sincronização simétrica no objeto interno em memória do DHTMLX:
        // Blindagem contra race conditions se o usuário interagir novamente antes do ciclo assíncrono do React
        task.start_date = dataInicioObj;
        task.end_date = dataFimObj;
        task.duracaoDias = duracaoFinal;
        task.duration = duracaoFinal;

        const novaDataInicioStr = formatarDataISO(dataInicioObj);
        const novaDataFimStr = formatarDataISO(dataFimObj);

        onReorderRef.current?.(Number(id), novaDataInicioStr, novaDataFimStr);
      } else {
        // Movimento completo da barra: preserva SEMPRE a duração em dias úteis original (duracaoDias)
        // Fallback defensivo calcula dias úteis entre datas, NUNCA recorre a task.duration (dias corridos do DHTMLX)
        const duracaoOriginal =
          task.duracaoDias ||
          calcularDiasUteisEntre(task.start_date, task.end_date) ||
          1;
        const duracao = Math.max(1, duracaoOriginal);
        const dataInicioObj = proximoDiaUtil(normalizarDataMeioDiaUTC(task.start_date));
        const dataFimObj = adicionarDiasUteis(dataInicioObj, duracao);

        // Sincronização simétrica no objeto interno em memória do DHTMLX
        task.start_date = dataInicioObj;
        task.end_date = dataFimObj;
        task.duracaoDias = duracao;
        task.duration = duracao;

        const novaDataInicioStr = formatarDataISO(dataInicioObj);
        const novaDataFimStr = formatarDataISO(dataFimObj);

        onReorderRef.current?.(Number(id), novaDataInicioStr, novaDataFimStr);
      }
    });

    const clickEventId = gantt.attachEvent("onTaskClick", (id) => {
      // Bloqueia clique se houve arraste de tarefa
      if (dragEmAndamentoRef.current) {
        return true;
      }
      esconderTooltipDhtmlx();
      if (id) {
        onSelectTaskRef.current?.(Number(id));
      }
      return true;
    });

    return () => {
      document.removeEventListener("mousemove", handleDocumentMouseMove);
      window.removeEventListener("mouseout", handleWindowMouseOut);
      containerEl?.removeEventListener("mouseleave", esconderTooltipDhtmlx);
      esconderTooltipDhtmlx();
      document.querySelectorAll(".gantt_tooltip").forEach((el) => el.remove());
      gantt.clearAll();
      gantt.detachEvent(dragEventId);
      gantt.detachEvent(clickEventId);
      gantt.detachEvent(mouseMoveEventId);
      gantt.detachEvent(scrollEventId);
      inicializado.current = false;
    };
  }, []);

  // Atualização dinâmica da visibilidade da grade esquerda
  useEffect(() => {
    if (!inicializado.current) return;
    gantt.config.show_grid = mostrarGrade;
    gantt.render();
  }, [mostrarGrade]);

  useEffect(() => {
    if (focarData && inicializado.current) {
      gantt.showDate(focarData);
    }
  }, [focarData]);

  useEffect(() => {
    if (!inicializado.current) return;

    switch (nivelZoom) {
      case "day":
        gantt.config.scale_height = 54;
        gantt.config.scales = [
          { unit: "month", step: 1, format: "%F %Y" },
          { unit: "day", step: 1, format: "%d %D" },
        ];
        gantt.config.min_column_width = 40;
        break;
      case "week":
        gantt.config.scale_height = 54;
        gantt.config.scales = [
          { unit: "month", step: 1, format: "%F %Y" },
          { unit: "week", step: 1, format: "Sem %W" },
        ];
        gantt.config.min_column_width = 80;
        break;
      case "month":
        gantt.config.scale_height = 54;
        gantt.config.scales = [
          { unit: "year", step: 1, format: "%Y" },
          { unit: "month", step: 1, format: "%M" },
        ];
        gantt.config.min_column_width = 60;
        break;
    }

    gantt.render();
  }, [nivelZoom]);

  useEffect(() => {
    if (!inicializado.current) return;
    const scrollState = gantt.getScrollState();
    gantt.clearAll();
    gantt.parse({ data: tarefas });
    gantt.scrollTo(scrollState.x, scrollState.y);
  }, [tarefas]);

  return <div ref={container} className="flex-1 w-full min-h-0" style={{ width: "100%", height: "100%" }} />;
}
