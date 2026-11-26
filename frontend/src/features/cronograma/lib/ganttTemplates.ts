import { gantt as ganttPadrao } from "dhtmlx-gantt";
import type { GanttTask } from "@/features/cronograma/types/gantt";
import {
  dataGanttParaCivil,
  fimGanttParaCivilInclusivo,
} from "@/features/cronograma/lib/datasGantt";
import {
  ehCelulaHoje,
  escaparHtml,
} from "@/features/cronograma/lib/ganttConfiguracao";
import { diasUteisCivis } from "@/shared/lib/datasCivis";
import { formatarDataBR } from "@/shared/lib/formatters";

const TOOLTIP_STATUS_META: Record<
  string,
  { label: string; tone: "success" | "info" | "warning"; mat: string; matTone: "success" | "info" | "warning" }
> = {
  Separado: { label: "Separado", tone: "success", mat: "Kit Pronto / Separado", matTone: "success" },
  Concluido: { label: "Concluído", tone: "success", mat: "Kit Pronto / Separado", matTone: "success" },
  EmAndamento: { label: "Em Andamento", tone: "info", mat: "Kit Pronto / Separado", matTone: "success" },
  NoDeposito: { label: "No Depósito", tone: "info", mat: "No Depósito", matTone: "info" },
  MaterialComprado: { label: "Material Comprado", tone: "warning", mat: "Comprado", matTone: "warning" },
  Assistencia: { label: "Assistência", tone: "warning", mat: "Assistência", matTone: "warning" },
};

