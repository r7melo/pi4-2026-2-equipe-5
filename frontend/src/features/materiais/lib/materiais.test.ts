import { beforeEach, describe, expect, it, vi } from "vitest";
import axios from "axios";
import MockAdapter from "axios-mock-adapter";
import { registrarMateriais } from "@/shared/api/mock/handlers/materiais";
import { obterELimparRotaRetorno } from "@/shared/lib/rotasSessao";

const repositorio = vi.hoisted(() => ({
  atualizar: vi.fn((id: number, payload: unknown) => ({ id, ...Object(payload) })),
  adicionar: vi.fn((obraId: number, payload: unknown) => ({ id: 1, obraId, ...Object(payload) })),
}));
vi.mock("@/shared/api/mock/core/auth", () => ({
  resolverUsuarioAutenticadoMock: (perfil: unknown) => perfil ? { perfil: { nomePerfil: perfil } } : undefined,
}));
vi.mock("@/shared/api/mock/dados/materiais", () => ({
  obterMateriaisArmazenados: vi.fn(() => []), removerMaterialArmazenado: vi.fn(),
  atualizarMaterialArmazenado: repositorio.atualizar, adicionarMaterialArmazenado: repositorio.adicionar,
}));

async function patch(perfil: string, payload: unknown) {
  const cliente = axios.create({ validateStatus: () => true });
  const mock = new MockAdapter(cliente);
  registrarMateriais(mock);
  try { return await cliente.patch("/materiais/1", payload, { headers: { Authorization: perfil } }); }
  finally { mock.restore(); }
}

describe("Permissões e validação do handler real de materiais", () => {
  beforeEach(() => vi.clearAllMocks());
  it.each(["EmSolicitacao", "Comprado", "EmTransito", "Disponivel", "Utilizado"])("Financeiro altera status válido %s", async statusLogistico => {
    expect((await patch("Financeiro", { statusLogistico })).status).toBe(200);
    expect(repositorio.atualizar).toHaveBeenCalledWith(1, { statusLogistico });
  });
  it.each([
    { statusLogistico: null }, { statusLogistico: "Inexistente" },
    { tipo: "Troca" }, { quantidade: 99 }, { custoUnitario: 100 },
    { statusLogistico: "Comprado", tipo: "Troca" },
    { statusLogistico: "Comprado", quantidade: 99 },
    { statusLogistico: "Comprado", custoUnitario: 100 },
  ])("Financeiro não persiste payload indevido %j", async payload => {
    expect([400, 403]).toContain((await patch("Financeiro", payload)).status);
    expect(repositorio.atualizar).not.toHaveBeenCalled();
  });
  it.each(["Engenharia", "InstaladorCampo"])("%s não altera status", async perfil => {
    expect((await patch(perfil, { statusLogistico: "Comprado" })).status).toBe(403);
    expect(repositorio.atualizar).not.toHaveBeenCalled();
  });
  it("preserva o PATCH cadastral legado do Administrador", async () => {
    const payload = { tipo: "Legado", quantidade: 2, statusLogistico: "Comprado" };
    expect((await patch("Administrador", payload)).status).toBe(200);
    expect(repositorio.atualizar).toHaveBeenCalledWith(1, payload);
  });
  it.each(["Administrador", "Engenharia"])("%s cria em EmSolicitacao sem status no payload", async perfil => {
    const cliente = axios.create({ validateStatus: () => true });
    const mock = new MockAdapter(cliente);
    registrarMateriais(mock);
    try {
      const r = await cliente.post("/obras/1/materiais", { tipo: "Legado", quantidade: 2 }, { headers: { Authorization: perfil } });
      expect(r.status).toBe(201);
      expect(r.data.statusLogistico).toBe("EmSolicitacao");
    } finally { mock.restore(); }
  });
  it.each(["Administrador", "Engenharia", "Financeiro"] as const)("retorno pós-login para %s preserva a rota", perfil => {
    expect(obterELimparRotaRetorno(perfil, "/obras/301/materiais?origem=kanban")).toBe("/obras/301/materiais?origem=kanban");
  });
  it("retorno do Instalador não libera Materiais", () => {
    expect(obterELimparRotaRetorno("InstaladorCampo", "/obras/301/materiais")).toBe("/linkparainstaladores");
  });
});
import {
  STATUS_LOGISTICO_OPCOES,
  STATUS_LOGISTICO_OPERACIONAIS,
  obterMetaStatusLogistico,
  podeAlterarStatusEmEdicaoCadastral,
  podeAlterarStatusMaterialObra,
  podeGerenciarCadastroMaterial,
} from "@/shared/constants/statusLogistico";
import {
  MENSAGENS_VALIDACAO_MATERIAL,
  validarFormularioMaterial,
} from "@/features/materiais/lib/validacaoMaterial";

