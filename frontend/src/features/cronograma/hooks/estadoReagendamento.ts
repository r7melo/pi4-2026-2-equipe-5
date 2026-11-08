import { useCallback, useSyncExternalStore } from "react";
import { QueryObserver, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { listarProgramacoes } from "@/features/cronograma/services/programacoes";
import type { Programacao } from "@/types";
import {
  assinarSessaoOperacional,
  capturarSessaoOperacional,
  exigirSessaoOperacional,
  sessaoOperacionalVigente,
} from "@/shared/lib/sessaoOperacao";
import {
  criarCoordenadorReagendamento,
  type CoordenadorReagendamento,
  type EstadoCoordenador,
  type FaseReagendamento,
  type IdentidadeOperacao,
} from "@/features/cronograma/lib/coordenadorReagendamento";

export interface RetornoEstadoReagendamento {
  readonly estado: EstadoCoordenador;
  readonly fase: FaseReagendamento;
  readonly aviso: string | null;
  readonly bloqueado: boolean;
  readonly recuperar: () => Promise<boolean>;
}

interface RegistroRecuperacaoEmVoo {
  readonly origem: IdentidadeOperacao;
  readonly promessa: Promise<boolean>;
}

interface MarcadorConclusaoReconciliacao {
  origemConcluida: IdentidadeOperacao | null;
  sinal: AbortSignal | null;
}

const coordenadores = new WeakMap<QueryClient, CoordenadorReagendamento>();
const recuperacoesEmVoo = new WeakMap<QueryClient, RegistroRecuperacaoEmVoo>();

export function obterCoordenadorReagendamento(cliente: QueryClient): CoordenadorReagendamento {
  let instancia = coordenadores.get(cliente);
  if (!instancia) {
    instancia = criarCoordenadorReagendamento(cliente, {
      capturarSessao: capturarSessaoOperacional,
      sessaoVigente: sessaoOperacionalVigente,
    });
    coordenadores.set(cliente, instancia);
  }
  return instancia;
}

export interface OpcoesConsultaProgramacoesConfig {
  readonly staleTime?: number;
  readonly cancelavel?: boolean;
}

export function opcoesConsultaProgramacoes(
  sessao: number,
  staleTimeOuConfig: number | OpcoesConsultaProgramacoesConfig = 30000
) {
  const config =
    typeof staleTimeOuConfig === "number"
      ? { staleTime: staleTimeOuConfig, cancelavel: staleTimeOuConfig === 0 }
      : { staleTime: 30000, cancelavel: false, ...staleTimeOuConfig };

  const staleTime = config.staleTime ?? 30000;
  const cancelavel = config.cancelavel ?? staleTime === 0;

  return {
    queryKey: ["programacoes", sessao] as const,
    queryFn: async (context?: { signal?: AbortSignal }): Promise<Programacao[]> => {
      exigirSessaoOperacional(sessao);
      const signal = cancelavel ? context?.signal : undefined;
      if (signal?.aborted) {
        throw new Error("Consulta de programações cancelada.");
      }
      const programacoes = await listarProgramacoes({ signal, sessao403: sessao });
      exigirSessaoOperacional(sessao);
      if (signal?.aborted) {
        throw new Error("Consulta de programações cancelada.");
      }
      return programacoes;
    },
    staleTime,
    ...(cancelavel ? { retry: false as const } : {}),
  };
}

export function opcoesConsultaReconciliacaoProgramacoes(sessao: number) {
  return opcoesConsultaProgramacoes(sessao, { staleTime: 0, cancelavel: true });
}

export async function sincronizarReagendamento(
  cliente: QueryClient,
  coordenador: CoordenadorReagendamento,
  origem: IdentidadeOperacao,
  mensagemSucesso?: string
): Promise<boolean> {
  if (!coordenador.vigente(origem)) {
    return false;
  }

  const existente = recuperacoesEmVoo.get(cliente);
  if (
    existente &&
    existente.origem.sessao === origem.sessao &&
    existente.origem.operacao === origem.operacao &&
    coordenador.vigente(origem)
  ) {
    return existente.promessa;
  }

  coordenador.mudarFase(origem, "sincronizando");

  const promessa: Promise<boolean> = Promise.resolve().then(async (): Promise<boolean> => {
    let desinscreverObserver: (() => void) | undefined;
    const marcadorConclusao: MarcadorConclusaoReconciliacao = {
      origemConcluida: null,
      sinal: null,
    };

    try {
      const chaveExata = ["programacoes", origem.sessao] as const;
      await cliente.cancelQueries({ queryKey: chaveExata, exact: true });
      if (!coordenador.vigente(origem)) {
        return false;
      }

      const observer = new QueryObserver(cliente, {
        queryKey: chaveExata,
        enabled: false,
      });
      desinscreverObserver = observer.subscribe(() => {});

      const opcoesReconciliacao = opcoesConsultaReconciliacaoProgramacoes(origem.sessao);
      const queryFnBase = opcoesReconciliacao.queryFn;

      const dados = await cliente.fetchQuery({
        ...opcoesReconciliacao,
        queryFn: async (context?: { signal?: AbortSignal }): Promise<Programacao[]> => {
          marcadorConclusao.sinal = context?.signal ?? null;
          const programacoes = await queryFnBase(context);
          if (coordenador.vigente(origem)) {
            marcadorConclusao.origemConcluida = origem;
          }
          return programacoes;
        },
      });

      if (!coordenador.vigente(origem)) {
        return false;
      }

      const origemConcluida = marcadorConclusao.origemConcluida;
      const concluiuAutoritativa =
        origemConcluida !== null &&
        marcadorConclusao.sinal !== null &&
        !marcadorConclusao.sinal.aborted &&
        origemConcluida.sessao === origem.sessao &&
        origemConcluida.operacao === origem.operacao;

      if (concluiuAutoritativa && Array.isArray(dados)) {
        if (mensagemSucesso) {
          toast.info(mensagemSucesso);
        }
        coordenador.liberar(origem, true);
        return true;
      }

      const avisoAtual = coordenador.lerEstado().aviso;
      const avisoFinal =
        avisoAtual ??
        "O salvamento foi enviado, mas não foi possível atualizar os dados. Consulte novamente.";
      coordenador.mudarFase(origem, "recuperacao", avisoFinal);
      return false;
    } catch {
      if (coordenador.vigente(origem)) {
        const avisoAtual = coordenador.lerEstado().aviso;
        const avisoFinal =
          avisoAtual ??
          "O salvamento foi enviado, mas não foi possível atualizar os dados. Consulte novamente.";
        coordenador.mudarFase(origem, "recuperacao", avisoFinal);
      }
      return false;
    } finally {
      desinscreverObserver?.();
      const atual = recuperacoesEmVoo.get(cliente);
      if (atual && atual === registro) {
        recuperacoesEmVoo.delete(cliente);
      }
    }
  });

  const registro: RegistroRecuperacaoEmVoo = { origem, promessa };
  recuperacoesEmVoo.set(cliente, registro);

  return promessa;
}

export function useEstadoReagendamento(): RetornoEstadoReagendamento {
  const queryClient = useQueryClient();
  const coordenador = obterCoordenadorReagendamento(queryClient);

  const subscrever = useCallback(
    (ouvinte: () => void) => {
      const desinscreverCoordenador = coordenador.assinar(ouvinte);
      const desinscreverSessao = assinarSessaoOperacional(() => {
        coordenador.sincronizarSessao();
        ouvinte();
      });
      return () => {
        desinscreverCoordenador();
        desinscreverSessao();
      };
    },
    [coordenador]
  );

  const obterSnapshot = useCallback(() => coordenador.lerEstado(), [coordenador]);

  const estado = useSyncExternalStore(subscrever, obterSnapshot, obterSnapshot);

  const recuperar = useCallback(async (): Promise<boolean> => {
    const estadoAtual = coordenador.lerEstado();
    if (estadoAtual.fase !== "recuperacao" || estadoAtual.operacao === null) {
      return false;
    }
    const origem: IdentidadeOperacao = {
      sessao: estadoAtual.sessao,
      operacao: estadoAtual.operacao,
    };
    if (!coordenador.vigente(origem)) {
      return false;
    }
    return sincronizarReagendamento(queryClient, coordenador, origem);
  }, [coordenador, queryClient]);

  return {
    estado,
    fase: estado.fase,
    aviso: estado.aviso,
    bloqueado: estado.fase !== "livre",
    recuperar,
  };
}
