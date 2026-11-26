import { gantt } from "dhtmlx-gantt";
import type { NivelZoom, GanttTask } from "@/features/cronograma/types/gantt";
import {
  ehLinhaProjeto,
  CLASSE_BOTAO_ALOCACAO,
  CLASSE_BOTAO_EQUIPE,
} from "@/features/cronograma/types/gantt";
import {
  dataGanttParaCivil,
  dataCivilParaGantt,
  fimGanttParaCivilInclusivo,
} from "@/features/cronograma/lib/datasGantt";
import { formatarDataBR } from "@/shared/lib/formatters";

export function ehCelulaHoje(
  ganttInstance: typeof gantt,
  date: Date,
  unidade: string,
  hojeCivil?: string,
): boolean {
  const hoje = hojeCivil ? dataCivilParaGantt(hojeCivil) : new Date();
  if (hojeCivil) {
    return date <= hoje && hoje < ganttInstance.date.add(date, 1, unidade);
  }
  return (
    date.getDate() === hoje.getDate() &&
    date.getMonth() === hoje.getMonth() &&
    date.getFullYear() === hoje.getFullYear()
  );
}

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
      label: "Obra / Janela",
      width: 216,
      min_width: 156,
      tree: true,
      resize: true,
      template: (rawTask: unknown) => {
        const task = rawTask as GanttTask;
        const texto = task.text || "";
        const ehGrupo = ehLinhaProjeto(task);
        const interativo = resolverTemOnSelectTask(temOnSelectTask);

        if (ehGrupo) {
          if (!interativo) return escaparHtml(texto);
          const estaAberto = Boolean(
            (task as unknown as { $open?: boolean }).$open ?? task.open
          );
          const rotuloEquipe = texto || task.nomeEquipe || `Equipe ${task.id}`;
          return `<button type="button" class="${CLASSE_BOTAO_EQUIPE}" data-task-id="${escaparHtml(task.id)}" aria-expanded="${estaAberto ? "true" : "false"}" aria-label="${escaparHtml(rotuloEquipe)}"><span class="gantt-btn-rotulo">${escaparHtml(rotuloEquipe)}</span></button>`;
        }

        const dataIni = task.start_date
          ? task.start_date instanceof Date
            ? dataGanttParaCivil(task.start_date)
            : String(task.start_date)
          : "";
        const dataFim =
          task.dataFimInclusiva ??
          (task.end_date
            ? task.end_date instanceof Date
              ? fimGanttParaCivilInclusivo(task.end_date)
              : fimGanttParaCivilInclusivo(dataCivilParaGantt(String(task.end_date)))
            : "");

        const iniBR = dataIni ? formatarDataBR(dataIni) : "";
        const fimBR = dataFim ? formatarDataBR(dataFim) : "";
        const iniCurto = iniBR && iniBR !== "—" ? iniBR.slice(0, 5) : "";
        const fimCurto = fimBR && fimBR !== "—" ? fimBR.slice(0, 5) : "";
        const janelaTexto =
          iniCurto && fimCurto ? `${iniCurto}–${fimCurto}` : iniCurto || fimCurto;

        const metaPartes = [
          janelaTexto,
          task.paineis !== undefined ? `${task.paineis} un.` : "",
        ]
          .filter(Boolean)
          .join(" · ");

        const cobHtml = task.equipeRotulo
          ? `<span class="gantt-opcaoa-cob ${(task.pessoasFaltantes ?? 0) > 0 ? "is-incompleta" : "is-completa"}" title="Equipe vinculada / prevista">${escaparHtml(task.equipeRotulo)}</span>`
          : "";

        const rotuloVisivel =
          texto ||
          (task.nomeCliente ? String(task.nomeCliente) : `Obra ${task.id}`);
        const conteudoOpcaoA = `<span class="gantt-opcaoa-texto"><span class="gantt-btn-rotulo">${escaparHtml(rotuloVisivel)}</span>${metaPartes ? `<span class="gantt-opcaoa-meta">${escaparHtml(metaPartes)}</span>` : ""}</span>${cobHtml}`;

        if (!interativo) {
          return `<div class="gantt-opcaoa-readonly">${conteudoOpcaoA}</div>`;
        }

        const partesAcessiveis = [rotuloVisivel];
        if (metaPartes) {
          partesAcessiveis.push(metaPartes);
        }
        if (task.nomeEquipe && !rotuloVisivel.includes(task.nomeEquipe)) {
          partesAcessiveis.push(task.nomeEquipe);
        }
        const rotuloAcessivel = partesAcessiveis.join(" — ");

        return `<button type="button" class="${CLASSE_BOTAO_ALOCACAO}" data-task-id="${escaparHtml(task.id)}" aria-label="${escaparHtml(rotuloAcessivel)}">${conteudoOpcaoA}</button>`;
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
  ganttInstance.config.row_height = resolverTemOnSelectTask(opcoes.temOnSelectTask) ? 44 : 40;
  ganttInstance.config.bar_height = 24;

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
const INICIAIS_SEMANA = ["D", "S", "T", "Q", "Q", "S", "S"];

export function aplicarConfiguracaoZoom(
  ganttInstance: typeof gantt,
  nivelZoom: NivelZoom,
  obterHojeCivil?: () => string | undefined,
): void {
  const cssCelulaEscala = (unidade: string) => (date: Date) => {
    const classes: string[] = [];
    if (unidade === "day" && (date.getDay() === 0 || date.getDay() === 6)) {
      classes.push("weekend");
    }
    if (ehCelulaHoje(ganttInstance, date, unidade, obterHojeCivil?.())) {
      classes.push("today-head");
    }
    return classes.join(" ");
  };

  switch (nivelZoom) {
    case "day":
      ganttInstance.config.scale_height = 42;
      ganttInstance.config.scales = [
        { unit: "month", step: 1, format: "%M %Y", css: () => "gantt-scale-top" },
        {
          unit: "day",
          step: 1,
          format: (date: Date) =>
            `<div class="gantt-day-cell"><span class="gantt-day-week">${INICIAIS_SEMANA[date.getDay()]}</span><span class="gantt-day-num">${String(date.getDate()).padStart(2, "0")}</span></div>`,
          css: cssCelulaEscala("day"),
        },
      ];
      ganttInstance.config.min_column_width = 44;
      break;
    case "week":
      ganttInstance.config.scale_height = 42;
      ganttInstance.config.scales = [
        { unit: "month", step: 1, format: "%M %Y", css: () => "gantt-scale-top" },
        {
          unit: "day",
          step: 1,
          format: (date: Date) =>
            `<span class="gantt-day-num-compact">${String(date.getDate()).padStart(2, "0")}</span>`,
          css: cssCelulaEscala("day"),
        },
      ];
      ganttInstance.config.min_column_width = 28;
      break;
    case "month":
      ganttInstance.config.scale_height = 42;
      ganttInstance.config.scales = [
        { unit: "year", step: 1, format: "%Y", css: () => "gantt-scale-top" },
        {
          unit: "month",
          step: 1,
          format: "%M",
          css: cssCelulaEscala("month"),
        },
      ];
      ganttInstance.config.min_column_width = 60;
      break;
  }
}
