import { beforeEach, expect, it, vi } from "vitest";
import { api } from "@/shared/api/api";
import { alterarSenha, redefinirSenha } from "./senhas";
import { senhaValida } from "../lib/politicaSenha";

vi.mock("@/shared/api/api", async importar => {
  const original = await importar<typeof import("@/shared/api/api")>();
  return { ...original, api: { ...original.api, request: vi.fn() } };
});
beforeEach(() => vi.clearAllMocks());
const contexto = () => ({ signal: new AbortController().signal });
const dados = { senhaAtual: "AtualSenha123!", novaSenha: "NovaSenha123!", confirmacaoSenha: "NovaSenha123!" };

it("envia a confirmação digitada nas duas operações e limpa a configuração após a resposta", async () => {
  const corpos: unknown[] = [];
  vi.mocked(api.request).mockImplementation(async config => {
    corpos.push(structuredClone(config.data));
    return { data: { mensagem: "Senha atualizada", sucesso: true }, config, status: 200, headers: {}, statusText: "OK" };
  });
  await alterarSenha({ ...dados }, contexto());
  await redefinirSenha({ token: "token-do-link", novaSenha: dados.novaSenha, confirmacaoSenha: dados.confirmacaoSenha }, contexto());
  expect(corpos).toEqual([dados, { token: "token-do-link", novaSenha: dados.novaSenha, confirmacaoSenha: dados.confirmacaoSenha }]);
  expect(vi.mocked(api.request).mock.calls.every(([config]) => config.data === undefined)).toBe(true);
});

it.each([
  ["SENHA_ATUAL_INCORRETA", "A senha atual não confere.", "Senha atual incorreta"],
  ["VALIDATION_ERROR", "A confirmação não é igual à nova senha.", "A confirmação não é igual à nova senha"],
  ["VALIDATION_ERROR", "A nova senha precisa ter pelo menos 8 caracteres.", "A senha não atende aos requisitos mínimos de segurança"],
])("preserva o significado da recusa %s: %s", async (code, message, esperado) => {
  vi.mocked(api.request).mockRejectedValue({ isAxiosError: true, response: { status: 400, data: { error: { code, message } } } });
  await expect(alterarSenha({ ...dados }, contexto())).rejects.toThrow(esperado);
});

it("limita por bytes para impedir truncamento da senha no bcrypt", () => {
  expect(senhaValida("Aa1" + "á".repeat(34))).toBe(true);
  expect(senhaValida("Aa1" + "á".repeat(35))).toBe(false);
});
