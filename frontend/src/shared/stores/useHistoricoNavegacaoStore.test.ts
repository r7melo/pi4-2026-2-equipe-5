import { describe, it, expect, beforeEach } from "vitest";
import {
  ehRotaRastreavel,
  useHistoricoNavegacaoStore,
} from "./useHistoricoNavegacaoStore";

describe("useHistoricoNavegacaoStore", () => {
  beforeEach(() => {
    useHistoricoNavegacaoStore.getState().limpar();
  });

  it("ignora rotas públicas e de erro no rastreamento", () => {
    expect(ehRotaRastreavel("/")).toBe(false);
    expect(ehRotaRastreavel("/login")).toBe(false);
    expect(ehRotaRastreavel("/esqueci-senha")).toBe(false);
    expect(ehRotaRastreavel("/redefinir-senha")).toBe(false);
    expect(ehRotaRastreavel("/sem-permissao")).toBe(false);
    expect(ehRotaRastreavel("/cronograma/compartilhado/abc")).toBe(false);
    expect(ehRotaRastreavel("/relatorio-publico/xyz")).toBe(false);
    expect(ehRotaRastreavel("/kanban")).toBe(true);
    expect(ehRotaRastreavel("/configuracoes/")).toBe(true);
  });

  it("empilha rotas privadas, evita duplicata consecutiva e normaliza barra final", () => {
    const store = useHistoricoNavegacaoStore.getState();
    store.registrar({ key: "k1", pathname: "/kanban/", search: "" }, "PUSH");
    store.registrar({ key: "k2", pathname: "/kanban", search: "" }, "PUSH");
    store.registrar({ key: "k3", pathname: "/configuracoes", search: "" }, "PUSH");

    const { pilha } = useHistoricoNavegacaoStore.getState();
    expect(pilha).toHaveLength(2);
    expect(pilha[0]).toMatchObject({ key: "k2", pathname: "/kanban", rota: "/kanban" });
    expect(pilha[1]).toMatchObject({ key: "k3", pathname: "/configuracoes", rota: "/configuracoes" });
  });

  it("corta a pilha ao voltar (POP) e substitui o topo em REPLACE", () => {
    const store = useHistoricoNavegacaoStore.getState();
    store.registrar({ key: "k1", pathname: "/equipes", search: "" }, "PUSH");
    store.registrar({ key: "k2", pathname: "/obras/12", search: "" }, "PUSH");
    store.registrar({ key: "k3", pathname: "/obras/12/materiais", search: "" }, "PUSH");

    store.registrar({ key: "k2", pathname: "/obras/12", search: "" }, "POP");
    expect(useHistoricoNavegacaoStore.getState().pilha.map((p) => p.rota)).toEqual([
      "/equipes",
      "/obras/12",
    ]);

    store.registrar({ key: "k4", pathname: "/clientes", search: "" }, "REPLACE");
    expect(useHistoricoNavegacaoStore.getState().pilha.map((p) => p.rota)).toEqual([
      "/equipes",
      "/clientes",
    ]);
  });

  it("filtra a rota anterior conforme o perfil RBAC e limpa o histórico", () => {
    const store = useHistoricoNavegacaoStore.getState();
    store.registrar({ key: "k1", pathname: "/usuarios", search: "" }, "PUSH");
    store.registrar({ key: "k2", pathname: "/equipes", search: "" }, "PUSH");
    store.registrar({ key: "k3", pathname: "/configuracoes", search: "" }, "PUSH");

    expect(store.obterAnteriorValida("Administrador")?.rota).toBe("/equipes");
    expect(store.obterAnteriorValida("Financeiro")?.rota).toBe("/equipes");
    expect(store.obterAnteriorValida("Engenharia")?.rota).toBe("/equipes");
    expect(store.obterAnteriorValida("InstaladorCampo")).toBeNull();

    store.registrar({ key: "k4", pathname: "/clientes", search: "" }, "PUSH");
    expect(store.obterAnteriorValida("Financeiro")?.rota).toBe("/configuracoes");

    store.limpar();
    expect(useHistoricoNavegacaoStore.getState().pilha).toEqual([]);
  });
});
