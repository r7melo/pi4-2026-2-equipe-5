import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createElement, type ComponentProps } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

vi.mock("@/shared/stores/useAuthStore", async (importOriginal) => {
  const orig = await importOriginal<typeof import("@/shared/stores/useAuthStore")>();
  const store = orig.useAuthStore;
  const wrapped = ((selector?: (s: ReturnType<typeof store.getState>) => unknown) => {
    const estado = store.getState();
    return selector ? selector(estado) : estado;
  }) as typeof store;
  Object.assign(wrapped, store);
  return { ...orig, useAuthStore: wrapped };
});

import PaginaNaoEncontrada from "@/features/auth/pages/PaginaNaoEncontrada";
import { resolverTituloRota } from "@/shared/lib/rotasSessao";
import Kanban, { type KanbanProps } from "@/features/kanban/pages/Kanban";
import { ModoDisplayProvider } from "@/shared/contexts/ModoDisplayContext";
import { useAuthStore } from "@/shared/stores/useAuthStore";
import type { NomePerfil } from "@/shared/types/autorizacao";

function definirSessaoTeste(nomePerfil: NomePerfil | null) {
  if (!nomePerfil) {
    useAuthStore.setState({ token: "token-teste", usuario: null, expiresAt: "2099-01-01T00:00:00Z" });
    return;
  }
  useAuthStore.setState({
    token: "token-teste",
    expiresAt: "2099-01-01T00:00:00Z",
    usuario: {
      id: 99,
      nome: "Usuário Teste",
      email: "teste@zl.com.br",
      perfil: { id: 1, nomePerfil, permissoes: [] },
      equipeId: null,
    },
  });
}

function renderizarPagina404(rota: string, perfil: NomePerfil | null) {
  definirSessaoTeste(perfil);
  const queryClient = new QueryClient();
  return renderToStaticMarkup(
    createElement(
      QueryClientProvider,
      { client: queryClient },
      createElement(MemoryRouter, { initialEntries: [rota] }, createElement(PaginaNaoEncontrada)),
    ),
  );
}

function renderizarKanban(
  perfil: NomePerfil,
  props: KanbanProps,
) {
  definirSessaoTeste(perfil);
  const queryClient = new QueryClient();
  return renderToStaticMarkup(
    createElement(
      QueryClientProvider,
      { client: queryClient },
      createElement(
        MemoryRouter,
        { initialEntries: ["/kanban"] },
        createElement(
          ModoDisplayProvider,
          { autorizado: true, identidadeSessao: "teste", perfil } as ComponentProps<typeof ModoDisplayProvider>,
          createElement<KanbanProps>(Kanban, props),
        ),
      ),
    ),
  );
}

