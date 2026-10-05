// frontend/src/hooks/api/useProgramacoes.ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  listarProgramacoes,
  reordenarProgramacao,
  criarProgramacao,
  deletarProgramacao,
  type Programacao,
  type ReordenarProgramacaoResposta,
} from "@/services/programacoes";
import { calcularDiasUteisEntre } from "@/lib/formatters";

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
    }) => reordenarProgramacao(id, { novaDataInicio, novaDataFim }),

    onMutate: async ({ id, novaDataInicio, novaDataFim }) => {
      await queryClient.cancelQueries({ queryKey: ["programacoes"] });
      const previous = queryClient.getQueryData<Programacao[]>(["programacoes"]);

      queryClient.setQueryData<Programacao[]>(["programacoes"], (old) => {
        if (!old) return old;
        return old.map((p) => {
          if (p.id !== id) return p;
          const dataIni = novaDataInicio || p.dataInicio;
          const dataFim = novaDataFim || p.dataFim;
          const novaDuracao = Math.max(1, calcularDiasUteisEntre(dataIni, dataFim));
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
        return old.map((p) => {
          if (p.id === resposta.id) {
            const novaDuracao = Math.max(
              1,
              calcularDiasUteisEntre(resposta.novaDataInicio, resposta.novaDataFim)
            );
            return {
              ...p,
              dataInicio: resposta.novaDataInicio,
              dataFim: resposta.novaDataFim,
              duracaoEstimadaDias: novaDuracao,
            };
          }
          const afetada = resposta.programacoesAfetadas?.find((a) => a.id === p.id);
          if (afetada) {
            return {
              ...p,
              dataInicio: afetada.novaDataInicio,
              dataFim: afetada.novaDataFim,
            };
          }
          return p;
        });
      });
    },

    onError: (_err, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(["programacoes"], context.previous);
      }
      toast.error("Erro ao reordenar alocação no cronograma.");
    },

    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ["programacoes"] });
    },
  });
}

export function useCriarProgramacao() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: criarProgramacao,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["programacoes"] });
      toast.success("Alocação criada com sucesso no cronograma!");
    },
    onError: (err: unknown) => {
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
    mutationFn: deletarProgramacao,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["programacoes"] });
      toast.success("Alocação removida do cronograma.");
    },
    onError: (err: unknown) => {
      const mensagem =
        (err as { response?: { data?: { error?: { message?: string } } } })
          ?.response?.data?.error?.message || "Erro ao remover alocação.";
      toast.error(mensagem);
    },
  });
}
