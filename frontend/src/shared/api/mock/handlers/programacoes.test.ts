import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import MockAdapter from "axios-mock-adapter";
import { api } from "@/shared/api/api";
import { coordenarTransporteMock } from "@/shared/api/mock/core/coordenacao";
import {
  executarTransacaoCenario,
  geracaoCenario,
  iniciarCenario,
  salvarDadosCenario,
} from "@/shared/api/mock/core/estadoCenario";
import { MOCK_USUARIOS } from "@/shared/api/mock/dados/usuarios";
import { registrarConsultasCronograma } from "@/shared/api/mock/handlers/programacoes";
import { useAuthStore } from "@/shared/stores/useAuthStore";
import type { Usuario } from "@/shared/types/autorizacao";
import type { Programacao } from "@/shared/types/programacoes";

function criarStorageMemoria(): Storage {
  const mapa = new Map<string, string>();
  return {
    get length() {
      return mapa.size;
    },
    clear() {
      mapa.clear();
    },
    getItem(chave: string) {
      return mapa.get(chave) ?? null;
    },
    key(indice: number) {
      return Array.from(mapa.keys())[indice] ?? null;
    },
    removeItem(chave: string) {
      mapa.delete(chave);
    },
    setItem(chave: string, valor: string) {
      mapa.set(chave, String(valor));
    },
  };
}

const usuarioAdminTeste: Usuario = MOCK_USUARIOS["admin@admin.com"];

describe("GET /programacoes no mock espelha ordenação e filtro do backend", () => {
  let adapterOriginal: typeof api.defaults.adapter;
  let mock: MockAdapter | undefined;

  beforeEach(async () => {
    const localStorageMem = criarStorageMemoria();
    const sessionStorageMem = criarStorageMemoria();
    vi.stubGlobal("localStorage", localStorageMem);
    vi.stubGlobal("sessionStorage", sessionStorageMem);
    vi.stubGlobal("navigator", {
      locks: {
        request: (_nome: string, _opcoes: unknown, tarefa: () => Promise<unknown> | unknown) =>
          Promise.resolve(tarefa()),
      },
    });
    vi.stubGlobal("window", {
      localStorage: localStorageMem,
      sessionStorage: sessionStorageMem,
      dispatchEvent: vi.fn(),
      location: { pathname: "/equipes", search: "" },
    });

    adapterOriginal = api.defaults.adapter;
    mock = new MockAdapter(api);
    registrarConsultasCronograma(mock);
    coordenarTransporteMock();
    await iniciarCenario();

    const token = `mock_jwt_token_${btoa(usuarioAdminTeste.email)}_${Date.now()}_v0_a0_g${geracaoCenario()}`;
    useAuthStore.getState().login(token, usuarioAdminTeste, "2099-01-01T00:00:00Z");
  });

  afterEach(() => {
    useAuthStore.getState().logout();
    mock?.restore();
    api.defaults.adapter = adapterOriginal;
    vi.unstubAllGlobals();
  });

  it("omite obras excluídas e ordena programações por dataInicio, prioridade e id com integrantes ordenados", async () => {
    const equipeVazia = {
      pessoasPrevistas: 1,
      pessoasAlocadas: 0,
      pessoasFaltantes: 1,
      pessoaDia: 0,
      integrantes: [],
    };
    const desordenadas: Programacao[] = [
      {
        id: 604,
        obraId: 301,
        dataInicio: "2026-12-08",
        dataFim: "2026-12-10",
        prioridade: 2,
        duracaoEstimadaDias: 3,
        equipe: {
          pessoasPrevistas: 3,
          pessoasAlocadas: 3,
          pessoasFaltantes: 0,
          pessoaDia: 7,
          integrantes: [
            { usuarioId: 12, nome: "Carlos", dataEntrada: "2026-12-09", dataSaida: "2026-12-10" },
            { usuarioId: 11, nome: "Bruno", dataEntrada: "2026-12-09", dataSaida: "2026-12-10" },
            { usuarioId: 10, nome: "Zeca", dataEntrada: "2026-12-08", dataSaida: "2026-12-10" },
          ],
        },
      },
      {
        id: 605,
        obraId: 99999, // obra inexistente / excluída
        dataInicio: "2026-12-01",
        dataFim: "2026-12-03",
        prioridade: 1,
        duracaoEstimadaDias: 3,
        equipe: equipeVazia,
      },
      {
        id: 602,
        obraId: 302,
        dataInicio: "2026-12-08",
        dataFim: "2026-12-09",
        prioridade: 1,
        duracaoEstimadaDias: 2,
        equipe: equipeVazia,
      },
      {
        id: 601,
        obraId: 303,
        dataInicio: "2026-12-08",
        dataFim: "2026-12-09",
        prioridade: 1,
        duracaoEstimadaDias: 2,
        equipe: equipeVazia,
      },
      {
        id: 603,
        obraId: 304,
        dataInicio: "2026-12-02",
        dataFim: "2026-12-04",
        prioridade: 3,
        duracaoEstimadaDias: 3,
        equipe: equipeVazia,
      },
    ];

    await executarTransacaoCenario(
      geracaoCenario(),
      async () => {
        salvarDadosCenario("mock_programacoes_v4", desordenadas);
      },
      () => true,
    );

    const resposta = await api.get<Programacao[]>("/programacoes");
    expect(resposta.data.map((p) => p.id)).toEqual([603, 601, 602, 604]);
    expect(resposta.data.find((p) => p.id === 604)?.equipe?.integrantes.map((i) => i.usuarioId)).toEqual([
      10,
      11,
      12,
    ]);
  });
});
