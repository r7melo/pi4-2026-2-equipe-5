import { describe, expect, it } from "vitest";
import { cadastroUsuarioSchema } from "./usuarios";
import { usuarioItemSchema, usuariosRespostaSchema } from "./gestaoUsuarios";

const cadastro = { nome: "Pessoa de Teste", email: "pessoa@example.com", senha: "Senha123!", equipeId: "" };
const item = { id: 5, nome: "Pessoa de Teste", email: "pessoa@example.com", equipeId: null, equipeNome: null, ativo: true, revisao: "r1" };

describe("perfis nos contratos reais de usuários", () => {
  it.each(["Administrador", "Engenharia", "Financeiro", "InstaladorCampo"])("aceita %s em cadastro, item e página", perfil => {
    expect(cadastroUsuarioSchema.parse({ ...cadastro, perfil }).perfil).toBe(perfil);
    expect(usuarioItemSchema.parse({ ...item, perfil }).perfil).toBe(perfil);
    expect(usuariosRespostaSchema.parse({ page: 1, pageSize: 20, total: 1, itens: [{ ...item, perfil }] }).itens[0].perfil).toBe(perfil);
  });
  it.each(["Outro", "EngenhariaObras", "", null])("rejeita %j sem normalização implícita nos DTOs de gestão", perfil => {
    expect(cadastroUsuarioSchema.safeParse({ ...cadastro, perfil }).success).toBe(false);
    expect(usuarioItemSchema.safeParse({ ...item, perfil }).success).toBe(false);
    expect(usuariosRespostaSchema.safeParse({ page: 1, pageSize: 20, total: 1, itens: [{ ...item, perfil }] }).success).toBe(false);
  });
});
