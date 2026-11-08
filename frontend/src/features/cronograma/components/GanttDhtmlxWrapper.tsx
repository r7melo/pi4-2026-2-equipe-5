import { useCallback, useEffect, useLayoutEffect, useRef } from "react";
import "dhtmlx-gantt/codebase/dhtmlxgantt.css";
import { gantt, type Task, type SerializedTask } from "dhtmlx-gantt";
import type { NivelZoom } from "@/types";
import {
  formatarDiasUteis,
  formatarDataBR,
  normalizarDataMeioDiaUTC,
  formatarDataISO,
  proximoDiaUtil,
  dataFimInclusivaParaDhtmlx,
  dhtmlxFimParaDataInclusiva,
  calcularDiasUteisInclusivos,
} from "@/shared/lib/formatters";

export interface GanttTask {
  id: string | number;
  parent?: string | number;
  type?: "project" | "task";
  open?: boolean;
  text: string;
  start_date: string | Date;
  end_date: string | Date;
  dataFimInclusiva?: string;
  duration?: number;
  equipeId?: number;
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
  epochInteracao?: number;
  nivelZoom: NivelZoom;
  focarData?: Date | null;
  mostrarGrade?: boolean;
  onReorder?: (id: number, novaData: string, novaDataFim: string) => void;
  onSelectTask?: (id: number) => void;
}

