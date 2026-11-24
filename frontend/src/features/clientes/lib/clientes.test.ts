import { beforeEach, describe, expect, it, vi } from "vitest";
import axios from "axios";
import MockAdapter from "axios-mock-adapter";
import { registrarClientes } from "@/shared/api/mock/handlers/clientes";
import { resetarClientesMock } from "@/shared/api/mock/dados/clientes";
import { obterELimparRotaRetorno } from "@/shared/lib/rotasSessao";
import {
  MENSAGENS_VALIDACAO_CLIENTE,
  validarFormularioCliente,
} from "./validacaoCliente";

vi.mock("@/shared/api/mock/core/auth", () => ({
  resolverUsuarioAutenticadoMock: (perfil: unknown) =>
    perfil ? { id: 1, nome: "Gestor", perfil: { nomePerfil: String(perfil) } } : undefined,
}));

function criarClienteHttp() {
  const cliente = axios.create({ validateStatus: () => true });
  const mock = new MockAdapter(cliente);
  registrarClientes(mock);
  return { cliente, mock };
}

describe("validarFormularioCliente", () => {
  it("aceita CPF e CNPJ válidos com máscara e normaliza dígitos", () => {
    const res = validarFormularioCliente({
      nome: "  João da Silva  ",
      cpfCnpj: "529.982.247-25",
      cidade: " Crateús ",
      endereco: " Rua Centro, 10 ",
      telefone: "(88) 99999-1111",
      email: "joao@email.com",
    });

    expect(res).toEqual({
      ok: true,
      dados: {
        nome: "João da Silva",
        cpfCnpj: "52998224725",
        cidade: "Crateús",
        endereco: "Rua Centro, 10",
        telefone: "(88) 99999-1111",
        email: "joao@email.com",
        dadosContrato: null,
      },
    });
  });

  it("rejeita nome vazio, CPF/CNPJ ausente ou com dígitos verificadores inválidos e e-mail malformado", () => {
    expect(
      validarFormularioCliente({ nome: "   ", cpfCnpj: "52998224725" })
    ).toEqual({
      ok: false,
      falha: { campo: "nome", mensagem: MENSAGENS_VALIDACAO_CLIENTE.nomeObrigatorio },
    });

    expect(
      validarFormularioCliente({ nome: "Maria", cpfCnpj: "" })
    ).toEqual({
      ok: false,
      falha: { campo: "cpfCnpj", mensagem: MENSAGENS_VALIDACAO_CLIENTE.cpfCnpjObrigatorio },
    });

    expect(
      validarFormularioCliente({ nome: "Maria", cpfCnpj: "111.111.111-11" })
    ).toEqual({
      ok: false,
      falha: { campo: "cpfCnpj", mensagem: MENSAGENS_VALIDACAO_CLIENTE.cpfCnpjInvalido },
    });

    expect(
      validarFormularioCliente({
        nome: "Maria",
        cpfCnpj: "529.982.247-25",
        email: "email-invalido",
      })
    ).toEqual({
      ok: false,
      falha: { campo: "email", mensagem: MENSAGENS_VALIDACAO_CLIENTE.emailInvalido },
    });
  });
});

describe("API Mock de Clientes (Rotas #10, #10a, #10b e #11)", () => {
  beforeEach(() => {
    resetarClientesMock();
  });

  it("bloqueia acesso sem autenticação (401) e perfis não autorizados (403)", async () => {
    const { cliente, mock } = criarClienteHttp();
    try {
      expect((await cliente.get("/clientes")).status).toBe(401);
      const respostas = await Promise.all(
        ["Financeiro", "InstaladorCampo"].map((perfil) =>
          cliente.get("/clientes", { headers: { Authorization: perfil } })
        )
      );
      for (const r of respostas) {
        expect(r.status).toBe(403);
      }
    } finally {
      mock.restore();
    }
  });

  it("lista clientes com quantidadeObras e permite cadastrar e editar com CPF/CNPJ único", async () => {
    const { cliente, mock } = criarClienteHttp();
    try {
      const lista = await cliente.get("/clientes", {
        headers: { Authorization: "Engenharia" },
      });
      expect(lista.status).toBe(200);
      expect(lista.data.itens.length).toBeGreaterThanOrEqual(3);

      // Tentativa com CPF/CNPJ duplicado do seed (12345678000195)
      const duplicado = await cliente.post(
        "/clientes",
        { nome: "Outro Alfa", cpfCnpj: "12.345.678/0001-95" },
        { headers: { Authorization: "Engenharia" } }
      );
      expect(duplicado.status).toBe(409);
      expect(duplicado.data.error.code).toBe("CPF_CNPJ_DUPLICADO");

      // Cadastro válido com novo CPF válido (39053344705)
      const criado = await cliente.post(
        "/clientes",
        {
          nome: "Construtora Horizonte",
          cpfCnpj: "390.533.447-05",
          cidade: "Crateús",
        },
        { headers: { Authorization: "Engenharia" } }
      );
      expect(criado.status).toBe(201);
      expect(criado.data.quantidadeObras).toBe(0);

      // Edição válida
      const editado = await cliente.put(
        `/clientes/${criado.data.id}`,
        { nome: "Construtora Horizonte Solar", cidade: "Sobral" },
        { headers: { Authorization: "Administrador" } }
      );
      expect(editado.status).toBe(200);
      expect(editado.data.nome).toBe("Construtora Horizonte Solar");
    } finally {
      mock.restore();
    }
  });

  it("bloqueia exclusão de cliente com obras (409 CLIENTE_COM_OBRAS) e permite excluir cliente sem obras (204)", async () => {
    const { cliente, mock } = criarClienteHttp();
    try {
      // Cliente #1 possui obras vinculadas no seed
      const comObras = await cliente.delete("/clientes/1", {
        headers: { Authorization: "Administrador" },
      });
      expect(comObras.status).toBe(409);
      expect(comObras.data.error.code).toBe("CLIENTE_COM_OBRAS");

      // Cliente #3 não possui obras vinculadas no seed
      const semObras = await cliente.delete("/clientes/3", {
        headers: { Authorization: "Engenharia" },
      });
      expect(semObras.status).toBe(204);

      const inexistente = await cliente.delete("/clientes/999", {
        headers: { Authorization: "Administrador" },
      });
      expect(inexistente.status).toBe(404);
    } finally {
      mock.restore();
    }
  });

  it("preserva retorno pós-login de /clientes apenas para Administrador e Engenharia", () => {
    expect(obterELimparRotaRetorno("Administrador", "/clientes")).toBe("/clientes");
    expect(obterELimparRotaRetorno("Engenharia", "/clientes")).toBe("/clientes");
    expect(obterELimparRotaRetorno("Financeiro", "/clientes")).toBe("/kanban");
    expect(obterELimparRotaRetorno("InstaladorCampo", "/clientes")).toBe("/linkparainstaladores");
  });
});
