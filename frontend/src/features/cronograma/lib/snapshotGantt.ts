import type { GanttStatic } from "dhtmlx-gantt";

export const CONFIGURACOES_GANTT = [
  "bar_height",
  "columns",
  "correct_work_time",
  "date_format",
  "details_on_dblclick",
  "drag_links",
  "drag_move",
  "drag_progress",
  "drag_resize",
  "grid_resize",
  "keep_grid_width",
  "min_column_width",
  "order_branch",
  "order_branch_free",
  "row_height",
  "scale_height",
  "scales",
  "show_grid",
  "show_links",
  "show_progress",
  "tooltip_hide_timeout",
  "tooltip_timeout",
  "work_time",
  "start_date",
  "end_date",
  "round_dnd_dates",
  "time_step",
] as const;

export type ChaveConfigGantt = (typeof CONFIGURACOES_GANTT)[number];

export const TEMPLATES_GANTT = [
  "grid_row_class",
  "scale_cell_class",
  "task_class",
  "task_text",
  "timeline_cell_class",
  "tooltip_text",
] as const;

export type ChaveTemplateGantt = (typeof TEMPLATES_GANTT)[number];

export type ConfigsGantt = Pick<GanttStatic["config"], ChaveConfigGantt>;
export type TemplatesGantt = Pick<GanttStatic["templates"], ChaveTemplateGantt>;
export type LocaleGantt = GanttStatic["locale"];

export interface EntradaSnapshot<T> {
  readonly presente: boolean;
  readonly valor?: T;
}

export interface SnapshotGantt {
  readonly config: {
    readonly [K in ChaveConfigGantt]: EntradaSnapshot<ConfigsGantt[K]>;
  };
  readonly templates: {
    readonly [K in ChaveTemplateGantt]: EntradaSnapshot<TemplatesGantt[K]>;
  };
  readonly locale: LocaleGantt | null;
}

function clonarValor<T>(valor: T): T {
  if (valor === null || typeof valor !== "object") {
    return valor;
  }
  if (valor instanceof Date) {
    return new Date(valor.getTime()) as T;
  }
  if (Array.isArray(valor)) {
    return valor.map(clonarValor) as T;
  }
  const copia: Record<string, unknown> = {};
  const objeto = valor as Record<string, unknown>;
  for (const chave of Object.keys(objeto)) {
    copia[chave] = clonarValor(objeto[chave]);
  }
  return copia as T;
}

function capturarPropriedade<TObj extends object, K extends keyof TObj>(
  fonte: TObj,
  chave: K
): EntradaSnapshot<TObj[K]> {
  if (chave in fonte) {
    return {
      presente: true,
      valor: clonarValor(fonte[chave]),
    };
  }
  return {
    presente: false,
  };
}

function restaurarPropriedade<TObj extends object, K extends keyof TObj>(
  alvo: TObj,
  chave: K,
  entrada: EntradaSnapshot<TObj[K]>
): void {
  if (entrada.presente) {
    alvo[chave] = clonarValor(entrada.valor as TObj[K]);
  } else {
    delete alvo[chave];
  }
}

function capturarPropriedades<TObj extends object, K extends keyof TObj>(
  fonte: TObj,
  chaves: readonly K[]
): { [P in K]: EntradaSnapshot<TObj[P]> } {
  const resultado = {} as { [P in K]: EntradaSnapshot<TObj[P]> };
  for (const chave of chaves) {
    resultado[chave] = capturarPropriedade(fonte, chave);
  }
  return resultado;
}

function restaurarPropriedades<TObj extends object, K extends keyof TObj>(
  alvo: TObj,
  chaves: readonly K[],
  snapshot: { readonly [P in K]: EntradaSnapshot<TObj[P]> }
): void {
  for (const chave of chaves) {
    restaurarPropriedade(alvo, chave, snapshot[chave]);
  }
}

export function capturarSnapshotGantt(instancia: GanttStatic): SnapshotGantt {
  return {
    config: capturarPropriedades(instancia.config, CONFIGURACOES_GANTT),
    templates: capturarPropriedades(instancia.templates, TEMPLATES_GANTT),
    locale: instancia.locale ? clonarValor(instancia.locale) : null,
  };
}

export function restaurarSnapshotGantt(
  instancia: GanttStatic,
  snapshot: SnapshotGantt
): void {
  if (snapshot.locale !== null) {
    const copiaLocale = clonarValor(snapshot.locale);
    instancia.locale = copiaLocale;
    if (instancia.i18n && typeof instancia.i18n.setLocale === "function") {
      instancia.i18n.setLocale(copiaLocale);
    }
  }

  restaurarPropriedades(instancia.config, CONFIGURACOES_GANTT, snapshot.config);
  restaurarPropriedades(instancia.templates, TEMPLATES_GANTT, snapshot.templates);
}
