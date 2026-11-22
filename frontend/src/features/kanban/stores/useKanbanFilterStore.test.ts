import { beforeEach, describe, expect, it, vi } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import KanbanQuickFilters from "../components/KanbanQuickFilters";

function criarSessionStorageStub() {
  const dados = new Map<string, string>();
  return {
    getItem: (chave: string) => dados.get(chave) ?? null,
    setItem: (chave: string, valor: string) => {
      dados.set(chave, valor);
    },
    removeItem: (chave: string) => {
      dados.delete(chave);
    },
    clear: () => {
      dados.clear();
    },
    key: (indice: number) => Array.from(dados.keys())[indice] ?? null,
    get length() {
      return dados.size;
    },
  } satisfies Storage;
}

describe("useKanbanFilterStore e KanbanQuickFilters (RN-110-01 / RN-110-02)", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubGlobal("sessionStorage", criarSessionStorageStub());
  });

  it("persiste exibirArquivadas, busca e filtros em sessionStorage e restaura todos em limparFiltros()", async () => {
    const { useKanbanFilterStore } = await import("./useKanbanFilterStore");

    expect(useKanbanFilterStore.getState()).toMatchObject({
      busca: "",
      categoriaFiltro: "",
      materialFiltro: "",
      exibirArquivadas: false,
    });

    useKanbanFilterStore.getState().setBusca("Alfa");
    useKanbanFilterStore.getState().setCategoriaFiltro("Residencial");
    useKanbanFilterStore.getState().setMaterialFiltro("Comprado");
    useKanbanFilterStore.getState().setExibirArquivadas(true);

    expect(useKanbanFilterStore.getState()).toMatchObject({
      busca: "Alfa",
      categoriaFiltro: "Residencial",
      materialFiltro: "Comprado",
      exibirArquivadas: true,
    });

    const chavePersistida =
      sessionStorage.getItem("mock_kanban_filter_v1") ??
      sessionStorage.getItem("kanban-filter-storage");
    expect(chavePersistida).toBeTruthy();
    expect(JSON.parse(chavePersistida!)).toMatchObject({
      state: {
        busca: "Alfa",
        categoriaFiltro: "Residencial",
        materialFiltro: "Comprado",
        exibirArquivadas: true,
      },
    });

    useKanbanFilterStore.getState().limparFiltros();
    expect(useKanbanFilterStore.getState()).toMatchObject({
      busca: "",
      categoriaFiltro: "",
      materialFiltro: "",
      exibirArquivadas: false,
    });
  });

  it("rehidrata exibirArquivadas: true em nova importação do módulo via sessionStorage", async () => {
    const { useKanbanFilterStore: primeiraInstancia } = await import("./useKanbanFilterStore");
    primeiraInstancia.getState().setExibirArquivadas(true);

    vi.resetModules();
    const { useKanbanFilterStore: segundaInstancia } = await import("./useKanbanFilterStore");
    expect(segundaInstancia.getState().exibirArquivadas).toBe(true);
  });

  it("marca ícone Filter com aria-hidden e não renderiza badge 0 quando apenas temLimpezaDisponivel é verdadeiro", () => {
    const html = renderToStaticMarkup(
      createElement(KanbanQuickFilters, {
        categoriaFiltro: "",
        setCategoriaFiltro: () => {},
        materialFiltro: "",
        setMaterialFiltro: () => {},
        onLimparFiltros: () => {},
        temFiltroAtivo: false,
        temLimpezaDisponivel: true,
      }),
    );

    expect(html).toMatch(/<svg[^>]*aria-hidden="true"/);
    expect(html).not.toContain(">0<");
    expect(html).toContain("Filtros");
  });
});