describe("Demanda #114 — RF-24 (PaginaNaoEncontrada, MetadadosRota e Estados do Kanban)", () => {
  beforeEach(() => {
    vi.stubGlobal("localStorage", {
      getItem: () => null,
      setItem: () => {},
      removeItem: () => {},
      clear: () => {},
      key: () => null,
      length: 0,
    });
    vi.stubGlobal("window", {
      matchMedia: () => ({
        matches: false,
        media: "",
        onchange: null,
        addListener: () => {},
        removeListener: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => false,
      }),
      addEventListener: () => {},
      removeEventListener: () => {},
      location: { pathname: "/kanban" },
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    useAuthStore.setState({ token: null, usuario: null, expiresAt: null });
  });

  it("oculta caminhos malformados ou reservados e limita caminhos extensos na PaginaNaoEncontrada", () => {
    expect(renderizarPagina404("/obras/1/inexistente/", "Administrador")).toContain(
      '<code class="font-mono text-foreground break-all">/obras/1/inexistente</code>',
    );
    const longo = "/" + "a".repeat(120);
    expect(renderizarPagina404(longo, "Administrador")).toContain(
      `<code class="font-mono text-foreground break-all">${"/" + "a".repeat(79)}</code>`,
    );

    const htmlComQuery = renderizarPagina404("/obras?token=1", "Administrador");
    expect(htmlComQuery).not.toContain("token=1");
    expect(htmlComQuery).toContain(">/obras</code>");

    const htmlComHash = renderizarPagina404("/obras#frag", "Administrador");
    expect(htmlComHash).not.toContain("frag");
    expect(htmlComHash).toContain(">/obras</code>");

    for (const invalido of [
      "/",
      "/login",
      "/sem-permissao/",
      "//evil.com",
      "/obras\\1",
      "/obras/%0a",
    ]) {
      const htmlInvalido = renderizarPagina404(invalido, "Administrador");
      expect(htmlInvalido).not.toContain("Endereço acessado");
    }
  });

  it("resolverTituloRota resolve rotas dinâmicas, trailing slash e 404 com correspondência exata", () => {
    expect(resolverTituloRota("/kanban/")).toBe("Obras");
    expect(resolverTituloRota("/Kanban")).toBe("Obras");
    expect(resolverTituloRota("/obras/301")).toBe("Detalhes da obra");
    expect(resolverTituloRota("/obras/301/materiais")).toBe("Materiais da obra");
    expect(resolverTituloRota("/cronograma/compartilhado/tok123")).toBe("Cronograma compartilhado");
    expect(resolverTituloRota("/relatorio-publico/tok123")).toBe("Relatório compartilhado");

    expect(resolverTituloRota("/rota-inexistente")).toBe("Página não encontrada");
    expect(resolverTituloRota("/obras/")).toBe("Página não encontrada");
    expect(resolverTituloRota("/obras/301/inexistente")).toBe("Página não encontrada");
    expect(resolverTituloRota("/obras/301/materiais/extra")).toBe("Página não encontrada");
    expect(resolverTituloRota("/cronograma/compartilhado/")).toBe("Página não encontrada");
    expect(resolverTituloRota("/cronograma/compartilhado/a/b")).toBe("Página não encontrada");
    expect(resolverTituloRota("/relatorio-publico/a/b")).toBe("Página não encontrada");
  });

  it("renderiza PaginaNaoEncontrada com skip-link, landmark único, caminho sanitizado e retorno para perfis de escritório", () => {
    const html = renderizarPagina404("/obras/1/inexistente", "Administrador");
    expect(html).toContain('href="#conteudo-principal" class="skip-link"');
    expect(html).toContain('<main id="conteudo-principal" tabindex="-1"');
    expect(html).toContain('<h1 id="nao-encontrada-titulo" tabindex="-1"');
    expect(html).toContain("Página não encontrada");
    expect(html).toContain("/obras/1/inexistente");
    expect(html).toContain("Voltar ao início");
    expect(html).toMatch(/<svg[^>]*aria-hidden="true"/);
    expect(html).not.toMatch(/\b(?:RF|UC|RN|RNF)-\d+\b/);
  });

  it("renderiza layout standalone sem skip-link para InstaladorCampo e Trocar de conta para sessão não canônica", () => {
    const htmlInstalador = renderizarPagina404("/rota-inexistente", "InstaladorCampo");
    expect(htmlInstalador).not.toContain("skip-link");
    expect(htmlInstalador).toContain("Voltar ao início");
    expect(htmlInstalador).not.toContain("Trocar de conta");

    const htmlSemPerfil = renderizarPagina404("/rota-inexistente", null);
    expect(htmlSemPerfil).not.toContain("skip-link");
    expect(htmlSemPerfil).not.toContain("Voltar ao início");
    expect(htmlSemPerfil).toContain("Trocar de conta");
  });

  it("exibe Cadastrar primeira obra para Admin/Engenharia no Kanban vazio, oculta para Financeiro e exibe erro amigável", () => {
    for (const perfil of ["Administrador", "Engenharia"] as const) {
      const html = renderizarKanban(perfil, { obras: [] });
      expect(html).toContain("Nenhuma obra cadastrada");
      expect(html).toContain("Cadastrar primeira obra");
    }

    const htmlFinanceiro = renderizarKanban("Financeiro", { obras: [] });
    expect(htmlFinanceiro).toContain("Nenhuma obra cadastrada");
    expect(htmlFinanceiro).not.toContain("Cadastrar primeira obra");

    const htmlErro = renderizarKanban("Engenharia", { obras: [], erroObras: true });
    expect(htmlErro).toContain("Não foi possível carregar as obras do funil.");
    expect(htmlErro).not.toContain("Nenhuma obra cadastrada");
  });
});
