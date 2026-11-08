import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMutacaoSessao as useMutation } from "@/shared/hooks/useMutacaoSessao";

import { listarEquipes, criarEquipe, listarInstaladores } from "@/features/cronograma/services/equipes";
import type { CriarEquipePayload } from "@/types";

export function useEquipes() {
  return useQuery({
    queryKey: ["equipes"],
    queryFn: listarEquipes,
    staleTime: 1000 * 60 * 5,
  });
}

export function useCriarEquipe() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CriarEquipePayload, sessao) => criarEquipe(payload, sessao),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["equipes"] });
    },
  });
}

export function useInstaladoresDisponiveis() {
  return useQuery({
    queryKey: ["instaladores-disponiveis"],
    queryFn: listarInstaladores,
    staleTime: 1000 * 60 * 5,
  });
}
