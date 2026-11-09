import { gantt as ganttPadrao } from "dhtmlx-gantt";
import type { GanttTask } from "@/features/cronograma/types/gantt";
import {
  dataGanttParaCivil,
  fimGanttParaCivilInclusivo,
} from "@/features/cronograma/lib/datasGantt";
import { diasUteisCivis } from "@/shared/lib/datasCivis";
import {
  formatarDiasUteis,
  formatarDataBR,
} from "@/shared/lib/formatters";

export function configurarTemplatesGantt(ganttInstance: typeof ganttPadrao = ganttPadrao): void {
  const gantt = ganttInstance;
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
      if (task.type === "project") {
        return "gantt-project-team";
      }
      if (task.statusObra === "Assistencia") {
        return "gantt-material-assistencia";
      }
      if (task.materialPronto === true) {
        return "gantt-material-pronto";
      }
      if (task.materialPronto === false) {
        return "gantt-material-pendente";
      }
      const indice = (Number(task.equipeId) % 8) || 8;
      return `gantt-color-${indice}`;
    };

    gantt.templates.grid_row_class = (_start: Date, _end: Date, rawTask: unknown) => {
      const task = rawTask as GanttTask;
      return task.type === "project" ? "gantt-row-project" : "";
    };

    gantt.templates.task_text = (_start: Date, _end: Date, rawTask: unknown) => {
      const task = rawTask as GanttTask;
      if (task.type === "project") {
        return `<strong>${task.text || ""}</strong>`;
      }
      const matBadge = task.materialPronto
        ? `<span class="gantt-bar-badge" title="Materiais prontos p/ obra">📦</span>`
        : "";
      const homBadge = task.homologacaoOk
        ? `<span class="gantt-bar-badge" title="Homologação concluída na concessionária">⚡</span>`
        : "";
      const rotuloBarra = task.nomeCliente || task.text || "";
      return `<span>${rotuloBarra}</span> ${matBadge} ${homBadge}`;
    };

    // Tooltip dinâmico com guard para nó de projeto
    gantt.templates.tooltip_text = (start: Date, end: Date, rawTask: unknown) => {
      const task = rawTask as GanttTask;
      const dataIniCivil = dataGanttParaCivil(start);
      const dataFimCivil =
        task.dataFimInclusiva ?? fimGanttParaCivilInclusivo(end);
      const dataIni = formatarDataBR(dataIniCivil);
      const dataFim = formatarDataBR(dataFimCivil);

      if (task.type === "project") {
        return `<div class="tooltip-title">${task.text}</div><div class="tooltip-row"><span class="tooltip-label">Período:</span> <span class="tooltip-value">${dataIni} — ${dataFim}</span></div>`;
      }

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
        const dur = task.duracaoDias ?? diasUteisCivis(dataIniCivil, dataFimCivil);
        if (dur > 0) {
          linhas.push(`<div class="tooltip-row"><span class="tooltip-label">Duração:</span> <span class="tooltip-value">${formatarDiasUteis(dur)}</span></div>`);
        }
      }

      if (task.materialPronto !== undefined || task.statusObra !== undefined) {
        linhas.push(`<div class="tooltip-row"><span class="tooltip-label">Materiais:</span> <span class="tooltip-value">${matRotulo}</span></div>`);
      }

      if (task.homologacaoOk !== undefined) {
        linhas.push(`<div class="tooltip-row"><span class="tooltip-label">Homologação:</span> <span class="tooltip-value">${task.homologacaoOk ? "Parecer Aprovado ⚡" : "Em análise / pendente"}</span></div>`);
      }

      return linhas.join("");
    };

}
