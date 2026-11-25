import { beforeEach, describe, expect, it, vi } from "vitest";
import axios from "axios";
import MockAdapter from "axios-mock-adapter";
import { registrarProdutos } from "@/shared/api/mock/handlers/produtos";
import { resetarProdutosMock } from "@/shared/api/mock/dados/produtos";
import { obterELimparRotaRetorno } from "@/shared/lib/rotasSessao";
import {
  MENSAGENS_VALIDACAO_PRODUTO,
  parsearPrecoUnitario,
  validarFormularioProduto,
} from "./validacaoProduto";

vi.mock("@/shared/api/mock/core/auth", () => ({
  resolverUsuarioAutenticadoMock: (perfil: unknown) =>
    perfil ? { perfil: { nomePerfil: String(perfil) } } : undefined,
}));

function criarClienteProdutos() {
  const cliente = axios.create({ validateStatus: () => true });
  const mock = new MockAdapter(cliente);
  registrarProdutos(mock);
  return { cliente, mock };
}

describe("parsearPrecoUnitario e validarFormularioProduto", () => {
  it("converte formatos numéricos brasileiros e decimais válidos", () => {
    expect(parsearPrecoUnitario("685,00")).toBe(685);
    expect(parsearPrecoUnitario("1.250,75")).toBe(1250.75);
    expect(parsearPrecoUnitario("8450.5")).toBe(8450.5);
    expect(parsearPrecoUnitario("0")).toBe(0);
    expect(parsearPrecoUnitario("abc")).toBeNull();
  });

  it("valida campos obrigatórios e limites contratuais", () => {
    const valido = validarFormularioProduto({
      nome: "  Inversor Híbrido 10kW  ",
      tipo: " Inversor ",
      unidade: " un ",
      precoUnitario: "12.345,67",
      ativo: true,
    });
    expect(valido).toEqual({
      ok: true,
      dados: {
        nome: "Inversor Híbrido 10kW",
        tipo: "Inversor",
        unidade: "un",
        precoUnitario: 12345.67,
        ativo: true,
      },
    });

    expect(
      validarFormularioProduto({
        nome: "   ",
        tipo: "Inversor",
        unidade: "un",
        precoUnitario: "100",
        ativo: true,
      })
    ).toEqual({
      ok: false,
      falha: { campo: "nome", mensagem: MENSAGENS_VALIDACAO_PRODUTO.nomeObrigatorio },
    });

    expect(
      validarFormularioProduto({
        nome: "Cabo",
        tipo: "Cabeamento",
        unidade: "m",
        precoUnitario: "-10",
        ativo: true,
      })
    ).toEqual({
      ok: false,
      falha: { campo: "precoUnitario", mensagem: MENSAGENS_VALIDACAO_PRODUTO.precoInvalido },
    });
  });
});

describe("API Mock de Catálogo de Produtos (/api/produtos)", () => {
  beforeEach(() => {
    resetarProdutosMock();
  });

  it("rejeita consulta sem autenticação com 401", async () => {
    const { cliente, mock } = criarClienteProdutos();
    try {
      const resp = await cliente.get("/produtos");
      expect(resp.status).toBe(401);
    } finally {
      mock.restore();
    }
  });

  it("oculta precoUnitario e inativos para Engenharia e bloqueia gestão com 403", async () => {
    const { cliente, mock } = criarClienteProdutos();
    try {
      const resp = await cliente.get("/produtos", {
        headers: { Authorization: "Engenharia" },
      });
      expect(resp.status).toBe(200);
      expect(Array.isArray(resp.data)).toBe(true);
      expect(resp.data.length).toBeGreaterThan(0);
      for (const item of resp.data as Array<Record<string, unknown>>) {
        expect(item.ativo).toBe(true);
        expect("precoUnitario" in item).toBe(false);
      }

      const respInativos = await cliente.get("/produtos", {
        params: { incluirInativos: true },
        headers: { Authorization: "Engenharia" },
      });
      expect(respInativos.status).toBe(403);

      const respPost = await cliente.post(
        "/produtos",
        { nome: "Item Teste", tipo: "Acessório", unidade: "un", precoUnitario: 50 },
        { headers: { Authorization: "Engenharia" } }
      );
      expect(respPost.status).toBe(403);
    } finally {
      mock.restore();
    }
  });

  it("permite Financeiro e Administrador criarem, filtrarem e inativarem produtos", async () => {
    const { cliente, mock } = criarClienteProdutos();
    try {
      const criado = await cliente.post(
        "/produtos",
        { nome: "Disjuntor Bipolar 32A", tipo: "Proteção Elétrica", unidade: "un", precoUnitario: 89.9 },
        { headers: { Authorization: "Financeiro" } }
      );
      expect(criado.status).toBe(201);
      expect(criado.data.precoUnitario).toBe(89.9);
      expect(criado.data.ativo).toBe(true);

      const inativado = await cliente.put(
        `/produtos/${criado.data.id}`,
        { ativo: false, precoUnitario: 95 },
        { headers: { Authorization: "Administrador" } }
      );
      expect(inativado.status).toBe(200);
      expect(inativado.data.ativo).toBe(false);
      expect(inativado.data.precoUnitario).toBe(95);

      const ativos = await cliente.get("/produtos", {
        params: { nome: "Disjuntor" },
        headers: { Authorization: "Financeiro" },
      });
      expect(ativos.data).toHaveLength(0);

      const comInativos = await cliente.get("/produtos", {
        params: { nome: "Disjuntor", incluirInativos: true },
        headers: { Authorization: "Financeiro" },
      });
      expect(comInativos.data).toHaveLength(1);
    } finally {
      mock.restore();
    }
  });

  it("preserva retorno pós-login de /produtos apenas para Administrador e Financeiro", () => {
    expect(obterELimparRotaRetorno("Administrador", "/produtos")).toBe("/produtos");
    expect(obterELimparRotaRetorno("Financeiro", "/produtos")).toBe("/produtos");
    expect(obterELimparRotaRetorno("Engenharia", "/produtos")).toBe("/kanban");
  });
});
