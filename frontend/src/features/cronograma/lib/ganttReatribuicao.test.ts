import { afterEach, describe, expect, it, vi } from "vitest";
import axios, { AxiosError, type AxiosAdapter, type InternalAxiosRequestConfig } from "axios";
import { QueryClient } from "@tanstack/react-query";
import {
  CLASSE_BOTAO_ALOCACAO,
  CLASSE_BOTAO_EQUIPE,
  ehLinhaProjeto,
  obterSeletorBotaoAlocacao,
  obterSeletorBotaoEquipe,
} from "@/features/cronograma/types/gantt";
import {
  ArmazenadorEstadoVisualGantt,
  criarEstadoVisualInicial,
} from "@/features/cronograma/lib/estadoVisualGantt";
import {
  criarProgramacao,
  deletarProgramacao,
} from "@/features/cronograma/services/programacoes";
import {
  executarReatribuicaoProgramacao,
  ehErroFalhaRestauracao,
} from "@/features/cronograma/hooks/useReatribuirProgramacao";
import {
  agendarInvalidacaoProgramacoes,
  type ReferenciaTemporizador,
} from "@/shared/contexts/signalrInvalidacao";
import { api } from "@/shared/api/api";
import {
  capturarSessaoOperacional,
  deveExibirErroLocal,
  erroDaSessaoAnterior,
  registrarErro403,
  sessaoOperacionalVigente,
  sincronizarSessaoOperacional,
  statusHttp,
} from "@/shared/lib/sessaoOperacao";
import type { CriarProgramacaoPayload, Programacao } from "@/shared/types/programacoes";

function iniciarSessaoTeste(tokenSuffix: string): number {
  sincronizarSessaoOperacional({
    token: `token-teste-${tokenSuffix}`,
    usuario: {
      id: 1,
      perfil: { nomePerfil: "Administrador" },
    },
    expiresAt: "2099-01-01T00:00:00Z",
  });
  return capturarSessaoOperacional();
}

function criarErroHttp(status: number, mensagem = "Erro HTTP"): AxiosError {
  const config = { headers: new axios.AxiosHeaders() } as InternalAxiosRequestConfig;
  const erro = new AxiosError(mensagem, `ERR_${status}`, config, undefined, {
    status,
    statusText: String(status),
    headers: {},
    config,
    data: { error: { message: mensagem } },
  });
  return erro;
}

function criarProgramacaoFixture(id: number, equipeId: number, prioridade = 2): Programacao {
  return {
    id,
    obraId: 302,
    equipeId,
    equipe: { pessoasPrevistas: 1, pessoasAlocadas: 0, pessoasFaltantes: 1, pessoaDia: 0, integrantes: [] },
    dataInicio: "2026-10-06",
    dataFim: "2026-10-09",
    prioridade,
    duracaoEstimadaDias: 4,
  };
}