export function GanttDhtmlxWrapper({
  tarefas,
  canDrag,
  epochInteracao = 0,
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
  const tarefasRef = useRef(tarefas);
  const epochInteracaoRef = useRef(epochInteracao);
  const interacaoRef = useRef<{
    id: string | number; epoch: number; invalidada: boolean;
  } | null>(null);
  const gestoRef = useRef<typeof interacaoRef.current>(null);
  const sincronizacaoPendenteRef = useRef(false);
  const timerCliqueRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const sincronizarDados = useCallback((tarefasAtuais = tarefasRef.current) => {
    if (!inicializado.current) return;
    if (gestoRef.current || interacaoRef.current || gantt.getState().drag_id != null) {
      sincronizacaoPendenteRef.current = true;
      return;
    }
    const scrollState = gantt.getScrollState();
    const openStates = new Map<string | number, boolean>();
    gantt.eachTask((t: { id: string | number; type?: string; open?: boolean }) => {
      if (t.type === "project") {
        openStates.set(t.id, Boolean((t as unknown as { $open?: boolean }).$open ?? t.open));
      }
    });
    const dados = tarefasAtuais.map((tarefa) => ({
      ...tarefa,
      start_date: tarefa.start_date instanceof Date ? new Date(tarefa.start_date) : tarefa.start_date,
      end_date: tarefa.end_date instanceof Date ? new Date(tarefa.end_date) : tarefa.end_date,
    }));
    gantt.clearAll();
    gantt.parse({ data: dados as unknown as (Task | SerializedTask)[] });
    openStates.forEach((isOpen, id) => {
      if (gantt.isTaskExists(id)) {
        if (isOpen) gantt.open(id);
        else gantt.close(id);
      }
    });
    gantt.scrollTo(scrollState.x, scrollState.y);
    sincronizacaoPendenteRef.current = false;
  }, []);

  useLayoutEffect(() => { tarefasRef.current = tarefas; }, [tarefas]);
  useLayoutEffect(() => {
    onReorderRef.current = onReorder;
    onSelectTaskRef.current = onSelectTask;
    canDragRef.current = canDrag;
    epochInteracaoRef.current = epochInteracao;
    const interacao = interacaoRef.current ?? gestoRef.current;
    if (interacao && (!canDrag || interacao.epoch !== epochInteracao)) {
      interacao.invalidada = true;
      sincronizacaoPendenteRef.current = true;
    }
    if (inicializado.current) {
      gantt.config.drag_move = canDrag;
      gantt.config.drag_resize = canDrag;
    }
  }, [onReorder, onSelectTask, canDrag, epochInteracao]);

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

    // Configuração de Anti-Reparenting: impede arraste vertical entre equipes
    gantt.config.order_branch = false;
    gantt.config.order_branch_free = false;

    // Habilita redimensionamento individual e independente de colunas e da grade inteira
    gantt.config.grid_resize = true;
    gantt.config.keep_grid_width = false;

    gantt.config.show_grid = mostrarGradeRef.current;
    gantt.config.columns = [
      {
        name: "text",
        label: "Obra",
        width: 200,
        min_width: 130,
        tree: true,
        resize: true,
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
          return formatarDataBR(formatarDataISO(normalizarDataMeioDiaUTC(task.start_date)));
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
          if (!task.end_date) return "—";
          return formatarDataBR(task.dataFimInclusiva ?? dhtmlxFimParaDataInclusiva(task.end_date));
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
      const dataIni = formatarDataBR(formatarDataISO(start));
      const dataFim = formatarDataBR(task.dataFimInclusiva ?? dhtmlxFimParaDataInclusiva(end));

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
        const dur = calcularDiasUteisInclusivos(start, dhtmlxFimParaDataInclusiva(end));
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
      const tooltipEl = document.querySelector<HTMLElement>(".gantt_tooltip");
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

    let frameFim: number | null = null;
    let frameResize: number | null = null;
    let ultimaLargura = containerEl?.getBoundingClientRect().width ?? 0;

    const suprimirClique = () => {
      dragEmAndamentoRef.current = true;
      if (timerCliqueRef.current !== null) clearTimeout(timerCliqueRef.current);
      timerCliqueRef.current = setTimeout(() => {
        dragEmAndamentoRef.current = false;
        timerCliqueRef.current = null;
      }, 150);
    };

    const agendarFim = () => {
      if (frameFim !== null) return;
      frameFim = requestAnimationFrame(() => {
        frameFim = null;
        if (!inicializado.current || gantt.getState().drag_id != null) return;
        const invalidada = interacaoRef.current?.invalidada || gestoRef.current?.invalidada;
        interacaoRef.current = null;
        gestoRef.current = null;
        if (invalidada) { sincronizacaoPendenteRef.current = true; suprimirClique(); }
        if (sincronizacaoPendenteRef.current) sincronizarDados();
      });
    };

    const iniciarGesto = (evento: Event) => {
      if (gestoRef.current || !canDragRef.current) return;
      if (evento instanceof MouseEvent && evento.button !== 0) return;
      const alvo = evento.target;
      if (!(alvo instanceof Element) || !alvo.closest(".gantt_task_line")) return;
      const id = gantt.locate(evento);
      if (!gantt.isTaskExists(id)) return;
      const task = gantt.getTask(id) as unknown as GanttTask;
      if (task.type === "project" || String(id).startsWith("equipe-")) return;
      gestoRef.current = { id, epoch: epochInteracaoRef.current, invalidada: false };
    };

    const finalizarCancelamento = () => {
      if (!gestoRef.current && !interacaoRef.current && gantt.getState().drag_id == null) return;
      if (gestoRef.current) gestoRef.current.invalidada = true;
      if (interacaoRef.current) interacaoRef.current.invalidada = true;
      sincronizacaoPendenteRef.current = true;
      const toqueAtivo = document.body.classList.contains("gantt_touch_active");
      document.body.dispatchEvent(new MouseEvent("mouseup", { bubbles: true }));
      if (toqueAtivo && containerEl) {
        const fimToque = Object.assign(new Event("touchend", { bubbles: true }), { touches: [] });
        containerEl.dispatchEvent(fimToque);
      }
      agendarFim();
    };

    const handleMouseUp = (evento: MouseEvent) => {
      if (!gestoRef.current && !interacaoRef.current) return;
      if (!(evento.target instanceof Node) || !document.body.contains(evento.target)) {
        finalizarCancelamento();
      } else {
        agendarFim();
      }
    };
    const handlePointerUp = (evento: PointerEvent) => {
      if (evento.pointerType !== "mouse") agendarFim();
    };

    containerEl?.addEventListener("pointerdown", iniciarGesto, true);
    containerEl?.addEventListener("mousedown", iniciarGesto, true);
    containerEl?.addEventListener("touchstart", iniciarGesto, true);
    window.addEventListener("mouseup", handleMouseUp, true);
    window.addEventListener("pointerup", handlePointerUp, true);
    window.addEventListener("touchend", agendarFim, true);
    window.addEventListener("pointercancel", finalizarCancelamento, true);
    window.addEventListener("touchcancel", finalizarCancelamento, true);
    window.addEventListener("blur", finalizarCancelamento);

    const resizeObserver = new ResizeObserver(([entrada]) => {
      if (!entrada || entrada.contentRect.width === ultimaLargura) return;
      ultimaLargura = entrada.contentRect.width;
      if (frameResize !== null) cancelAnimationFrame(frameResize);
      frameResize = requestAnimationFrame(() => {
        frameResize = null;
        if (!inicializado.current) return;
        const scroll = gantt.getScrollState();
        gantt.setSizes();
        gantt.scrollTo(scroll.x, scroll.y);
      });
    });
    if (containerEl) resizeObserver.observe(containerEl);

    // Guard onBeforeTaskDrag: bloqueia arraste de linhas de equipe
    const beforeDragEventId = gantt.attachEvent("onBeforeTaskDrag", (id) => {
      if (!canDragRef.current || !gantt.isTaskExists(id)) return false;
      const task = gantt.getTask(id) as unknown as GanttTask;
      if (task.type === "project" || String(task.id).startsWith("equipe-")) return false;
      const gesto = gestoRef.current;
      if (!gesto || gesto.invalidada || gesto.epoch !== epochInteracaoRef.current ||
          String(gesto.id) !== String(id)) return false;
      interacaoRef.current = gesto;
      return true;
    });

    const beforeChangedEventId = gantt.attachEvent("onBeforeTaskChanged", (id) => {
      const interacao = interacaoRef.current;
      const permitido = canDragRef.current && interacao !== null &&
        !interacao.invalidada && interacao.epoch === epochInteracaoRef.current &&
        String(interacao.id) === String(id) && gantt.isTaskExists(id);
      if (!permitido) sincronizacaoPendenteRef.current = true;
      agendarFim();
      return permitido;
    });

    // Guard onBeforeRowDragMove: bloqueia categoricamente reordenação vertical entre linhas
    const rowDragMoveEventId = gantt.attachEvent("onBeforeRowDragMove", () => false);

    const dragEventId = gantt.attachEvent("onAfterTaskDrag", (id, _mode) => {
      const interacao = interacaoRef.current;
      if (!canDragRef.current || !interacao || interacao.invalidada ||
          interacao.epoch !== epochInteracaoRef.current || String(interacao.id) !== String(id) ||
          !gantt.isTaskExists(id)) {
        sincronizacaoPendenteRef.current = true;
        agendarFim();
        return;
      }
      suprimirClique();

      const task = gantt.getTask(id) as Omit<GanttTask, "start_date" | "end_date"> & {
        start_date: Date;
        end_date: string | Date;
        duracaoDias?: number;
        duration?: number;
      };

      // Defesa em profundidade contra nós de equipe ou IDs não-numéricos
      if (task.type === "project" || String(task.id).startsWith("equipe-")) {
        return;
      }

      const inicio = proximoDiaUtil(normalizarDataMeioDiaUTC(task.start_date));
      const inicioISO = formatarDataISO(inicio);
      let fimInclusivo = dhtmlxFimParaDataInclusiva(task.end_date);
      if (fimInclusivo < inicioISO) fimInclusivo = inicioISO; // clamp string × string
      const duracao = calcularDiasUteisInclusivos(inicio, fimInclusivo);

      task.start_date = inicio;
      task.dataFimInclusiva = fimInclusivo;
      task.end_date = normalizarDataMeioDiaUTC(dataFimInclusivaParaDhtmlx(fimInclusivo)); // Date obrigatório em runtime
      task.duracaoDias = duracao;
      task.duration = duracao;

      gantt.refreshTask(id);
      onReorderRef.current?.(Number(id), inicioISO, fimInclusivo); // 3º argumento = fim INCLUSIVO
    });

    // Guard onTaskClick com alternância segura de expansão para nós de projeto
    const clickEventId = gantt.attachEvent("onTaskClick", (id, e) => {
      if (dragEmAndamentoRef.current || interacaoRef.current?.invalidada || gestoRef.current?.invalidada) {
        return true;
      }
      esconderTooltipDhtmlx();

      if (!id || !gantt.isTaskExists(id)) return true;

      const task = gantt.getTask(id) as unknown as GanttTask;
      if (task.type === "project" || String(task.id).startsWith("equipe-")) {
        const target = e?.target as HTMLElement | null;
        if (!target?.closest?.(".gantt_tree_icon")) {
          const estaAberto = Boolean(
            (task as unknown as { $open?: boolean }).$open ?? task.open
          );
          if (estaAberto) {
            gantt.close(id);
          } else {
            gantt.open(id);
          }
        }
        return false; // Não dispara onSelectTask para linha da equipe
      }

      if (id && onSelectTaskRef.current) {
        onSelectTaskRef.current(Number(id));
      }
      return true;
    });

    return () => {
      finalizarCancelamento();
      document.removeEventListener("mousemove", handleDocumentMouseMove);
      window.removeEventListener("mouseout", handleWindowMouseOut);
      containerEl?.removeEventListener("mouseleave", esconderTooltipDhtmlx);
      containerEl?.removeEventListener("pointerdown", iniciarGesto, true);
      containerEl?.removeEventListener("mousedown", iniciarGesto, true);
      containerEl?.removeEventListener("touchstart", iniciarGesto, true);
      window.removeEventListener("mouseup", handleMouseUp, true);
      window.removeEventListener("pointerup", handlePointerUp, true);
      window.removeEventListener("touchend", agendarFim, true);
      window.removeEventListener("pointercancel", finalizarCancelamento, true);
      window.removeEventListener("touchcancel", finalizarCancelamento, true);
      window.removeEventListener("blur", finalizarCancelamento);
      resizeObserver.disconnect();
      if (frameFim !== null) cancelAnimationFrame(frameFim);
      if (frameResize !== null) cancelAnimationFrame(frameResize);
      if (timerCliqueRef.current !== null) clearTimeout(timerCliqueRef.current);
      timerCliqueRef.current = null;
      dragEmAndamentoRef.current = false;
      gestoRef.current = null;
      interacaoRef.current = null;
      sincronizacaoPendenteRef.current = false;
      esconderTooltipDhtmlx();
      document.querySelectorAll(".gantt_tooltip").forEach((el) => el.remove());
      gantt.clearAll();
      gantt.detachEvent(beforeDragEventId);
      gantt.detachEvent(beforeChangedEventId);
      gantt.detachEvent(rowDragMoveEventId);
      gantt.detachEvent(dragEventId);
      gantt.detachEvent(clickEventId);
      gantt.detachEvent(mouseMoveEventId);
      gantt.detachEvent(scrollEventId);
      inicializado.current = false;
    };
  }, [sincronizarDados]);

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

  // Preservação do estado da árvore pós-render
  useEffect(() => { sincronizarDados(tarefas); }, [tarefas, sincronizarDados]);

  return <div ref={container} className="flex-1 w-full min-h-0" style={{ width: "100%", height: "100%" }} />;
}
