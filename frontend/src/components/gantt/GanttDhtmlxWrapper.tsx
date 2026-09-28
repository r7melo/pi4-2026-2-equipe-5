import { useEffect, useRef } from "react";
import "dhtmlx-gantt/codebase/dhtmlxgantt.css";
import { gantt } from "dhtmlx-gantt";
import type { NivelZoom } from "./GanttToolbar";

interface GanttTask {
  id: number;
  text: string;
  start_date: string;
  end_date: string;
  equipeId: number;
  /** Dados extras para o tooltip */
  nomeEquipe?: string;
  nomeCliente?: string;
  paineis?: number;
  duracaoDias?: number;
}

interface GanttWrapperProps {
  tarefas: GanttTask[];
  canDrag: boolean;
  nivelZoom: NivelZoom;
  focarData?: Date | null;
  onReorder: (id: number, novaData: string, novaDataFim: string) => void;
}

export function GanttDhtmlxWrapper({ tarefas, canDrag, nivelZoom, focarData, onReorder }: GanttWrapperProps) {
  const container = useRef<HTMLDivElement>(null);
  const onReorderRef = useRef(onReorder);
  const inicializado = useRef(false);

  useEffect(() => { onReorderRef.current = onReorder; }, [onReorder]);

  // Inicialização do Gantt (uma única vez)
  useEffect(() => {
    if (inicializado.current) return;

    // Plugins
    gantt.plugins({ tooltip: true });

    // Locale
    gantt.i18n.setLocale("pt_br");

    // Configuração geral
    gantt.config.details_on_dblclick = false;
    gantt.config.show_links = false;
    gantt.config.show_progress = false;
    gantt.config.date_format = "%Y-%m-%d";
    gantt.config.row_height = 40;
    gantt.config.bar_height = 28;

    // Grid columns
    gantt.config.columns = [
      { name: "text", label: "Obra", width: 220, tree: true },
      { name: "duration", label: "Dias", align: "center", width: 50 },
    ];

    // Weekends como não-trabalho (RF-09)
    gantt.config.work_time = true;
    gantt.setWorkTime({ day: 0, hours: false }); // Domingo
    gantt.setWorkTime({ day: 6, hours: false }); // Sábado

    // Template: weekends grayed-out e destaque de "Hoje"
    gantt.templates.timeline_cell_class = (_item: any, date: Date) => {
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

    // Template: cor da barra por equipeId
    gantt.templates.task_class = (_start: Date, _end: Date, task: any) => {
      const indice = (task.equipeId % 8) || 8;
      return `gantt-color-${indice}`;
    };

    // Tooltip rico
    gantt.templates.tooltip_text = (_start: Date, _end: Date, task: any) => {
      const dataIni = task.start_date instanceof Date
        ? task.start_date.toLocaleDateString("pt-BR")
        : String(task.start_date);
      const dataFim = task.end_date instanceof Date
        ? task.end_date.toLocaleDateString("pt-BR")
        : String(task.end_date);

      return `
        <div class="tooltip-title">${task.text || ""}</div>
        <div class="tooltip-row"><span class="tooltip-label">Equipe:</span> <span class="tooltip-value">${task.nomeEquipe || "—"}</span></div>
        <div class="tooltip-row"><span class="tooltip-label">Cliente:</span> <span class="tooltip-value">${task.nomeCliente || "—"}</span></div>
        <div class="tooltip-row"><span class="tooltip-label">Painéis:</span> <span class="tooltip-value">${task.paineis !== undefined ? task.paineis + " un." : "—"}</span></div>
        <div class="tooltip-row"><span class="tooltip-label">Período:</span> <span class="tooltip-value">${dataIni} — ${dataFim}</span></div>
        <div class="tooltip-row"><span class="tooltip-label">Duração:</span> <span class="tooltip-value">${task.duracaoDias ?? task.duration ?? "—"} dias úteis</span></div>
      `;
    };

    // Drag & Drop
    gantt.config.drag_move = canDrag;
    gantt.config.drag_resize = false;
    gantt.config.drag_progress = false;
    gantt.config.drag_links = false;

    gantt.init(container.current!);
    inicializado.current = true;

    const eventId = gantt.attachEvent("onAfterTaskDrag", (id) => {
      const task = gantt.getTask(id);
      const formatter = gantt.date.date_to_str("%Y-%m-%d");
      onReorderRef.current(Number(id), formatter(task.start_date), formatter(task.end_date));
    });

    return () => {
      gantt.clearAll();
      gantt.detachEvent(eventId);
      inicializado.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Atualizar drag permission quando canDrag muda
  useEffect(() => {
    if (!inicializado.current) return;
    gantt.config.drag_move = canDrag;
  }, [canDrag]);

  // Focar em uma data específica de forma declarativa (React-way)
  useEffect(() => {
    if (focarData && inicializado.current) {
      gantt.showDate(focarData);
    }
  }, [focarData]);

  // Zoom: mudar escala quando o nível muda
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

  // Re-parse dados preservando scroll
  useEffect(() => {
    if (!inicializado.current) return;
    const scrollState = gantt.getScrollState();
    gantt.clearAll();
    gantt.parse({ data: tarefas });
    gantt.scrollTo(scrollState.x, scrollState.y);
  }, [tarefas]);

  return <div ref={container} style={{ width: "100%", height: "100%" }} />;
}
