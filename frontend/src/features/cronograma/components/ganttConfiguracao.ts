import { gantt } from "dhtmlx-gantt";
import type { NivelZoom, GanttTask } from "@/features/cronograma/types/gantt";
import { ehLinhaProjeto } from "@/features/cronograma/types/gantt";
import {
  dataGanttParaCivil,
  dataCivilParaGantt,
  fimGanttParaCivilInclusivo,
} from "@/features/cronograma/lib/datasGantt";
import { formatarDataBR } from "@/shared/lib/formatters";

export function escaparHtml(valor: string | number): string {
  return String(valor)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export type VerificadorOnSelectTask =
  | boolean
  | (() => boolean)
  | { readonly current?: unknown };

export function resolverTemOnSelectTask(
  verificador?: VerificadorOnSelectTask
): boolean {
  if (typeof verificador === "function") {
    return Boolean(verificador());
  }
  if (
    typeof verificador === "object" &&
    verificador !== null &&
    "current" in verificador
  ) {
    return Boolean(verificador.current);
  }
  return Boolean(verificador);
}

export function obterColunasGantt(temOnSelectTask?: VerificadorOnSelectTask) {
  return [
    {
      name: "text",
      label: "Obra",
      width: 200,
      min_width: 130,
      tree: true,
      resize: true,
      template: (rawTask: unknown) => {
        const task = rawTask as GanttTask;
        const texto = task.text || "";
        if (!resolverTemOnSelectTask(temOnSelectTask)) {
          return escaparHtml(texto);
        }
        const ehGrupo = ehLinhaProjeto(task);

        if (ehGrupo) {
          const estaAberto = Boolean(
            (task as unknown as { $open?: boolean }).$open ?? task.open
          );
          const rotuloEquipe = texto || task.nomeEquipe || `Equipe ${task.id}`;
          return `<button type="button" class="gantt-btn-equipe" data-task-id="${escaparHtml(task.id)}" aria-expanded="${estaAberto ? "true" : "false"}" aria-label="${escaparHtml(rotuloEquipe)}"><span class="gantt-btn-rotulo">${escaparHtml(rotuloEquipe)}</span></button>`;
        }

        const rotuloVisivel =
          texto ||
          (task.nomeCliente ? String(task.nomeCliente) : `Obra ${task.id}`);
        const partesAcessiveis = [rotuloVisivel];
        if (task.nomeEquipe && !rotuloVisivel.includes(task.nomeEquipe)) {
          partesAcessiveis.push(task.nomeEquipe);
        }
        if (task.nomeCliente && !rotuloVisivel.includes(task.nomeCliente)) {
          partesAcessiveis.push(task.nomeCliente);
        }
        const rotuloAcessivel = partesAcessiveis.join(" — ");

        return `<button type="button" class="gantt-btn-alocacao" data-task-id="${escaparHtml(task.id)}" aria-label="${escaparHtml(rotuloAcessivel)}"><span class="gantt-btn-rotulo">${escaparHtml(rotuloVisivel)}</span></button>`;
      },
    },
      {
        name: "start_date",
        label: "Início",
        align: "center",
        width: 85,
        min_width: 70,
        resize: true,
        template: (rawTask: unknown) => {
          const task = rawTask as GanttTask;
          if (!task.start_date) return "—";
          const dataIni =
            task.start_date instanceof Date
              ? dataGanttParaCivil(task.start_date)
              : String(task.start_date);
          return formatarDataBR(dataIni);
        },
      },
      {
        name: "end_date",
        label: "Fim",
        align: "center",
        width: 85,
        min_width: 70,
        resize: true,
        template: (rawTask: unknown) => {
          const task = rawTask as GanttTask;
          if (!task.end_date && !task.dataFimInclusiva) return "—";
          const dataFim =
            task.dataFimInclusiva ??
            (task.end_date instanceof Date
              ? fimGanttParaCivilInclusivo(task.end_date)
              : fimGanttParaCivilInclusivo(dataCivilParaGantt(String(task.end_date))));
          return formatarDataBR(dataFim);
        },
      },
    ];

}

export interface ConfiguracaoBaseGanttOpcoes {
  mostrarGrade: boolean;
  temOnSelectTask?: VerificadorOnSelectTask;
}

export function configurarDhtmlxBase(
  ganttInstance: typeof gantt,
  opcoes: ConfiguracaoBaseGanttOpcoes
): void {
  ganttInstance.plugins({ tooltip: true });
  ganttInstance.i18n.setLocale("pt_br");

  ganttInstance.config.tooltip_hide_timeout = 30;
  ganttInstance.config.tooltip_timeout = 150;

  ganttInstance.config.details_on_dblclick = false;
  ganttInstance.config.show_links = false;
  ganttInstance.config.show_progress = false;
  ganttInstance.config.date_format = "%Y-%m-%d";
  ganttInstance.config.row_height = resolverTemOnSelectTask(opcoes.temOnSelectTask) ? 48 : 40;
  ganttInstance.config.bar_height = 28;

  // Configuração de Anti-Reparenting: impede arraste vertical entre equipes
  ganttInstance.config.order_branch = false;
  ganttInstance.config.order_branch_free = false;

  // Habilita redimensionamento individual e independente de colunas e da grade inteira
  ganttInstance.config.grid_resize = true;
  ganttInstance.config.keep_grid_width = false;

  ganttInstance.config.show_grid = opcoes.mostrarGrade;
  ganttInstance.config.columns = obterColunasGantt(opcoes.temOnSelectTask);

  ganttInstance.config.work_time = false;
  ganttInstance.config.correct_work_time = false;
  ganttInstance.config.round_dnd_dates = false;
  ganttInstance.config.time_step = 1440;
}
export function aplicarConfiguracaoZoom(
  ganttInstance: typeof gantt,
  nivelZoom: NivelZoom
): void {
  switch (nivelZoom) {
    case "day":
      ganttInstance.config.scale_height = 54;
      ganttInstance.config.scales = [
        { unit: "month", step: 1, format: "%F %Y" },
        { unit: "day", step: 1, format: "%d %D" },
      ];
      ganttInstance.config.min_column_width = 40;
      break;
    case "week":
      ganttInstance.config.scale_height = 54;
      ganttInstance.config.scales = [
        { unit: "month", step: 1, format: "%F %Y" },
        { unit: "week", step: 1, format: "Sem %W" },
      ];
      ganttInstance.config.min_column_width = 80;
      break;
    case "month":
      ganttInstance.config.scale_height = 54;
      ganttInstance.config.scales = [
        { unit: "year", step: 1, format: "%Y" },
        { unit: "month", step: 1, format: "%M" },
      ];
      ganttInstance.config.min_column_width = 60;
      break;
  }
}