describe("Registro compartilhado statusLogistico e RBAC", () => {
  it("mantém ordem canônica de 5 etapas, 4 operacionais e fallback Comprado sem siglas", () => {
    expect(STATUS_LOGISTICO_OPCOES.map((o) => o.valor)).toEqual([
      "EmSolicitacao",
      "Comprado",
      "EmTransito",
      "Disponivel",
      "Utilizado",
    ]);
    expect(STATUS_LOGISTICO_OPERACIONAIS.map((o) => o.valor)).toEqual([
      "Comprado",
      "EmTransito",
      "Disponivel",
      "Utilizado",
    ]);
    expect(obterMetaStatusLogistico("EmSolicitacao").rotulo).toBe("Em Solicitação");
    expect(obterMetaStatusLogistico("EmTransito").rotulo).toBe("Em trânsito");
    expect(obterMetaStatusLogistico("EmTransito").rotuloTitulo).toBe("Em Trânsito");
    expect(obterMetaStatusLogistico("Disponivel").rotuloTabela).toBe("Disponível no Depósito");
    expect(obterMetaStatusLogistico(undefined).valor).toBe("Comprado");
    expect(obterMetaStatusLogistico(null).valor).toBe("Comprado");
    for (const o of STATUS_LOGISTICO_OPCOES) {
      expect(`${o.rotulo} ${o.rotuloTitulo} ${o.rotuloTabela}`).not.toMatch(/\b(?:RF|RN|UC|RNF)-\d+\b/);
    }
  });

  it("aplica exatamente os perfis de gestão cadastral, status em obra e edição em modal/drawer", () => {
    expect(podeGerenciarCadastroMaterial("Administrador")).toBe(true);
    expect(podeGerenciarCadastroMaterial("Engenharia")).toBe(true);
    expect(podeGerenciarCadastroMaterial("Financeiro")).toBe(false);
    expect(podeGerenciarCadastroMaterial("InstaladorCampo")).toBe(false);
    expect(podeGerenciarCadastroMaterial(undefined)).toBe(false);

    expect(podeAlterarStatusMaterialObra("Administrador")).toBe(true);
    expect(podeAlterarStatusMaterialObra("Financeiro")).toBe(true);
    expect(podeAlterarStatusMaterialObra("Engenharia")).toBe(false);
    expect(podeAlterarStatusMaterialObra(null)).toBe(false);

    expect(podeAlterarStatusEmEdicaoCadastral("Administrador")).toBe(true);
    expect(podeAlterarStatusEmEdicaoCadastral("Financeiro")).toBe(false);
    expect(podeAlterarStatusEmEdicaoCadastral("Engenharia")).toBe(false);
  });
});

describe("validarFormularioMaterial", () => {
  it("aceita nome trimado de 1..200 caracteres e quantidade inteira positiva", () => {
    expect(validarFormularioMaterial({ tipo: "  Inversor 5kW  ", quantidade: " 4 " })).toEqual({
      ok: true,
      tipo: "Inversor 5kW",
      quantidade: 4,
    });
    expect(validarFormularioMaterial({ tipo: "x".repeat(200), quantidade: "1" })).toEqual({
      ok: true,
      tipo: "x".repeat(200),
      quantidade: 1,
    });
  });

  it("exige nome entre 1 e 200 caracteres preservando precedência e mensagens contratuais", () => {
    expect(validarFormularioMaterial({ tipo: "   ", quantidade: "0" })).toEqual({
      ok: false,
      falha: { campo: "tipo", mensagem: MENSAGENS_VALIDACAO_MATERIAL.tipoObrigatorio },
    });
    expect(validarFormularioMaterial({ tipo: "x".repeat(201), quantidade: "1" })).toEqual({
      ok: false,
      falha: { campo: "tipo", mensagem: MENSAGENS_VALIDACAO_MATERIAL.tipoMuitoLongo },
    });
  });

  it("rejeita quantidade vazia, <= 0, não numérica, decimal e badInput", () => {
    for (const q of ["", "   ", "0", "-1", "abc"]) {
      expect(validarFormularioMaterial({ tipo: "Cabo", quantidade: q })).toEqual({
        ok: false,
        falha: { campo: "quantidade", mensagem: MENSAGENS_VALIDACAO_MATERIAL.quantidadePositiva },
      });
    }
    for (const q of ["1.5", "0.001", "2.75"]) {
      expect(validarFormularioMaterial({ tipo: "Cabo", quantidade: q })).toEqual({
        ok: false,
        falha: { campo: "quantidade", mensagem: MENSAGENS_VALIDACAO_MATERIAL.quantidadeInteira },
      });
    }
    expect(
      validarFormularioMaterial({
        tipo: "Cabo",
        quantidade: "",
        validadeQuantidade: { valid: false, badInput: true, validationMessage: "" },
      })
    ).toEqual({
      ok: false,
      falha: { campo: "quantidade", mensagem: MENSAGENS_VALIDACAO_MATERIAL.quantidadeInvalidaNativa },
    });
  });
});
