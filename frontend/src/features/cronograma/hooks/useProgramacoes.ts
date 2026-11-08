import { useSyncExternalStore } from "react";
import axios from "axios";
import {
  useQuery,
  useQueryClient,
  useMutation as useTanStackMutation,
} from "@tanstack/react-query";
import { useMutacaoSessao as useMutation } from "@/shared/hooks/useMutacaoSessao";
import {
  assinarSessaoOperacional,
  capturarSessaoOperacional,
  deveExibirErroLocal,
  statusHttp,
} from "@/shared/lib/sessaoOperacao";
import { toast } from "sonner";
import {
  reordenarProgramacao,
  criarProgramacao,
  deletarProgramacao,
} from "@/features/cronograma/services/programacoes";
import type {
  Programacao,
  ReordenarProgramacaoResposta,
  CriarProgramacaoPayload,
} from "@/types";
import { proximoDiaUtilCivil } from "@/shared/lib/datasCivis";
import { projetarReordenacao } from "@/shared/lib/reordenarProgramacoes";
import type { IdentidadeOperacao } from "@/features/cronograma/lib/coordenadorReagendamento";
import {
  obterCoordenadorReagendamento,
  opcoesConsultaProgramacoes,
  sincronizarReagendamento,
  useEstadoReagendamento,
} from "./estadoReagendamento";

export interface ReordenarVariaveis {
  id: number;
  novaDataInicio: string;
  novaDataFim?: string;
}

interface SnapshotParticipante {
  id: number;
  dataInicioOriginal: string;
  dataFimOriginal: string;
  versaoConfirmadaCapturada: number;
  dataInicioOtimista: string;
  dataFimOtimista: string;
}

function extrairMensagemErro(erro: unknown, padrao: string): string {
  if (axios.isAxiosError(erro)) {
    const dados = erro.response?.data as
      | { message?: string; error?: { message?: string } }
      | undefined;
    return dados?.message || dados?.error?.message || padrao;
  }
  return padrao;
}

export function useProgramacoes() {
  const sessao = useSyncExternalStore(
    assinarSessaoOperacional,
    capturarSessaoOperacional,
    capturarSessaoOperacional
  );
  return useQuery(opcoesConsultaProgramacoes(sessao));
}

