import { beforeEach, describe, expect, it, vi } from "vitest";
import axios from "axios";
import MockAdapter from "axios-mock-adapter";
import { registrarFinanceiro } from "@/shared/api/mock/handlers/financeiro";
import { obterELimparRotaRetorno } from "@/shared/lib/rotasSessao";

const dados = vi.hoisted(() => ({
  atualizar: vi.fn(() => ({ valorObra: 100 })),
  apurar: vi.fn(() => ({ status: 200, corpo: { receita: 100 } })),
  custos: vi.fn(() => ({ obraId: 1, valorObra: 100, custoMaoObra: 20, custoInsumos: 30 })),
  obras: vi.fn(() => []),
  cenario: vi.fn(() => ({})),
  pdf: vi.fn(async () => new Blob(["%PDF"], { type: "application/pdf" })),
}));
vi.mock("@/shared/api/mock/core/auth", () => ({
  resolverUsuarioAutenticadoMock: (perfil: unknown) => perfil ? { perfil: { nomePerfil: perfil } } : undefined,
}));
vi.mock("@/shared/api/mock/dados/relatorios", () => ({
  obterRelatorioArmazenado: vi.fn(), buscarCustosArmazenados: dados.custos,
  atualizarCustosArmazenados: dados.atualizar, apurarDreArmazenado: dados.apurar,
}));
vi.mock("@/shared/api/mock/dados/obras", () => ({ obterObrasArmazenadas: dados.obras }));
vi.mock("@/shared/api/mock/core/estadoCenario", () => ({ lerDadosCenario: dados.cenario }));
vi.mock("@/shared/api/mock/pdfGenerator", () => ({ gerarExcelRelatorio: vi.fn(), gerarPdfRelatorio: dados.pdf }));

describe("Regras reais do cliente financeiro e do handler mock", () => {
  beforeEach(() => vi.clearAllMocks());
  it.each([
    ["Administrador", 200, 403], ["Financeiro", 200, 200],
    ["Engenharia", 403, 403], ["InstaladorCampo", 403, 403],
  ] as const)("%s: consulta DRE/custos/exportação e registro de custos têm permissões distintas", async (perfil, consulta, registro) => {
    const cliente = axios.create({ validateStatus: () => true });
    const mock = new MockAdapter(cliente);
    registrarFinanceiro(mock);
    try {
      const config = { headers: { Authorization: perfil } };
      expect((await cliente.get("/obras/1/dre", config)).status).toBe(consulta);
      expect(dados.apurar).toHaveBeenCalledTimes(consulta === 200 ? 1 : 0);
      expect((await cliente.get("/obras/1/custos", config)).status).toBe(consulta);
      expect(dados.custos).toHaveBeenCalledTimes(consulta === 200 ? 1 : 0);
      expect((await cliente.get("/relatorios/export?formato=pdf&tipo=financeiro", config)).status).toBe(consulta);
      expect(dados.pdf).toHaveBeenCalledTimes(consulta === 200 ? 1 : 0);
      expect((await cliente.post("/obras/1/custos", { valorObra: 100 }, config)).status).toBe(registro);
      expect(dados.atualizar).toHaveBeenCalledTimes(registro === 200 ? 1 : 0);
      const destino = obterELimparRotaRetorno(perfil, "/financeiro");
      expect(destino === "/financeiro").toBe(consulta === 200);
    } finally { mock.restore(); }
  });
});