export function configurarTemplatesGantt(
  ganttInstance: typeof ganttPadrao = ganttPadrao,
  obterHojeCivil?: () => string | undefined,
): void {
  const gantt = ganttInstance;
    gantt.templates.timeline_cell_class = (_item: unknown, date: Date) => {
      const classes = [];
      if (date.getDay() === 0 || date.getDay() === 6) classes.push("weekend");

      const unidade = gantt.config.scales.at(-1)?.unit ?? "day";
      if (ehCelulaHoje(gantt, date, unidade, obterHojeCivil?.())) {
        classes.push("today-cell");
      }
      return classes.join(" ");
    };

    gantt.templates.scale_cell_class = (date: Date) => {
      const classes = [];
      if (date.getDay() === 0 || date.getDay() === 6) classes.push("weekend");
      const unidade = gantt.config.scales.at(-1)?.unit ?? "day";
      if (ehCelulaHoje(gantt, date, unidade, obterHojeCivil?.())) {
        classes.push("today-head");
      }
      return classes.join(" ");
    };

    gantt.templates.task_class = (_start: Date, _end: Date, rawTask: unknown) => {
      const task = rawTask as GanttTask;
      if (task.type === "project") {
        return "gantt-project-team";
      }
      if ((task.pessoasFaltantes ?? 0) > 0) return "gantt-equipe-incompleta";
      if (task.statusObra === "Separado" || task.statusObra === "Concluido") {
        return "gantt-material-pronto";
      }
      if (task.statusObra === "EmAndamento" || task.statusObra === "NoDeposito") {
        return "gantt-material-pendente";
      }
      if (task.statusObra === "MaterialComprado" || task.statusObra === "Assistencia") {
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

    gantt.templates.task_text = (start: Date, end: Date, rawTask: unknown) => {
      const task = rawTask as GanttTask;
      if (task.type === "project") {
        return `<strong>${escaparHtml(task.text || "")}</strong>`;
      }
      const rotuloBarra = task.nomeCliente || task.text || "";
      const dataIni = start instanceof Date ? dataGanttParaCivil(start) : "";
      const dataFim =
        task.dataFimInclusiva ??
        (end instanceof Date ? fimGanttParaCivilInclusivo(end) : "");
      const iniCurto = dataIni ? formatarDataBR(dataIni).slice(0, 5) : "";
      const fimCurto = dataFim ? formatarDataBR(dataFim).slice(0, 5) : "";
      const janelaCurta =
        iniCurto && fimCurto ? `${iniCurto}–${fimCurto}` : iniCurto || fimCurto;
      const metaTexto = task.equipeRotulo
        ? `${task.equipeRotulo}${(task.pessoasFaltantes ?? 0) > 0 ? ` · Faltam ${task.pessoasFaltantes ?? 0}` : ""}`
        : janelaCurta;

      return `<span class="gantt-bar-main"><span class="gantt-bar-accent" aria-hidden="true"></span><span class="gantt-bar-title">${escaparHtml(rotuloBarra)}</span></span>${metaTexto ? `<span class="gantt-bar-meta">${escaparHtml(metaTexto)}</span>` : ""}`;
    };

    // Tooltip dinâmico no padrão P04 com faixa semântica à esquerda
    gantt.templates.tooltip_text = (start: Date, end: Date, rawTask: unknown) => {
      const task = rawTask as GanttTask;
      const dataIniCivil = dataGanttParaCivil(start);
      const dataFimCivil =
        task.dataFimInclusiva ?? fimGanttParaCivilInclusivo(end);
      const dataIni = formatarDataBR(dataIniCivil);
      const dataFim = formatarDataBR(dataFimCivil);

      if (task.type === "project") {
        return `<div class="gantt-tt-card"><div class="gantt-tt-accent is-info" aria-hidden="true"></div><div class="gantt-tt-body"><div class="gantt-tt-head"><span class="gantt-tt-title">${escaparHtml(task.text || "")}</span></div><div class="gantt-tt-meta">${escaparHtml(dataIni)} – ${escaparHtml(dataFim)}</div></div></div>`;
      }

      const metaStatus = task.statusObra ? TOOLTIP_STATUS_META[task.statusObra] : undefined;
      const tone: "success" | "info" | "warning" =
        metaStatus?.tone ?? (task.materialPronto ? "success" : "info");
      const matLabel =
        metaStatus?.mat ??
        (task.materialPronto ? "Kit Pronto / Separado" : "Em trânsito / depósito");
      const matTone: "success" | "info" | "warning" =
        metaStatus?.matTone ?? (task.materialPronto ? "success" : "warning");

      const tituloTooltip = task.nomeCliente || task.text || "";
      const dur = task.duracaoDias ?? diasUteisCivis(dataIniCivil, dataFimCivil);
      const metaPartes = [
        `${dataIni}–${dataFim}${dur > 0 ? ` (${dur}d)` : ""}`,
        task.paineis !== undefined ? `${task.paineis} un.` : "",
      ]
        .filter(Boolean)
        .join(" · ");

      const faltantes = task.pessoasFaltantes ?? 0;
      const temEquipe = Boolean(task.equipeRotulo || (task.integrantesNomes && task.integrantesNomes.length > 0));
      const nomesEquipe =
        task.integrantesNomes && task.integrantesNomes.length > 0
          ? task.integrantesNomes.join(", ")
          : "Sem instaladores vinculados";

      const badgeEquipeHtml =
        faltantes > 0
          ? `<span class="gantt-tt-team-status is-warning">Falta ${escaparHtml(faltantes)}</span>`
          : task.equipeRotulo && !task.equipeRotulo.startsWith("0/")
          ? `<span class="gantt-tt-team-status is-success">Completa</span>`
          : "";

      const equipeHtml = temEquipe
        ? `<div class="gantt-tt-team"><div class="gantt-tt-team-top"><span class="gantt-tt-team-label ${faltantes > 0 ? "is-warning" : ""}">Equipe ${escaparHtml(task.equipeRotulo || "")}</span>${badgeEquipeHtml}</div><p class="gantt-tt-team-names">${escaparHtml(nomesEquipe)}</p></div>`
        : "";

      const temRodape =
        task.materialPronto !== undefined ||
        task.statusObra !== undefined ||
        task.homologacaoOk !== undefined;

      const homTone = task.homologacaoOk ? "success" : "warning";
      const homLabel = task.homologacaoOk ? "Homolog.: Aprovado" : "Homolog.: Em análise";

      const rodapeHtml = temRodape
        ? `<div class="gantt-tt-foot">${
            task.materialPronto !== undefined || task.statusObra !== undefined
              ? `<span class="gantt-tt-foot-item"><span class="gantt-tt-dot is-${matTone}" aria-hidden="true"></span><span class="gantt-tt-foot-text">${escaparHtml(matLabel)}</span></span>`
              : "<span></span>"
          }${
            task.homologacaoOk !== undefined
              ? `<span class="gantt-tt-foot-item"><span class="gantt-tt-dot is-${homTone}" aria-hidden="true"></span><span>${escaparHtml(homLabel)}</span></span>`
              : ""
          }</div>`
        : "";

      const statusPillHtml = metaStatus
        ? `<span class="gantt-tt-pill is-${tone}">${escaparHtml(metaStatus.label)}</span>`
        : "";

      return `<div class="gantt-tt-card"><div class="gantt-tt-accent is-${tone}" aria-hidden="true"></div><div class="gantt-tt-body"><div class="gantt-tt-head"><span class="gantt-tt-title">${escaparHtml(tituloTooltip)}</span>${statusPillHtml}</div><div class="gantt-tt-meta">${escaparHtml(metaPartes)}</div>${equipeHtml}${rodapeHtml}</div></div>`;
    };

}