export function useReordenarProgramacao() {
  const queryClient = useQueryClient();
  const coordenador = obterCoordenadorReagendamento(queryClient);
  const estadoHook = useEstadoReagendamento();

  const mutacao = useTanStackMutation<
    ReordenarProgramacaoResposta | null,
    Error,
    { variaveis: ReordenarVariaveis; origem: IdentidadeOperacao }
  >({
    mutationFn: async ({ variaveis, origem }) => {
      const chaveExata = ["programacoes", origem.sessao] as const;

      if (!coordenador.vigente(origem)) {
        return null;
      }

      await queryClient.cancelQueries({ queryKey: chaveExata, exact: true });

      if (!coordenador.vigente(origem)) {
        return null;
      }

      const cacheAtual = queryClient.getQueryData<Programacao[]>(chaveExata);
      if (!cacheAtual || !Array.isArray(cacheAtual)) {
        coordenador.liberar(origem, true);
        throw new Error("Alocações não encontradas no cache.");
      }

      const alvo = cacheAtual.find((p) => p.id === variaveis.id);
      if (!alvo) {
        coordenador.liberar(origem, true);
        throw new Error("Alocação não encontrada no cronograma.");
      }

      if (!variaveis.novaDataInicio) {
        coordenador.liberar(origem, true);
        throw new Error("Nova data inicial não informada.");
      }

      let inicioNormalizado: string;
      try {
        inicioNormalizado = proximoDiaUtilCivil(variaveis.novaDataInicio);
      } catch (erroNorm) {
        coordenador.liberar(origem, true);
        throw erroNorm;
      }

      if (alvo.dataInicio === inicioNormalizado) {
        coordenador.liberar(origem, true);
        return {
          id: alvo.id,
          novaDataInicio: alvo.dataInicio,
          novaDataFim: alvo.dataFim,
          programacoesAfetadas: [],
        };
      }

      let projecao: ReturnType<typeof projetarReordenacao>;
      try {
        projecao = projetarReordenacao(cacheAtual, variaveis.id, inicioNormalizado);
      } catch (erroProj) {
        coordenador.liberar(origem, true);
        throw erroProj;
      }

      if (!projecao) {
        coordenador.liberar(origem, true);
        throw new Error("Falha ao projetar reagendamento.");
      }

      if (
        projecao.alteradas.length === 1 &&
        projecao.afetadas.length === 0 &&
        projecao.principal.dataInicio === alvo.dataInicio
      )
      {
        coordenador.liberar(origem, true);
        return {
          id: alvo.id,
          novaDataInicio: alvo.dataInicio,
          novaDataFim: alvo.dataFim,
          programacoesAfetadas: [],
        };
      }

      const mapaSnapshots = new Map<number, SnapshotParticipante>();
      for (const alterado of projecao.alteradas) {
        const original = cacheAtual.find((p) => p.id === alterado.id);
        if (original) {
          mapaSnapshots.set(alterado.id, {
            id: alterado.id,
            dataInicioOriginal: original.dataInicio,
            dataFimOriginal: original.dataFim,
            versaoConfirmadaCapturada: coordenador.versaoConfirmada(alterado.id),
            dataInicioOtimista: alterado.dataInicio,
            dataFimOtimista: alterado.dataFim,
          });
        }
      }

      const mapaOtimista = new Map(projecao.alteradas.map((a) => [a.id, a]));
      queryClient.setQueryData<Programacao[]>(chaveExata, (antigo) => {
        if (!antigo) return antigo;
        return antigo.map((item) => {
          const alterado = mapaOtimista.get(item.id);
          if (!alterado) return item;
          return {
            ...item,
            dataInicio: alterado.dataInicio,
            dataFim: alterado.dataFim,
          };
        });
      });

      let putIniciado = false;
      let resposta200: ReordenarProgramacaoResposta;

      try {
        if (!coordenador.vigente(origem)) {
          return null;
        }
        putIniciado = true;
        resposta200 = await reordenarProgramacao(
          variaveis.id,
          { novaDataInicio: inicioNormalizado },
          origem.sessao
        );
      } catch (erroPut) {
        if (!coordenador.vigente(origem)) {
          return null;
        }

        const status = statusHttp(erroPut);
        const ehRecusaHttp =
          status === 400 || status === 403 || status === 404 || status === 409;

        if (ehRecusaHttp) {
          const reverterItem = (item: Programacao): Programacao => {
            const snap = mapaSnapshots.get(item.id);
            if (!snap) return item;
            const versaoAtual = coordenador.versaoConfirmada(item.id);
            if (versaoAtual !== snap.versaoConfirmadaCapturada) {
              return item;
            }
            if (
              item.dataInicio === snap.dataInicioOtimista &&
              item.dataFim === snap.dataFimOtimista
            ) {
              return {
                ...item,
                dataInicio: snap.dataInicioOriginal,
                dataFim: snap.dataFimOriginal,
              };
            }
            return item;
          };

          queryClient.setQueryData<Programacao[]>(chaveExata, (antigo) =>
            antigo ? antigo.map(reverterItem) : antigo
          );

          if (deveExibirErroLocal(erroPut) && coordenador.vigente(origem)) {
            toast.error(
              extrairMensagemErro(
                erroPut,
                "Erro ao reordenar alocação. Posição revertida."
              )
            );
          }

          coordenador.liberar(origem, true);
          throw erroPut;
        }

        if (status === 401) {
          coordenador.liberar(origem, true);
          throw erroPut;
        }

        if (putIniciado) {
          const avisoIncerto =
            "O reagendamento pode ter sido processado. Consulte novamente para conferir o estado atual.";
          coordenador.mudarFase(origem, "sincronizando", avisoIncerto);
          await sincronizarReagendamento(queryClient, coordenador, origem);
          return null;
        }

        coordenador.liberar(origem, true);
        throw erroPut;
      }

      if (!coordenador.vigente(origem)) {
        return null;
      }

      const mapaNovasDatas = new Map<number, { dataInicio: string; dataFim: string }>();
      mapaNovasDatas.set(resposta200.id, {
        dataInicio: resposta200.novaDataInicio,
        dataFim: resposta200.novaDataFim,
      });
      for (const af of resposta200.programacoesAfetadas) {
        mapaNovasDatas.set(af.id, {
          dataInicio: af.novaDataInicio,
          dataFim: af.novaDataFim,
        });
      }

      queryClient.setQueryData<Programacao[]>(chaveExata, (antigo) => {
        if (!antigo) return antigo;
        return antigo.map((item) => {
          const novas = mapaNovasDatas.get(item.id);
          if (!novas) return item;
          const snap = mapaSnapshots.get(item.id);
          if (snap && coordenador.versaoConfirmada(item.id) !== snap.versaoConfirmadaCapturada) {
            return item;
          }
          return {
            ...item,
            dataInicio: novas.dataInicio,
            dataFim: novas.dataFim,
          };
        });
      });

      const idsConfirmados = [
        resposta200.id,
        ...resposta200.programacoesAfetadas.map((a) => a.id),
      ];
      coordenador.confirmar(origem, idsConfirmados);

      const totalAfetadas = resposta200.programacoesAfetadas?.length || 0;
      const mensagemSucesso =
        totalAfetadas > 0
          ? `Cronograma atualizado. ${totalAfetadas} alocação(ões) subsequente(s) ajustada(s) automaticamente.`
          : "Alocação reagendada com sucesso";

      const sincSucesso = await sincronizarReagendamento(
        queryClient,
        coordenador,
        origem,
        mensagemSucesso
      );

      if (sincSucesso && coordenador.pertenceAoContexto(origem)) {
        return resposta200;
      }

      return null;
    },
    retry: false,
  });

  const mutate = (variaveis: ReordenarVariaveis): void => {
    const sessao = capturarSessaoOperacional();
    const origem = coordenador.reservar(sessao);
    if (!origem) return;
    mutacao.mutate({ variaveis, origem });
  };

  const mutateAsync = async (
    variaveis: ReordenarVariaveis
  ): Promise<ReordenarProgramacaoResposta | null> => {
    const sessao = capturarSessaoOperacional();
    const origem = coordenador.reservar(sessao);
    if (!origem) return null;
    return mutacao.mutateAsync({ variaveis, origem });
  };

  return {
    mutate,
    mutateAsync,
    isPending: estadoHook.bloqueado,
    estado: estadoHook.estado,
    fase: estadoHook.fase,
    aviso: estadoHook.aviso,
    bloqueado: estadoHook.bloqueado,
    recuperar: estadoHook.recuperar,
  };
}

export function useCriarProgramacao() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dados: CriarProgramacaoPayload, sessao) => criarProgramacao(dados, sessao),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["programacoes"] });
      toast.success("Alocação criada com sucesso no cronograma!");
    },
    onError: (err: unknown) => {
      if (!deveExibirErroLocal(err)) return;
      const mensagem =
        (err as { response?: { data?: { error?: { message?: string } } } })
          ?.response?.data?.error?.message || "Erro ao alocar equipe.";
      toast.error(mensagem);
    },
  });
}

export function useDeletarProgramacao() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number, sessao) => deletarProgramacao(id, sessao),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["programacoes"] });
      toast.success("Alocação removida do cronograma.");
    },
    onError: (err: unknown) => {
      if (!deveExibirErroLocal(err)) return;
      const mensagem =
        (err as { response?: { data?: { error?: { message?: string } } } })
          ?.response?.data?.error?.message || "Erro ao remover alocação.";
      toast.error(mensagem);
    },
  });
}
