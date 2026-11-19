import { describe, expect, it } from "vitest";
import { NOMES_PERFIS, ROTULOS_PERFIS } from "./perfis";
import { perfilCanonico } from "@/shared/lib/rotasSessao";

describe("vocabulário público de perfis", () => {
  it("mantém os valores, a ordem e os rótulos usados pela administração", () => {
    expect(NOMES_PERFIS).toEqual(["Administrador", "Engenharia", "Financeiro", "InstaladorCampo"]);
    expect(NOMES_PERFIS.map(perfil => ROTULOS_PERFIS[perfil])).toEqual([
      "Administrador", "Engenharia", "Financeiro", "Instalador de Campo",
    ]);
  });
  it.each(["Administrador", "Engenharia", "Financeiro", "InstaladorCampo"])("reconhece %s como perfil canônico", perfil => {
    expect(perfilCanonico(perfil)).toBe(true);
  });
  it.each(["EngenhariaObras", "Outro", "", null, undefined, 1, {}])("rejeita valor não canônico %j", perfil => {
    expect(perfilCanonico(perfil)).toBe(false);
  });
});
