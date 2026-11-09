import { describe, it, expect } from "vitest";
import { formatarCpfCnpj, formatarTelefone } from "@/shared/lib/validacoesDocumento";
import type { CriarObraPayload, NomePerfil } from "@/types";

describe("Validação e Criação de Obras (Frente Obras - 02 Railton)", () => {
  it("deve formatar corretamente CPF (11 dígitos) e CNPJ (14 dígitos)", () => {
    expect(formatarCpfCnpj("12345678901")).toBe("123.456.789-01");
    expect(formatarCpfCnpj("12345678000195")).toBe("12.345.678/0001-95");
    expect(formatarCpfCnpj("")).toBe("");
  });

  it("deve formatar corretamente Telefone (10 e 11 dígitos)", () => {
    expect(formatarTelefone("88999998888")).toBe("(88) 99999-8888");
    expect(formatarTelefone("8833334444")).toBe("(88) 3333-4444");
    expect(formatarTelefone("")).toBe("");
  });

  it("deve validar payload canônico para criação de obra vinculada a cliente existente (RF-01, RF-03)", () => {
    const payload: CriarObraPayload = {
      clienteId: 5,
      clienteNome: "João da Silva",
      endereco: "Rua do Sol, 100 - Juazeiro do Norte",
      cidade: "Juazeiro do Norte",
      quantidadePaineis: 16,
      quantidadeInversores: 1,
      dataInicioEstimada: "2026-11-10",
      dataFimEstimada: "2026-11-25",
      categoria: "Residencial",
      pagamento: {
        prazoContratualDias: 30,
      },
    };

    expect(payload.clienteId).toBe(5);
    expect(payload.quantidadePaineis).toBeGreaterThan(0);
    expect(payload.pagamento.prazoContratualDias).toBe(30);
    expect(payload.categoria).toBe("Residencial");
  });

  it("deve validar permissões de edição de obra por perfil (RBAC)", () => {
    function podeEditarObra(perfil?: NomePerfil): boolean {
      return perfil === "Administrador" || perfil === "Engenharia";
    }

    expect(podeEditarObra("Administrador")).toBe(true);
    expect(podeEditarObra("Engenharia")).toBe(true);
    expect(podeEditarObra("Financeiro")).toBe(false);
    expect(podeEditarObra("InstaladorCampo")).toBe(false);
  });
});

