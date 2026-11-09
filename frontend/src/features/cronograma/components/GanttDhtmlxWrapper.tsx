import { toast } from "sonner";
import { useCallback, useEffect, useLayoutEffect, useRef } from "react";
import "dhtmlx-gantt/codebase/dhtmlxgantt.css";
import { gantt, type Task } from "dhtmlx-gantt";
import type { NivelZoom } from "@/types";
import type { JanelaDatasGantt } from "@/features/cronograma/lib/janelaProgramacoes";
import {
  arredondarDataGanttCivil,
  dataCivilParaGantt,
  dataGanttParaCivil,
  dataJanelaParaGantt,
  dataGanttParaJanela,
  fimJanelaParaGanttExclusivo,
  fimCivilParaGanttExclusivo,
  fimGanttParaCivilInclusivo,
} from "@/features/cronograma/lib/datasGantt";
import {
  capturarSnapshotGantt,
  restaurarSnapshotGantt,
  type SnapshotGantt,
} from "@/features/cronograma/lib/snapshotGantt";
import { registrarCosturaQa } from "@/features/cronograma/lib/costuraQa";
import type { EstadoVisualGantt } from "@/features/cronograma/lib/estadoVisualGantt";
import {
  dataCivilValida,
  dataFimDiasUteisCivil,
  diasUteisCivis,
  proximoDiaUtilCivil,
} from "@/shared/lib/datasCivis";

import {
  configurarDhtmlxBase,
  aplicarConfiguracaoZoom,
} from "@/features/cronograma/components/ganttConfiguracao";
import { configurarTemplatesGantt } from "@/features/cronograma/components/ganttTemplates";
import type { GanttTask } from "@/features/cronograma/types/gantt";

export type { GanttTask } from "@/features/cronograma/types/gantt";
function calcularPosicaoDataCivil(dataCivil: string): number | null {
  try {
    if (typeof gantt.posFromDate !== "function") {
      return null;
    }
    const dataGantt = dataJanelaParaGantt(dataCivil);
    const state = typeof gantt.getState === "function" ? gantt.getState() : null;
    if (state?.min_date && dataGantt < state.min_date) {
      return 0;
    }
    if (state?.max_date && dataGantt > state.max_date) {
      const posMax = gantt.posFromDate(state.max_date);
      return typeof posMax === "number" && !isNaN(posMax) ? Math.max(0, posMax) : null;
    }
    const rawPos = gantt.posFromDate(dataGantt);
    if (typeof rawPos !== "number" || isNaN(rawPos)) {
      return null;
    }
    return Math.max(0, rawPos);
  } catch {
    return null;
  }
}


interface GanttWrapperProps {
  tarefas: GanttTask[];
  canDrag: boolean;
  janelaDatas?: JanelaDatasGantt;
  epochInteracao?: number;
  nivelZoom: NivelZoom;
  focarData?: Date | null;
  mostrarGrade?: boolean;
  onReorder?: (id: number, novaData: string, novaDataFim: string) => void;
  onSelectTask?: (id: number) => void;
  modoAtivo?: boolean;
  obterEstadoVisual?: () => EstadoVisualGantt;
  salvarEstadoVisual?: (estado: EstadoVisualGantt) => void;
}

