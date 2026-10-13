import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  listarProgramacoes,
  reordenarProgramacao,
  criarProgramacao,
  deletarProgramacao,
} from "@/services/programacoes";
import type { Programacao, ReordenarProgramacaoResposta } from "@/types";
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

        let atualizadas = old.map((p) => {
          if (p.id !== resposta.id) return p;
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
              calcularDiasUteisEntre(afetada.novaDataInicio, afetada.novaDataFim)
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

    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(["programacoes"], context.previous);
      }
      toast.error("Erro ao reordenar alocação. Posição revertida.");
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