describe("Gantt — Null-safety, imutabilidade, transação e SignalR", () => {
  const adapterOriginal = api.defaults.adapter;

  afterEach(() => {
    api.defaults.adapter = adapterOriginal;
    vi.useRealTimers();
  });

  it("ehLinhaProjeto e seletores lidam com entradas nulas, equipes e alocações", () => {
    expect(ehLinhaProjeto(null)).toBe(false);
    expect(ehLinhaProjeto(undefined)).toBe(false);
    expect(ehLinhaProjeto({ id: "equipe-3", type: "task" })).toBe(true);
    expect(ehLinhaProjeto({ id: 602, type: "project" })).toBe(true);
    expect(ehLinhaProjeto({ id: 602, type: "task" })).toBe(false);

    expect(obterSeletorBotaoAlocacao(602)).toBe(
      `button.${CLASSE_BOTAO_ALOCACAO}[data-task-id="602"]`
    );
    expect(obterSeletorBotaoAlocacao()).toBe(`button.${CLASSE_BOTAO_ALOCACAO}[data-task-id]`);
    expect(obterSeletorBotaoEquipe("equipe-2")).toBe(
      `button.${CLASSE_BOTAO_EQUIPE}[data-task-id="equipe-2"]`
    );
  });

  it("ArmazenadorEstadoVisualGantt aplica clone simétrico ao salvar e ler", () => {
    const armazenador = new ArmazenadorEstadoVisualGantt(7);
    const entrada = {
      ...criarEstadoVisualInicial(),
      arvore: { "equipe-1": true },
      scrollOperacao: { x: 120, y: 40 },
      scrollDisplay: { x: 12, y: 8 },
    };

    armazenador.salvarEstadoVisual(entrada);
    entrada.arvore["equipe-1"] = false;
    entrada.scrollOperacao.x = 999;

    const lido = armazenador.obterEstadoVisual();
    expect(lido.arvore["equipe-1"]).toBe(true);
    expect(lido.scrollOperacao.x).toBe(120);

    lido.arvore["equipe-2"] = true;
    lido.scrollDisplay.y = 777;

    const relido = armazenador.obterEstadoVisual();
    expect(relido.arvore["equipe-2"]).toBeUndefined();
    expect(relido.scrollDisplay.y).toBe(8);
    expect(armazenador.sessao).toBe(7);
  });

  it("criarProgramacao e deletarProgramacao enviam politica401: 'sessao' e sessao403", async () => {
    const sessao = iniciarSessaoTeste("politica401");
    const requisicoes: { url?: string; method?: string; politica401?: string; sessao403?: number }[] = [];
    const adapterEspiao: AxiosAdapter = async (config) => {
      requisicoes.push({
        url: config.url,
        method: config.method,
        politica401: config.politica401,
        sessao403: config.sessao403,
      });
      return {
        data: criarProgramacaoFixture(701, 2),
        status: 200,
        statusText: "OK",
        headers: {},
        config,
      };
    };
    api.defaults.adapter = adapterEspiao;

    const payload: CriarProgramacaoPayload = {
      obraId: 302,
      equipeId: 2,
      dataInicio: "2026-10-06",
      dataFim: "2026-10-09",
      prioridade: 2,
    };

    await criarProgramacao(payload, sessao);
    await deletarProgramacao(602, sessao);

    expect(requisicoes).toHaveLength(2);
    expect(requisicoes[0]).toMatchObject({
      method: "post",
      politica401: "sessao",
      sessao403: sessao,
    });
    expect(requisicoes[1]).toMatchObject({
      method: "delete",
      politica401: "sessao",
      sessao403: sessao,
    });
  });

  it("executarReatribuicaoProgramacao substitui id antigo sem fantasma e isola sessões no cache", async () => {
    const sessaoAnterior = iniciarSessaoTeste("antiga");
    const sessaoAtual = iniciarSessaoTeste("atual");
    const queryClient = new QueryClient();

    const p601 = criarProgramacaoFixture(601, 1, 1);
    const p602 = criarProgramacaoFixture(602, 1, 2);
    const nova = criarProgramacaoFixture(611, 2, 2);

    queryClient.setQueryData(["programacoes", sessaoAnterior], [p601, p602]);
    queryClient.setQueryData(["programacoes", sessaoAtual], [p601, p602]);

    const invalSpy = vi.spyOn(queryClient, "invalidateQueries");
    const substituicoes: Array<[number, number]> = [];

    const resultado = await executarReatribuicaoProgramacao({
      queryClient,
      sessao: sessaoAtual,
      variaveis: {
        id: 602,
        payloadNova: {
          obraId: 302,
          equipeId: 2,
          dataInicio: "2026-10-06",
          dataFim: "2026-10-09",
          prioridade: 2,
        },
        payloadOriginal: {
          obraId: 302,
          equipeId: 1,
          dataInicio: "2026-10-06",
          dataFim: "2026-10-09",
          prioridade: 2,
        },
        aoSubstituirId: (idAntigo, idNovo) => substituicoes.push([idAntigo, idNovo]),
      },
      servicos: {
        deletarProgramacao: vi.fn().mockResolvedValue(undefined),
        criarProgramacao: vi.fn().mockResolvedValue(nova),
      },
    });

    expect(resultado).toEqual({ resultado: "reatribuida", programacao: nova });
    expect(substituicoes).toEqual([[602, 611]]);

    const cacheAtual = queryClient.getQueryData<Programacao[]>(["programacoes", sessaoAtual]);
    expect(cacheAtual?.map((p) => p.id)).toEqual([601, 611]);

    const cacheAnterior = queryClient.getQueryData<Programacao[]>(["programacoes", sessaoAnterior]);
    expect(cacheAnterior?.map((p) => p.id)).toEqual([601, 602]);

    expect(invalSpy).toHaveBeenCalledTimes(1);
    expect(invalSpy).toHaveBeenCalledWith({ queryKey: ["programacoes", sessaoAtual] });
  });

  it("executarReatribuicaoProgramacao executa rollback em erro 500 preservando prioridade e mesma sessão", async () => {
    const sessaoAtual = iniciarSessaoTeste("rollback-500");
    const queryClient = new QueryClient();
    const p602 = criarProgramacaoFixture(602, 1, 5);
    const restaurada = criarProgramacaoFixture(612, 1, 5);
    queryClient.setQueryData(["programacoes", sessaoAtual], [p602]);

    const criarMock = vi
      .fn()
      .mockRejectedValueOnce(criarErroHttp(500))
      .mockResolvedValueOnce(restaurada);
    const substituicoes: Array<[number, number]> = [];

    const payloadNova: CriarProgramacaoPayload = {
      obraId: 302,
      equipeId: 3,
      dataInicio: "2026-10-06",
      dataFim: "2026-10-09",
      prioridade: 5,
    };
    const payloadOriginal: CriarProgramacaoPayload = {
      obraId: 302,
      equipeId: 1,
      dataInicio: "2026-10-06",
      dataFim: "2026-10-09",
      prioridade: 5,
    };

    const res = await executarReatribuicaoProgramacao({
      queryClient,
      sessao: sessaoAtual,
      variaveis: {
        id: 602,
        payloadNova,
        payloadOriginal,
        aoSubstituirId: (a, b) => substituicoes.push([a, b]),
      },
      servicos: {
        deletarProgramacao: vi.fn().mockResolvedValue(undefined),
        criarProgramacao: criarMock,
      },
    });

    expect(res).toEqual({ resultado: "restaurada", programacao: restaurada });
    expect(criarMock).toHaveBeenNthCalledWith(1, payloadNova, sessaoAtual);
    expect(criarMock).toHaveBeenNthCalledWith(2, payloadOriginal, sessaoAtual);
    expect(substituicoes).toEqual([[602, 612]]);
    expect(queryClient.getQueryData<Programacao[]>(["programacoes", sessaoAtual])?.map((p) => p.id)).toEqual([612]);
  });

  it("aborta rollback em 401/403 ou mudança de sessão e preserva herdarContexto403 em dupla falha", async () => {
    const sessao1 = iniciarSessaoTeste("abort-1");
    const queryClient = new QueryClient();
    queryClient.setQueryData(["programacoes", sessao1], [criarProgramacaoFixture(602, 1)]);

    // Caso 401: não tenta rollback e não invalida cache
    const invalSpy = vi.spyOn(queryClient, "invalidateQueries");
    const criar401 = vi.fn().mockRejectedValueOnce(criarErroHttp(401));
    await expect(
      executarReatribuicaoProgramacao({
        queryClient,
        sessao: sessao1,
        variaveis: {
          id: 602,
          payloadNova: { obraId: 302, equipeId: 2, dataInicio: "2026-10-06" },
          payloadOriginal: { obraId: 302, equipeId: 1, dataInicio: "2026-10-06" },
        },
        servicos: {
          deletarProgramacao: vi.fn().mockResolvedValue(undefined),
          criarProgramacao: criar401,
        },
      })
    ).rejects.toThrow();
    expect(criar401).toHaveBeenCalledTimes(1);
    expect(invalSpy).not.toHaveBeenCalled();

    // Caso mudança de sessão após DELETE: exigirSessaoOperacional barra POST
    const criarPostExpirado = vi.fn();
    await expect(
      executarReatribuicaoProgramacao({
        queryClient,
        sessao: sessao1,
        variaveis: {
          id: 602,
          payloadNova: { obraId: 302, equipeId: 2, dataInicio: "2026-10-06" },
          payloadOriginal: { obraId: 302, equipeId: 1, dataInicio: "2026-10-06" },
        },
        servicos: {
          deletarProgramacao: vi.fn().mockImplementation(async () => {
            iniciarSessaoTeste("nova-no-meio");
          }),
          criarProgramacao: criarPostExpirado,
        },
      })
    ).rejects.toThrow("Operação de uma sessão encerrada.");
    expect(criarPostExpirado).not.toHaveBeenCalled();

    // Caso dupla falha com rollback 403 e avisoGlobal na mesma sessão
    const sessao2 = iniciarSessaoTeste("dupla-403");
    expect(sessaoOperacionalVigente(sessao2)).toBe(true);
    const erroRollback403 = criarErroHttp(403, "Forbidden");
    registrarErro403(erroRollback403, { sessao: sessao2, avisoGlobal: true });

    let erroCapturado: unknown;
    try {
      await executarReatribuicaoProgramacao({
        queryClient,
        sessao: sessao2,
        variaveis: {
          id: 602,
          payloadNova: { obraId: 302, equipeId: 2, dataInicio: "2026-10-06" },
          payloadOriginal: { obraId: 302, equipeId: 1, dataInicio: "2026-10-06" },
        },
        servicos: {
          deletarProgramacao: vi.fn().mockResolvedValue(undefined),
          criarProgramacao: vi
            .fn()
            .mockRejectedValueOnce(criarErroHttp(500))
            .mockRejectedValueOnce(erroRollback403),
        },
      });
    } catch (erro) {
      erroCapturado = erro;
    }

    expect(ehErroFalhaRestauracao(erroCapturado)).toBe(true);
    expect(statusHttp(erroCapturado)).toBe(403);
    expect(erroDaSessaoAnterior(erroCapturado)).toBe(false);
    expect(deveExibirErroLocal(erroCapturado)).toBe(false);
  });

  it("agendarInvalidacaoProgramacoes adia invalidação durante isMutating > 0 e executa após conclusão", async () => {
    vi.useFakeTimers();
    const queryClient = new QueryClient();
    const timerRef: ReferenciaTemporizador = { current: null };
    const invalSpy = vi.spyOn(queryClient, "invalidateQueries").mockResolvedValue(undefined);

    let resolverMutacao!: () => void;
    const promessaMutacao = new Promise<void>((resolve) => {
      resolverMutacao = resolve;
    });
    const mutacao = queryClient.getMutationCache().build(queryClient, {
      mutationKey: ["programacoes"],
      mutationFn: () => promessaMutacao,
    });
    const execucaoMutacao = mutacao.execute(undefined);

    expect(queryClient.isMutating({ mutationKey: ["programacoes"] })).toBe(1);
    agendarInvalidacaoProgramacoes(queryClient, timerRef, 100);

    vi.advanceTimersByTime(100);
    expect(invalSpy).not.toHaveBeenCalled();

    vi.advanceTimersByTime(100);
    expect(invalSpy).not.toHaveBeenCalled();

    resolverMutacao();
    await execucaoMutacao;
    expect(queryClient.isMutating({ mutationKey: ["programacoes"] })).toBe(0);

    vi.advanceTimersByTime(100);
    expect(invalSpy).toHaveBeenCalledTimes(5);
    expect(invalSpy).toHaveBeenNthCalledWith(1, { queryKey: ["programacoes"] });
    expect(invalSpy).toHaveBeenNthCalledWith(2, { queryKey: ["equipes"] });
    expect(invalSpy).toHaveBeenCalledWith({ queryKey: ["ocupacao"] });
    expect(invalSpy).toHaveBeenCalledWith({ queryKey: ["disponibilidade"] });
    expect(invalSpy).toHaveBeenCalledWith({ queryKey: ["obras"] });
    expect(timerRef.current).toBeNull();
  });
});