export function GanttDhtmlxWrapper({
  tarefas,
  canDrag,
  janelaDatas,
  epochInteracao = 0,
  nivelZoom,
  focarData,
  mostrarGrade = true,
  onReorder,
  onSelectTask,
  modoAtivo = false,
  obterEstadoVisual,
  salvarEstadoVisual,
}: GanttWrapperProps) {
  const container = useRef<HTMLDivElement>(null);
  const onReorderRef = useRef(onReorder);
  const onSelectTaskRef = useRef(onSelectTask);
  const canDragRef = useRef(canDrag);
  const mostrarGradeRef = useRef(mostrarGrade);
  const janelaDatasRef = useRef(janelaDatas);
  const modoAtivoRef = useRef(modoAtivo);
  const obterEstadoVisualRef = useRef(obterEstadoVisual);
  const salvarEstadoVisualRef = useRef(salvarEstadoVisual);
  const snapshotRef = useRef<SnapshotGantt | null>(null);
  const inicializado = useRef(false);
  const dragEmAndamentoRef = useRef(false);
  const tarefasRef = useRef(tarefas);
  const epochInteracaoRef = useRef(epochInteracao);
  const interacaoRef = useRef<{
    id: string | number;
    epoch: number;
    invalidada: boolean;
    modo?: string;
    inicioOriginalCivil?: string;
    fimOriginalCivil?: string;
    duracaoUteisOriginal?: number;
    candidatoCivil?: string;
    inicioAceitoCivil?: string;
    fimAceitoCivil?: string;
  } | null>(null);
  const gestoRef = useRef<typeof interacaoRef.current>(null);
  const ultimoMenorInicioRef = useRef<string | null>(null);
  const sincronizacaoPendenteRef = useRef(false);
  const timerCliqueRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const primeiraSincronizacaoRef = useRef(true);
  const mutacaoInternaRef = useRef(false);

  const sincronizarDados = useCallback((tarefasAtuais = tarefasRef.current) => {
    if (!inicializado.current) return;
    if (gestoRef.current || interacaoRef.current || gantt.getState().drag_id != null) {
      sincronizacaoPendenteRef.current = true;
      return;
    }
    const scrollStateAntes = gantt.getScrollState();
    const estadoVisualAntes = obterEstadoVisualRef.current?.();

    const openStates = new Map<string | number, boolean>();
    if (estadoVisualAntes?.arvore) {
      for (const [id, aberto] of Object.entries(estadoVisualAntes.arvore)) {
        openStates.set(id, aberto);
      }
    }
    gantt.eachTask((t: { id: string | number; type?: string; open?: boolean }) => {
      if (t.type === "project" || String(t.id).startsWith("equipe-")) {
        openStates.set(t.id, Boolean((t as unknown as { $open?: boolean }).$open ?? t.open));
      }
    });

    const dados: Task[] = tarefasAtuais.map((tarefa) => {
      const dataInicio =
        tarefa.start_date instanceof Date
          ? new Date(tarefa.start_date.getTime())
          : dataCivilParaGantt(tarefa.start_date);
      const dataFim =
        tarefa.dataFimInclusiva
          ? fimCivilParaGanttExclusivo(tarefa.dataFimInclusiva)
          : tarefa.end_date instanceof Date
          ? new Date(tarefa.end_date.getTime())
          : dataCivilParaGantt(tarefa.end_date);

      const ehProjeto = tarefa.type === "project" || String(tarefa.id).startsWith("equipe-");
      const abertoSalvo = ehProjeto ? openStates.get(tarefa.id) : undefined;
      const estaAberto = abertoSalvo !== undefined ? abertoSalvo : (tarefa.open ?? true);

      return {
        ...tarefa,
        start_date: dataInicio,
        end_date: dataFim,
        ...(ehProjeto ? { open: estaAberto } : {}),
      };
    });

    let menorInicioAtual: string | null = null;
    for (const tarefa of tarefasAtuais) {
      if (tarefa.type === "project" || String(tarefa.id).startsWith("equipe-")) {
        continue;
      }
      const isoInicio =
        tarefa.start_date instanceof Date
          ? dataGanttParaCivil(tarefa.start_date)
          : String(tarefa.start_date);
      if (dataCivilValida(isoInicio)) {
        if (menorInicioAtual === null || isoInicio < menorInicioAtual) {
          menorInicioAtual = isoInicio;
        }
      }
    }

    const estaEmDisplay = modoAtivoRef.current;
    const ehPrimeiraSincronizacao = primeiraSincronizacaoRef.current;
    primeiraSincronizacaoRef.current = false;
    const ultimoMenorConhecido = estadoVisualAntes?.ultimoMenorInicio ?? ultimoMenorInicioRef.current;

    mutacaoInternaRef.current = true;
    try {
      gantt.clearAll();
      gantt.parse({ data: dados });

      openStates.forEach((isOpen, id) => {
        if (gantt.isTaskExists(id)) {
          if (isOpen) gantt.open(id);
          else gantt.close(id);
        }
      });

      if (estaEmDisplay) {
        if (ehPrimeiraSincronizacao) {
          const dataAlvoCivil = estadoVisualAntes?.dataCivilVisivel ?? menorInicioAtual;
          const posAlvo = dataAlvoCivil ? calcularPosicaoDataCivil(dataAlvoCivil) : null;
          const yAlvo = estadoVisualAntes ? estadoVisualAntes.scrollOperacao.y : scrollStateAntes.y;
          if (posAlvo !== null) {
            gantt.scrollTo(posAlvo, yAlvo);
          } else {
            gantt.scrollTo(0, yAlvo);
          }
          const posAposFoco = gantt.getScrollState();
          if (estadoVisualAntes) {
            estadoVisualAntes.scrollDisplay = { x: posAposFoco.x, y: posAposFoco.y };
            salvarEstadoVisualRef.current?.(estadoVisualAntes);
          }
        } else {
          const xAlvo = estadoVisualAntes ? estadoVisualAntes.scrollDisplay.x : scrollStateAntes.x;
          const yAlvo = estadoVisualAntes ? estadoVisualAntes.scrollDisplay.y : scrollStateAntes.y;
          gantt.scrollTo(xAlvo, yAlvo);
          if (estadoVisualAntes) {
            const posApos = gantt.getScrollState();
            estadoVisualAntes.scrollDisplay = { x: posApos.x, y: posApos.y };
            salvarEstadoVisualRef.current?.(estadoVisualAntes);
          }
        }
      } else {
        if (ehPrimeiraSincronizacao) {
          if (
            ultimoMenorConhecido !== null &&
            menorInicioAtual !== null &&
            menorInicioAtual !== ultimoMenorConhecido
          ) {
            ultimoMenorInicioRef.current = menorInicioAtual;
            if (estadoVisualAntes) {
              estadoVisualAntes.ultimoMenorInicio = menorInicioAtual;
            }
            gantt.showDate(dataCivilParaGantt(menorInicioAtual));
            const posAposFoco = gantt.getScrollState();
            const yAlvo = estadoVisualAntes ? estadoVisualAntes.scrollOperacao.y : scrollStateAntes.y;
            gantt.scrollTo(posAposFoco.x, yAlvo);
            if (estadoVisualAntes) {
              estadoVisualAntes.scrollOperacao = { x: posAposFoco.x, y: yAlvo };
              try {
                if (typeof gantt.dateFromPos === "function") {
                  const d = gantt.dateFromPos(posAposFoco.x);
                  if (d instanceof Date && !isNaN(d.getTime())) {
                    estadoVisualAntes.dataCivilVisivel = dataGanttParaJanela(d);
                  }
                }
              } catch {
                // Mantém data civil visível anterior
              }
              salvarEstadoVisualRef.current?.(estadoVisualAntes);
            }
          } else if (estadoVisualAntes && estadoVisualAntes.ultimoMenorInicio !== null) {
            const xAlvo = estadoVisualAntes.scrollOperacao.x;
            const yAlvo = estadoVisualAntes.scrollOperacao.y;
            gantt.scrollTo(xAlvo, yAlvo);
          } else {
            ultimoMenorInicioRef.current = menorInicioAtual;
            if (estadoVisualAntes) {
              estadoVisualAntes.ultimoMenorInicio = menorInicioAtual;
            }
            if (menorInicioAtual !== null) {
              gantt.showDate(dataCivilParaGantt(menorInicioAtual));
              const posAposFoco = gantt.getScrollState();
              const yAlvo = estadoVisualAntes ? estadoVisualAntes.scrollOperacao.y : scrollStateAntes.y;
              gantt.scrollTo(posAposFoco.x, yAlvo);
              if (estadoVisualAntes) {
                estadoVisualAntes.scrollOperacao = { x: posAposFoco.x, y: yAlvo };
                try {
                  if (typeof gantt.dateFromPos === "function") {
                    const d = gantt.dateFromPos(posAposFoco.x);
                    if (d instanceof Date && !isNaN(d.getTime())) {
                      estadoVisualAntes.dataCivilVisivel = dataGanttParaJanela(d);
                    }
                  }
                } catch {
                  // Mantém data civil visível anterior
                }
                salvarEstadoVisualRef.current?.(estadoVisualAntes);
              }
            } else {
              gantt.scrollTo(scrollStateAntes.x, scrollStateAntes.y);
            }
          }
        } else {
          if (
            menorInicioAtual !== null &&
            ultimoMenorConhecido !== null &&
            menorInicioAtual !== ultimoMenorConhecido
          ) {
            ultimoMenorInicioRef.current = menorInicioAtual;
            if (estadoVisualAntes) {
              estadoVisualAntes.ultimoMenorInicio = menorInicioAtual;
            }
            gantt.showDate(dataCivilParaGantt(menorInicioAtual));
            const posAposFoco = gantt.getScrollState();
            const yAlvo = estadoVisualAntes ? estadoVisualAntes.scrollOperacao.y : scrollStateAntes.y;
            gantt.scrollTo(posAposFoco.x, yAlvo);
            if (estadoVisualAntes) {
              estadoVisualAntes.scrollOperacao = { x: posAposFoco.x, y: yAlvo };
              try {
                if (typeof gantt.dateFromPos === "function") {
                  const d = gantt.dateFromPos(posAposFoco.x);
                  if (d instanceof Date && !isNaN(d.getTime())) {
                    estadoVisualAntes.dataCivilVisivel = dataGanttParaJanela(d);
                  }
                }
              } catch {
                // Mantém data civil visível anterior
              }
              salvarEstadoVisualRef.current?.(estadoVisualAntes);
            }
          } else {
            const xAlvo = estadoVisualAntes ? estadoVisualAntes.scrollOperacao.x : scrollStateAntes.x;
            const yAlvo = estadoVisualAntes ? estadoVisualAntes.scrollOperacao.y : scrollStateAntes.y;
            gantt.scrollTo(xAlvo, yAlvo);
            if (estadoVisualAntes) {
              estadoVisualAntes.scrollOperacao = { x: xAlvo, y: yAlvo };
              try {
                if (typeof gantt.dateFromPos === "function") {
                  const d = gantt.dateFromPos(xAlvo);
                  if (d instanceof Date && !isNaN(d.getTime())) {
                    estadoVisualAntes.dataCivilVisivel = dataGanttParaJanela(d);
                  }
                }
              } catch {
                // Mantém data civil visível anterior
              }
              salvarEstadoVisualRef.current?.(estadoVisualAntes);
            }
          }
        }
      }
    } finally {
      mutacaoInternaRef.current = false;
    }

    sincronizacaoPendenteRef.current = false;
  }, []);

  useLayoutEffect(() => { tarefasRef.current = tarefas; }, [tarefas]);
  useLayoutEffect(() => {
    onReorderRef.current = onReorder;
    onSelectTaskRef.current = onSelectTask;
    canDragRef.current = canDrag;
    janelaDatasRef.current = janelaDatas;
    epochInteracaoRef.current = epochInteracao;
    modoAtivoRef.current = modoAtivo;
    obterEstadoVisualRef.current = obterEstadoVisual;
    salvarEstadoVisualRef.current = salvarEstadoVisual;
    const interacao = interacaoRef.current ?? gestoRef.current;
    if (interacao && (!canDrag || interacao.epoch !== epochInteracao)) {
      interacao.invalidada = true;
      sincronizacaoPendenteRef.current = true;
    }
    if (inicializado.current) {
      gantt.config.drag_move = canDrag;
      gantt.config.drag_resize = false;
    }
  }, [onReorder, onSelectTask, canDrag, epochInteracao, janelaDatas, modoAtivo, obterEstadoVisual, salvarEstadoVisual]);

  useEffect(() => {
    mostrarGradeRef.current = mostrarGrade;
  }, [mostrarGrade]);

  useEffect(() => {
    if (inicializado.current) return;

    const obterEstadoOrigem = obterEstadoVisualRef.current;
    const salvarEstadoOrigem = salvarEstadoVisualRef.current;

    if (snapshotRef.current === null) {
      snapshotRef.current = capturarSnapshotGantt(gantt);
    }


    configurarDhtmlxBase(gantt, {
      mostrarGrade: mostrarGradeRef.current,
      temOnSelectTask: () => Boolean(onSelectTaskRef.current),
    });
    configurarTemplatesGantt(gantt);

    gantt.config.drag_move = canDragRef.current;
    gantt.config.drag_resize = false;
    gantt.config.drag_progress = false;
    gantt.config.drag_links = false;

    if (janelaDatasRef.current) {
      gantt.config.start_date = dataJanelaParaGantt(janelaDatasRef.current.inicio);
      gantt.config.end_date = fimJanelaParaGanttExclusivo(janelaDatasRef.current.fim);
    }

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
      if (mutacaoInternaRef.current) return true;
      const estado = obterEstadoVisualRef.current?.();
      if (estado && !gestoRef.current?.invalidada && !interacaoRef.current?.invalidada) {
        const atual = gantt.getScrollState();
        if (modoAtivoRef.current) {
          estado.scrollDisplay = { x: atual.x, y: atual.y };
        } else {
          estado.scrollOperacao = { x: atual.x, y: atual.y };
          try {
            if (typeof gantt.dateFromPos === "function") {
              const d = gantt.dateFromPos(atual.x);
              if (d instanceof Date && !isNaN(d.getTime())) {
                estado.dataCivilVisivel = dataGanttParaJanela(d);
              }
            }
          } catch {
            // Mantém data civil visível anterior
          }
        }
        salvarEstadoVisualRef.current?.(estado);
      }
      return true;
    });

    const taskOpenedEventId = gantt.attachEvent("onTaskOpened", (id) => {
      const idStr = String(id);
      if (idStr.startsWith("equipe-") || (gantt.isTaskExists(id) && gantt.getTask(id).type === "project")) {
        const estado = obterEstadoVisualRef.current?.();
        if (estado) {
          estado.arvore[idStr] = true;
          salvarEstadoVisualRef.current?.(estado);
        }
      }
      return true;
    });

    const taskClosedEventId = gantt.attachEvent("onTaskClosed", (id) => {
      const idStr = String(id);
      if (idStr.startsWith("equipe-") || (gantt.isTaskExists(id) && gantt.getTask(id).type === "project")) {
        const estado = obterEstadoVisualRef.current?.();
        if (estado) {
          estado.arvore[idStr] = false;
          salvarEstadoVisualRef.current?.(estado);
        }
      }
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

    const handleGradeClick = (evento: MouseEvent) => {
      const alvo = evento.target;
      if (!(alvo instanceof Element)) return;
      const botao = alvo.closest<HTMLButtonElement>(
        ".gantt-btn-alocacao, .gantt-btn-equipe"
      );
      if (!botao) return;

      if (
        dragEmAndamentoRef.current ||
        interacaoRef.current?.invalidada ||
        gestoRef.current?.invalidada
      ) {
        return;
      }

      const taskId = botao.getAttribute("data-task-id");
      if (!taskId || !gantt.isTaskExists(taskId)) return;

      esconderTooltipDhtmlx();

      const task = gantt.getTask(taskId) as unknown as GanttTask;
      if (botao.classList.contains("gantt-btn-equipe")) {
        const estaAberto = Boolean(
          (task as unknown as { $open?: boolean }).$open ?? task.open
        );
        if (estaAberto) {
          gantt.close(taskId);
        } else {
          gantt.open(taskId);
        }
        requestAnimationFrame(() => {
          if (!inicializado.current || !containerEl) return;
          const novoBotao = containerEl.querySelector<HTMLButtonElement>(
            `button.gantt-btn-equipe[data-task-id="${taskId}"]`
          );
          if (novoBotao && document.activeElement !== novoBotao) {
            novoBotao.focus();
          }
        });
      } else if (botao.classList.contains("gantt-btn-alocacao")) {
        if (onSelectTaskRef.current) {
          onSelectTaskRef.current(Number(taskId));
        }
      }
    };

    containerEl?.addEventListener("click", handleGradeClick);
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

    // Guard onBeforeTaskDrag: bloqueia arraste de linhas de equipe e captura tarefa autoritativa
    const beforeDragEventId = gantt.attachEvent("onBeforeTaskDrag", (id, mode) => {
      if (!canDragRef.current || mode !== "move" || !gantt.isTaskExists(id)) return false;
      const task = gantt.getTask(id) as unknown as GanttTask;
      if (task.type === "project" || String(task.id).startsWith("equipe-")) return false;
      const gesto = gestoRef.current;
      if (!gesto || gesto.invalidada || gesto.epoch !== epochInteracaoRef.current ||
          String(gesto.id) !== String(id)) return false;

      const tarefaAutoritativa = tarefasRef.current.find((t) => String(t.id) === String(id));
      if (!tarefaAutoritativa || tarefaAutoritativa.type === "project" || String(tarefaAutoritativa.id).startsWith("equipe-")) {
        gesto.invalidada = true;
        return false;
      }

      const inicio =
        tarefaAutoritativa.start_date instanceof Date
          ? dataGanttParaCivil(tarefaAutoritativa.start_date)
          : String(tarefaAutoritativa.start_date);
      const fimInclusivo =
        tarefaAutoritativa.dataFimInclusiva ??
        (tarefaAutoritativa.end_date instanceof Date
          ? fimGanttParaCivilInclusivo(tarefaAutoritativa.end_date)
          : fimGanttParaCivilInclusivo(dataCivilParaGantt(String(tarefaAutoritativa.end_date))));

      const duracao = diasUteisCivis(inicio, fimInclusivo);
      if (duracao <= 0) {
        gesto.invalidada = true;
        return false;
      }

      gesto.modo = mode;
      gesto.inicioOriginalCivil = inicio;
      gesto.fimOriginalCivil = fimInclusivo;
      gesto.duracaoUteisOriginal = duracao;
      gesto.candidatoCivil = inicio;
      interacaoRef.current = gesto;
      return true;
    });

    const taskDragEventId = gantt.attachEvent("onTaskDrag", (id, mode, task) => {
      if (mode !== "move") return;
      const gesto = interacaoRef.current ?? gestoRef.current;
      if (
        !gesto ||
        gesto.invalidada ||
        gesto.epoch !== epochInteracaoRef.current ||
        String(gesto.id) !== String(id)
      ) {
        return;
      }
      try {
        if (!(task.start_date instanceof Date) || !gesto.duracaoUteisOriginal) {
          throw new RangeError("Candidato de arraste inválido.");
        }
        const candidato = arredondarDataGanttCivil(task.start_date);
        const inicio = proximoDiaUtilCivil(candidato);
        dataFimDiasUteisCivil(inicio, gesto.duracaoUteisOriginal);
        gesto.candidatoCivil = candidato;
      } catch {
        // A biblioteca renderiza esta cópia logo após o callback. Restaurá-la
        // impede que templates recebam datas fora do domínio público.
        gesto.candidatoCivil = undefined;
        if (gesto.inicioOriginalCivil && gesto.fimOriginalCivil) {
          task.start_date = dataCivilParaGantt(gesto.inicioOriginalCivil);
          task.end_date = fimCivilParaGanttExclusivo(gesto.fimOriginalCivil);
          task.dataFimInclusiva = gesto.fimOriginalCivil;
        }
      }
    });

    const beforeChangedEventId = gantt.attachEvent("onBeforeTaskChanged", (id, mode, _tarefaOriginal) => {
      const interacao = interacaoRef.current;
      const taskAtual = gantt.isTaskExists(id) ? (gantt.getTask(id) as unknown as GanttTask) : null;
      const ehGrupo = taskAtual?.type === "project" || String(id).startsWith("equipe-");
      const duracaoOriginal = interacao?.duracaoUteisOriginal;

      const permitido =
        canDragRef.current &&
        interacao !== null &&
        !interacao.invalidada &&
        interacao.epoch === epochInteracaoRef.current &&
        String(interacao.id) === String(id) &&
        mode === "move" &&
        !ehGrupo &&
        taskAtual !== null &&
        duracaoOriginal !== undefined &&
        duracaoOriginal > 0;

      if (!permitido || !interacao || !taskAtual || !duracaoOriginal) {
        if (interacao) interacao.invalidada = true;
        sincronizacaoPendenteRef.current = true;
        agendarFim();
        return false;
      }

      try {
        const candidatoBruto = interacao.candidatoCivil;
        if (!candidatoBruto) throw new RangeError("Candidato de arraste inválido.");
        const novoInicio = proximoDiaUtilCivil(candidatoBruto);
        const novoFimInclusivo = dataFimDiasUteisCivil(novoInicio, duracaoOriginal);
        const inicioGantt = dataCivilParaGantt(novoInicio);
        const fimGantt = fimCivilParaGanttExclusivo(novoFimInclusivo);

        taskAtual.start_date = inicioGantt;
        taskAtual.end_date = fimGantt;
        taskAtual.dataFimInclusiva = novoFimInclusivo;
        taskAtual.duracaoDias = duracaoOriginal;
        interacao.inicioAceitoCivil = novoInicio;
        interacao.fimAceitoCivil = novoFimInclusivo;
        agendarFim();
        return true;
      } catch {
        interacao.invalidada = true;
        sincronizacaoPendenteRef.current = true;
        agendarFim();
        toast.error("Essa data não permite manter a duração da alocação. Escolha outra data.");
        return false;
      }
    });

    // Guard onBeforeRowDragMove: bloqueia categoricamente reordenação vertical entre linhas
    const rowDragMoveEventId = gantt.attachEvent("onBeforeRowDragMove", () => false);

    const dragEventId = gantt.attachEvent("onAfterTaskDrag", (id, _mode) => {
      const interacao = interacaoRef.current;
      if (
        !canDragRef.current ||
        !interacao ||
        interacao.invalidada ||
        interacao.epoch !== epochInteracaoRef.current ||
        String(interacao.id) !== String(id) ||
        !gantt.isTaskExists(id)
      ) {
        sincronizacaoPendenteRef.current = true;
        agendarFim();
        return;
      }
      suprimirClique();

      const inicioAceito = interacao.inicioAceitoCivil;
      const fimAceito = interacao.fimAceitoCivil;
      if (!inicioAceito || !fimAceito) {
        sincronizacaoPendenteRef.current = true;
        agendarFim();
        return;
      }

      gantt.refreshTask(id);

      if (inicioAceito !== interacao.inicioOriginalCivil) {
        onReorderRef.current?.(Number(id), inicioAceito, fimAceito);
      }
      agendarFim();
    });

    // Guard onTaskClick com alternância segura de expansão para nós de projeto
    const clickEventId = gantt.attachEvent("onTaskClick", (id, e) => {
      if (dragEmAndamentoRef.current || interacaoRef.current?.invalidada || gestoRef.current?.invalidada) {
        return true;
      }
      esconderTooltipDhtmlx();

      if (!id || !gantt.isTaskExists(id)) return true;

      const target = e?.target as HTMLElement | null;
      if (target?.closest?.(".gantt-btn-alocacao, .gantt-btn-equipe")) {
        return false;
      }

      const task = gantt.getTask(id) as unknown as GanttTask;
      if (task.type === "project" || String(task.id).startsWith("equipe-")) {
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
      containerEl?.removeEventListener("click", handleGradeClick);
      resizeObserver.disconnect();
      if (frameFim !== null) cancelAnimationFrame(frameFim);
      if (frameResize !== null) cancelAnimationFrame(frameResize);
      if (timerCliqueRef.current !== null) clearTimeout(timerCliqueRef.current);
      timerCliqueRef.current = null;
      esconderTooltipDhtmlx();
      document.querySelectorAll(".gantt_tooltip").forEach((el) => el.remove());
      const estadoFinal = obterEstadoOrigem?.();
      const salvarAtual = salvarEstadoVisualRef.current;
      if (estadoFinal && salvarEstadoOrigem && salvarAtual === salvarEstadoOrigem) {
        gantt.eachTask((t: { id: string | number; type?: string; open?: boolean }) => {
          if (t.type === "project" || String(t.id).startsWith("equipe-")) {
            estadoFinal.arvore[String(t.id)] = Boolean(
              (t as unknown as { $open?: boolean }).$open ?? t.open
            );
          }
        });
        const scrollFinal = gantt.getScrollState();
        if (modoAtivoRef.current) {
          estadoFinal.scrollDisplay = { x: scrollFinal.x, y: scrollFinal.y };
        } else if (!interacaoRef.current?.invalidada) {
          estadoFinal.scrollOperacao = { x: scrollFinal.x, y: scrollFinal.y };
          try {
            if (typeof gantt.dateFromPos === "function") {
              const d = gantt.dateFromPos(scrollFinal.x);
              if (d instanceof Date && !isNaN(d.getTime())) {
                estadoFinal.dataCivilVisivel = dataGanttParaJanela(d);
              }
            }
          } catch {
            // Preserva dataCivilVisivel anterior
          }
        }
        salvarEstadoOrigem(estadoFinal);
      }
      dragEmAndamentoRef.current = false;
      gestoRef.current = null;
      interacaoRef.current = null;
      sincronizacaoPendenteRef.current = false;
      ultimoMenorInicioRef.current = null;
      primeiraSincronizacaoRef.current = true;
      gantt.detachEvent(scrollEventId);
      gantt.detachEvent(taskOpenedEventId);
      gantt.detachEvent(taskClosedEventId);
      gantt.detachEvent(mouseMoveEventId);
      gantt.detachEvent(beforeDragEventId);
      gantt.detachEvent(taskDragEventId);
      gantt.detachEvent(beforeChangedEventId);
      gantt.detachEvent(rowDragMoveEventId);
      gantt.detachEvent(dragEventId);
      gantt.detachEvent(clickEventId);
      mutacaoInternaRef.current = true;
      try {
        gantt.clearAll();
      } finally {
        mutacaoInternaRef.current = false;
      }
      if (snapshotRef.current) {
        restaurarSnapshotGantt(gantt, snapshotRef.current);
      }
      inicializado.current = false;
    };
  }, [sincronizarDados]);

  // Atualização dinâmica da visibilidade da grade esquerda
  useEffect(() => {
    if (!inicializado.current) return;
    gantt.config.show_grid = mostrarGrade;
    mutacaoInternaRef.current = true;
    try {
      gantt.render();
    } finally {
      mutacaoInternaRef.current = false;
    }
  }, [mostrarGrade]);

  const janelaInicio = janelaDatas?.inicio;
  const janelaFim = janelaDatas?.fim;

  useEffect(() => {
    if (!inicializado.current || !janelaInicio || !janelaFim) return;
    const scroll = gantt.getScrollState();
    gantt.config.start_date = dataJanelaParaGantt(janelaInicio);
    gantt.config.end_date = fimJanelaParaGanttExclusivo(janelaFim);
    mutacaoInternaRef.current = true;
    try {
      gantt.render();
      gantt.scrollTo(scroll.x, scroll.y);
    } finally {
      mutacaoInternaRef.current = false;
    }
  }, [janelaInicio, janelaFim]);

  useEffect(() => {
    if (focarData && inicializado.current) {
      gantt.showDate(focarData);
    }
  }, [focarData]);

  useEffect(() => {
    if (!inicializado.current) return;

    aplicarConfiguracaoZoom(gantt, nivelZoom);

    mutacaoInternaRef.current = true;
    try {
      gantt.render();
    } finally {
      mutacaoInternaRef.current = false;
    }
  }, [nivelZoom]);

  // Preservação do estado da árvore pós-render
  useEffect(() => { sincronizarDados(tarefas); }, [tarefas, sincronizarDados]);

  const temJanelaOperacional = Boolean(janelaDatas);

  useEffect(() => {
    if (!inicializado.current || !temJanelaOperacional) return;

    return registrarCosturaQa({
      lerJanela: () => {
        const atual = janelaDatasRef.current;
        if (!atual) {
          throw new Error("Janela de datas não disponível no Gantt operacional.");
        }
        return { inicio: atual.inicio, fim: atual.fim };
      },
      mostrarData: (iso: string) => {
        gantt.showDate(dataCivilParaGantt(iso));
      },
      lerTarefa: (id: number) => {
        if (!gantt.isTaskExists(id)) return null;
        const task = gantt.getTask(id) as unknown as GanttTask;
        if (!task || task.type === "project" || String(task.id).startsWith("equipe-")) {
          return null;
        }
        try {
          const inicioDate =
            task.start_date instanceof Date
              ? task.start_date
              : dataCivilParaGantt(String(task.start_date));
          const fimDate =
            task.end_date instanceof Date
              ? task.end_date
              : dataCivilParaGantt(String(task.end_date));
          return {
            dataInicio: dataGanttParaCivil(inicioDate),
            dataFim: fimGanttParaCivilInclusivo(fimDate),
          };
        } catch {
          return null;
        }
      },
    });
  }, [temJanelaOperacional]);

  return <div ref={container} className="flex-1 w-full min-h-0" style={{ width: "100%", height: "100%" }} />;
}
