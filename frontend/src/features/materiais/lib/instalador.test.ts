import { beforeEach, describe, expect, it, vi } from "vitest";
import axios from "axios";
import MockAdapter from "axios-mock-adapter";
import { registrarManutencoes } from "@/shared/api/mock/handlers/manutencoes";
import { resetarManutencoesMock } from "@/shared/api/mock/dados/manutencoes";
import {
  LIMITE_CARACTERES_MANUTENCAO,
  MENSAGENS_VALIDACAO_MANUTENCAO,
  validarComentarioManutencao,
  validarConclusaoManutencao,
} from "./validacaoManutencao";

vi.mock("@/shared/api/mock/core/auth", () => ({
  resolverUsuarioAutenticadoMock: (header: unknown) => {
    if (!header) return undefined;
    const texto = String(header);
    if (texto === "InstaladorEquipe1") {
      return {
        id: 15,
        nome: "Bruno Lima",
        equipeId: 1,
        perfil: { nomePerfil: "InstaladorCampo" },
      };
    }
    if (texto === "InstaladorEquipe2") {
      return {
        id: 22,
        nome: "Diego Alves",
        equipeId: 2,
        perfil: { nomePerfil: "InstaladorCampo" },
      };
    }
    return {
      id: 1,
      nome: "Gestor",
      equipeId: null,
      perfil: { nomePerfil: texto },
    };
  },
}));

function criarClienteInstalador() {
  const cliente = axios.create({ validateStatus: () => true });
  const mock = new MockAdapter(cliente);
  registrarManutencoes(mock);
  return { cliente, mock };
}

describe("Validação pura de manutenção e comentários em campo", () => {
  it("valida serviço executado ao concluir manutenção", () => {
    expect(validarConclusaoManutencao("   ")).toEqual({
      ok: false,
      mensagem: MENSAGENS_VALIDACAO_MANUTENCAO.servicoObrigatorio,
    });
    expect(validarConclusaoManutencao("Troca\0invalida")).toEqual({
      ok: false,
      mensagem: MENSAGENS_VALIDACAO_MANUTENCAO.servicoCaractereInvalido,
    });
    expect(
      validarConclusaoManutencao("x".repeat(LIMITE_CARACTERES_MANUTENCAO + 1))
    ).toEqual({
      ok: false,
      mensagem: MENSAGENS_VALIDACAO_MANUTENCAO.servicoMuitoLongo,
    });
    expect(validarConclusaoManutencao("  Substituído disjuntor do inversor.  ")).toEqual({
      ok: true,
      texto: "Substituído disjuntor do inversor.",
    });
  });

  it("valida comentário técnico de manutenção", () => {
    expect(validarComentarioManutencao("")).toEqual({
      ok: false,
      mensagem: MENSAGENS_VALIDACAO_MANUTENCAO.comentarioObrigatorio,
    });
    expect(validarComentarioManutencao("Texto\0nulo")).toEqual({
      ok: false,
      mensagem: MENSAGENS_VALIDACAO_MANUTENCAO.comentarioCaractereInvalido,
    });
    expect(validarComentarioManutencao("  Cliente solicitou retorno amanhã.  ")).toEqual({
      ok: true,
      texto: "Cliente solicitou retorno amanhã.",
    });
  });
});

