import { describe, expect, it } from "vitest";
import { mapearRespostaParaUsuario } from "./auth";
import type { NomePerfil } from "@/shared/types/autorizacao";
import type { LoginResposta } from "../types/auth";

function resposta(perfil: NomePerfil): LoginResposta["usuario"] {
  return { id: 12, nome: "Pessoa de Teste", email: "pessoa@example.com", equipeId: 3, perfil };
}

describe("adaptação de perfis do login", () => {
  it.each<{ perfil: NomePerfil; id: number; permissoes: string[] }>([
    { perfil: "Administrador", id: 1, permissoes: ["*"] },
    { perfil: "Engenharia", id: 2, permissoes: ["obras:criar", "obras:mover", "programacoes:editar"] },
    { perfil: "Financeiro", id: 3, permissoes: ["financeiro:visualizar", "relatorios:visualizar"] },
    { perfil: "InstaladorCampo", id: 4, permissoes: ["obras:visualizar", "materiais:confirmar"] },
  ])("preserva identidade e permissões de $perfil", ({ perfil, id, permissoes }) => {
    expect(mapearRespostaParaUsuario(resposta(perfil))).toEqual({
      id: 12, nome: "Pessoa de Teste", email: "pessoa@example.com", equipeId: 3,
      perfil: { nomePerfil: perfil, id, permissoes },
    });
  });
  it("mantém compatibilidade com EngenhariaObras recebido do backend", () => {
    const dados = resposta("Engenharia");
    Reflect.set(dados, "perfil", "EngenhariaObras");
    expect(mapearRespostaParaUsuario(dados).perfil).toEqual({
      nomePerfil: "Engenharia", id: 2, permissoes: ["obras:criar", "obras:mover", "programacoes:editar"],
    });
  });
  it("mantém o fallback existente sem conceder permissões a valor desconhecido", () => {
    const dados = resposta("Financeiro");
    Reflect.set(dados, "perfil", "PerfilDesconhecido");
    expect(mapearRespostaParaUsuario(dados).perfil).toEqual({ nomePerfil: "PerfilDesconhecido", id: 1, permissoes: [] });
  });
});
