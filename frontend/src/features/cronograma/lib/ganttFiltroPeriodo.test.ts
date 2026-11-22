import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  GanttFiltroPeriodo,
  type GanttFiltroPeriodoProps,
} from "../components/GanttFiltroPeriodo";

function renderizar(props: Partial<GanttFiltroPeriodoProps> = {}) {
  return renderToStaticMarkup(
    createElement(GanttFiltroPeriodo, {
      onDataInicialChange: () => {},
      onDataFinalChange: () => {},
      ...props,
    }),
  );
}

describe("GanttFiltroPeriodo (RN-108-01 / RN-108-02 / RN-108-05)", () => {
  it("aplica variante toolbar por padrão e variante kpi quando solicitada com role group semântico", () => {
    const htmlToolbar = renderizar();
    expect(htmlToolbar).toMatch(/^<div[^>]*role="group"[^>]*aria-label="Filtro de período"/);
    const divToolbar = htmlToolbar.match(/^<div[^>]*class="([^"]+)"/)?.[1] ?? "";
    expect(divToolbar).toContain("bg-surface");
    expect(divToolbar).not.toContain("bg-surface-subtle");
    expect(divToolbar).toContain("shrink-0");

    const htmlKpi = renderizar({ variante: "kpi" });
    const divKpi = htmlKpi.match(/^<div[^>]*class="([^"]+)"/)?.[1] ?? "";
    expect(divKpi).toContain("bg-surface-subtle");
    expect(divKpi).not.toContain("shrink-0");
  });

  it("associa labels nativos via htmlFor/id conforme WCAG 2.5.3 sem aria-label nos inputs ou min/max", () => {
    const html = renderizar();

    const labelInicio = html.match(
      /<label for="([^"]+-inicio)"[^>]*>De:<span class="sr-only[^"]*"> Data inicial do filtro<\/span><\/label>/,
    );
    const labelFim = html.match(
      /<label for="([^"]+-fim)"[^>]*>Até:<span class="sr-only[^"]*"> Data final do filtro<\/span><\/label>/,
    );
    expect(labelInicio?.[1]).toBeTruthy();
    expect(labelFim?.[1]).toBeTruthy();
    expect(labelInicio?.[1]).not.toBe(labelFim?.[1]);

    const idInicio = labelInicio?.[1] ?? "";
    const idFim = labelFim?.[1] ?? "";

    const inputInicial =
      html.match(new RegExp(`<input[^>]*id="${idInicio.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"[^>]*>`))?.[0] ?? "";
    const inputFinal =
      html.match(new RegExp(`<input[^>]*id="${idFim.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"[^>]*>`))?.[0] ?? "";

    expect(inputInicial).toContain('type="date"');
    expect(inputInicial).toContain('value=""');
    expect(inputFinal).toContain('type="date"');
    expect(inputFinal).toContain('value=""');

    expect(inputInicial).not.toContain("aria-label=");
    expect(inputFinal).not.toContain("aria-label=");
    expect(inputInicial).not.toMatch(/\bmin=/);
    expect(inputInicial).not.toMatch(/\bmax=/);
    expect(inputFinal).not.toMatch(/\bmin=/);
    expect(inputFinal).not.toMatch(/\bmax=/);
  });

  it("remove focus:outline-none, proíbe focus-visible:outline-none e não duplica ring em inputs e botão", () => {
    const html = renderizar({
      dataInicial: "2026-10-01",
      onLimpar: () => {},
    });

    expect(html).not.toContain("focus:outline-none");
    expect(html).not.toContain("focus-visible:outline-none");
    expect(html).not.toContain("focus-visible:ring-");
  });

  it("exibe o botão limpar somente quando há data e callback onLimpar, centralizando o ícone no alvo", () => {
    const semDatas = renderizar({ onLimpar: () => {} });
    expect(semDatas).not.toContain("<button");
    expect(semDatas).not.toContain("Limpar filtro de período");

    const semCallback = renderizar({
      dataInicial: "2026-10-01",
      dataFinal: "2026-10-31",
    });
    expect(semCallback).not.toContain("<button");
    expect(semCallback).not.toContain("Limpar filtro de período");

    for (const props of [
      { dataInicial: "2026-10-01", onLimpar: () => {} },
      { dataFinal: "2026-10-31", onLimpar: () => {} },
      { dataInicial: "2026-10-01", dataFinal: "2026-10-31", onLimpar: () => {} },
    ]) {
      const html = renderizar(props);
      const botao = html.match(/<button[^>]*>[\s\S]*?<\/button>/)?.[0] ?? "";
      expect(botao).toContain('type="button"');
      expect(botao).toContain("inline-flex items-center justify-center");
      expect(botao).toContain('aria-label="Limpar filtro de período"');
      expect(botao).toContain('title="Limpar filtro de período"');
      expect(botao).toMatch(/<svg[^>]*aria-hidden="true"/);
    }
  });
});