describe("API Mock de Manutenções do Instalador (Rotas #39, #40 e #41)", () => {
  beforeEach(() => {
    resetarManutencoesMock();
  });

  it("bloqueia acesso sem sessão (401) e perfis que não são InstaladorCampo (403)", async () => {
    const { cliente, mock } = criarClienteInstalador();
    try {
      expect((await cliente.get("/instalador/manutencoes")).status).toBe(401);
      const respostas = await Promise.all(
        ["Administrador", "Engenharia", "Financeiro"].map((perfil) =>
          cliente.get("/instalador/manutencoes", {
            headers: { Authorization: perfil },
          })
        )
      );
      for (const resp of respostas) {
        expect(resp.status).toBe(403);
      }
    } finally {
      mock.restore();
    }
  });

  it("lista apenas manutenções da equipe do instalador, filtra por status e rejeita filtro inválido", async () => {
    const { cliente, mock } = criarClienteInstalador();
    try {
      const todas = await cliente.get("/instalador/manutencoes", {
        headers: { Authorization: "InstaladorEquipe1" },
      });
      expect(todas.status).toBe(200);
      expect(todas.data.map((m: { id: number }) => m.id)).toEqual([41, 42, 43]);
      for (const item of todas.data as Array<Record<string, unknown>>) {
        expect("custoUnitario" in item).toBe(false);
        expect("valorObra" in item).toBe(false);
      }

      const pendentes = await cliente.get("/instalador/manutencoes", {
        params: { status: "Pendente" },
        headers: { Authorization: "InstaladorEquipe1" },
      });
      expect(pendentes.status).toBe(200);
      expect(pendentes.data.map((m: { id: number }) => m.id)).toEqual([41, 42]);

      const invalido = await cliente.get("/instalador/manutencoes", {
        params: { status: "Cancelada" },
        headers: { Authorization: "InstaladorEquipe1" },
      });
      expect(invalido.status).toBe(400);
      expect(invalido.data.error.code).toBe("INVALID_PARAMETER");
    } finally {
      mock.restore();
    }
  });

  it("conclui manutenção da própria equipe, impede dupla conclusão e isola outra equipe", async () => {
    const { cliente, mock } = criarClienteInstalador();
    try {
      const vazia = await cliente.patch(
        "/manutencoes/41/concluir",
        { servicoExecutado: "   " },
        { headers: { Authorization: "InstaladorEquipe1" } }
      );
      expect(vazia.status).toBe(400);

      const concluida = await cliente.patch(
        "/manutencoes/41/concluir",
        { servicoExecutado: "Substituído conector MC4 oxidado." },
        { headers: { Authorization: "InstaladorEquipe1" } }
      );
      expect(concluida.status).toBe(200);
      expect(concluida.data.status).toBe("Concluida");
      expect(typeof concluida.data.dataConclusao).toBe("string");

      const repetida = await cliente.patch(
        "/manutencoes/41/concluir",
        { servicoExecutado: "Tentativa repetida" },
        { headers: { Authorization: "InstaladorEquipe1" } }
      );
      expect(repetida.status).toBe(400);

      const outraEquipe = await cliente.patch(
        "/manutencoes/44/concluir",
        { servicoExecutado: "Serviço indevido" },
        { headers: { Authorization: "InstaladorEquipe1" } }
      );
      expect(outraEquipe.status).toBe(403);

      const inexistente = await cliente.patch(
        "/manutencoes/999/concluir",
        { servicoExecutado: "Algo" },
        { headers: { Authorization: "InstaladorEquipe1" } }
      );
      expect(inexistente.status).toBe(404);
    } finally {
      mock.restore();
    }
  });

  it("cria comentário técnico na manutenção com tipo Manutencao e respeita vínculo de equipe", async () => {
    const { cliente, mock } = criarClienteInstalador();
    try {
      const vazio = await cliente.post(
        "/manutencoes/41/comentarios",
        { descricao: "  " },
        { headers: { Authorization: "InstaladorEquipe1" } }
      );
      expect(vazio.status).toBe(400);

      const criado = await cliente.post(
        "/manutencoes/41/comentarios",
        { descricao: "Cliente orientou acesso pelo portão lateral." },
        { headers: { Authorization: "InstaladorEquipe1" } }
      );
      expect(criado.status).toBe(201);
      expect(criado.data.tipo).toBe("Manutencao");
      expect(criado.data.manutencaoId).toBe(41);

      const outraEquipe = await cliente.post(
        "/manutencoes/44/comentarios",
        { descricao: "Sem vínculo" },
        { headers: { Authorization: "InstaladorEquipe1" } }
      );
      expect(outraEquipe.status).toBe(403);
    } finally {
      mock.restore();
    }
  });
});
