import axios from "axios";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMutacaoSessao as useMutation } from "@/shared/hooks/useMutacaoSessao";
import { deveExibirErroLocal, exigirSessaoOperacional } from "@/shared/lib/sessaoOperacao";

import { toast } from "sonner";
import {
  listarProgramacoes,
  reordenarProgramacao,
  criarProgramacao,
  deletarProgramacao,
} from "@/features/cronograma/services/programacoes";
import type { Programacao, ReordenarProgramacaoResposta, CriarProgramacaoPayload } from "@/types";
import { calcularDiasUteisInclusivos } from "@/shared/lib/formatters";

export function useProgramacoes() {
  return useQuery({
    queryKey: ["programacoes"],
    queryFn: listarProgramacoes,
    staleTime: 1000 * 30, // 30s
  });
}

export function useReordenarProgramacao() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      novaDataInicio,
      novaDataFim,
    }: {
      id: number;
      novaDataInicio?: string;
      novaDataFim?: string;
    }, sessao) => reordenarProgramacao(id, { novaDataInicio, novaDataFim }, sessao),

    onMutate: async ({ id, novaDataInicio, novaDataFim }, _contexto, sessao) => {
      await queryClient.cancelQueries({ queryKey: ["programacoes"] });
      exigirSessaoOperacional(sessao);
      const previous = queryClient.getQueryData<Programacao[]>(["programacoes"]);

      queryClient.setQueryData<Programacao[]>(["programacoes"], (old) => {
        if (!old) return old;
        return old.map((p) => {
          if (p.id !== id) return p;
          const dataIni = novaDataInicio || p.dataInicio;
          const dataFim = novaDataFim || p.dataFim;
          const novaDuracao = Math.max(1, calcularDiasUteisInclusivos(dataIni, dataFim));
          return {
            ...p,
            dataInicio: dataIni,
            dataFim: dataFim,
            duracaoEstimadaDias: novaDuracao,
          };
        });
      });

      return { previous };
    },

    onSuccess: (resposta: ReordenarProgramacaoResposta) => {
      queryClient.setQueryData<Programacao[]>(["programacoes"], (old) => {
        if (!old) return old;

        let atualizadas = old.map((p) => {
          if (p.id !== resposta.id) return p;
          const novaDuracao = Math.max(
            1,
            calcularDiasUteisInclusivos(resposta.novaDataInicio, resposta.novaDataFim)
          );
          return {
            ...p,
            dataInicio: resposta.novaDataInicio,
            dataFim: resposta.novaDataFim,
            duracaoEstimadaDias: novaDuracao,
          };
        });

        if (resposta.programacoesAfetadas && resposta.programacoesAfetadas.length > 0) {
          const mapaAfetadas = new Map(
            resposta.programacoesAfetadas.map((a) => [a.id, a])
          );
          atualizadas = atualizadas.map((p) => {
            const afetada = mapaAfetadas.get(p.id);
            if (!afetada) return p;
            const novaDuracao = Math.max(
              1,
              calcularDiasUteisInclusivos(afetada.novaDataInicio, afetada.novaDataFim)
            );
            return {
              ...p,
              dataInicio: afetada.novaDataInicio,
              dataFim: afetada.novaDataFim,
              duracaoEstimadaDias: novaDuracao,
            };
          });
        }

        return atualizadas;
      });

      const totalAfetadas = resposta.programacoesAfetadas?.length || 0;
      if (totalAfetadas > 0) {
        toast.info(
          `Cronograma atualizado. ${totalAfetadas} alocação(ões) subsequente(s) ajustada(s) automaticamente.`
        );
      } else {
        toast.success("Alocação reagendada com sucesso");
      }
    },

    onError: (err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(["programacoes"], context.previous);
      }
      if (!deveExibirErroLocal(err)) return;
      let mensagem = "Erro ao reordenar alocação. Posição revertida.";
      if (axios.isAxiosError(err)) {
        const dados = err.response?.data as
          | { message?: string; error?: { message?: string } }
          | undefined;
        mensagem = dados?.message || dados?.error?.message || mensagem;
      }
      toast.error(mensagem);
    },


    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ["programacoes"] });
    },
  });
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
