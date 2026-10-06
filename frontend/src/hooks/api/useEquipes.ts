import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  listarEquipes,
  criarEquipe,
  listarInstaladores,
  type CriarEquipePayload,
} from "@/services/equipes";

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
    mutationFn: (payload: CriarEquipePayload) => criarEquipe(payload),
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

