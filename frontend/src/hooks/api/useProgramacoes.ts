import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  listarProgramacoes,
  reordenarProgramacao,
  type Programacao,
  type ReordenarProgramacaoResposta,
} from "@/services/programacoes";

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
    }: {
      id: number;
      novaDataInicio: string;
      novaDataFim: string;
    }) => reordenarProgramacao(id, { novaDataInicio }),

    // Fase 1: Feedback visual imediato (apenas o item arrastado)
    onMutate: async ({ id, novaDataInicio, novaDataFim }) => {
      await queryClient.cancelQueries({ queryKey: ["programacoes"] });
      const previous = queryClient.getQueryData<Programacao[]>(["programacoes"]);

      queryClient.setQueryData<Programacao[]>(["programacoes"], (old) => {
        if (!old) return old;
        return old.map((p) =>
          p.id === id
            ? { ...p, dataInicio: novaDataInicio, dataFim: novaDataFim }
            : p
        );
      });

      return { previous };
    },

    // Fase 2: Propagação em cadeia com dados reais do backend (RF-09)
    onSuccess: (resposta: ReordenarProgramacaoResposta) => {
      queryClient.setQueryData<Programacao[]>(["programacoes"], (old) => {
        if (!old) return old;
        return old.map((p) => {
          // Atualiza o item principal com as datas reais do backend
          if (p.id === resposta.id) {
            return {
              ...p,
              dataInicio: resposta.novaDataInicio,
              dataFim: resposta.novaDataFim,
            };
          }
          // Propaga atrasos nas programações afetadas
          const afetada = resposta.programacoesAfetadas?.find(
            (a) => a.id === p.id
          );
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

    // Rollback em caso de falha na API
    onError: (_err, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(["programacoes"], context.previous);
      }
    },

    // Revalidação final para garantir consistência
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: ["programacoes"] }),
  });
}
