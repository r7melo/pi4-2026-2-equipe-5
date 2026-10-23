import { useMutation, useQuery } from "@tanstack/react-query";
import { criarUsuario, listarEquipesOpcoes } from "../services/usuarios";

export function useCriarUsuario() {
  return useMutation({
    mutationFn: criarUsuario,
    retry: false,
    networkMode: "always",
    gcTime: 0,
  });
}

export function useEquipesOpcoes(habilitada: boolean) {
  return useQuery({
    queryKey: ["equipes", "opcoes"],
    queryFn: listarEquipesOpcoes,
    enabled: habilitada,
    retry: false,
    staleTime: 0,
  });
}
