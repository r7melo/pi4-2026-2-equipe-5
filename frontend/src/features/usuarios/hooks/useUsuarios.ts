import { useQuery } from "@tanstack/react-query";
import { useMutacaoSessao as useMutation } from "@/shared/hooks/useMutacaoSessao";

import type { CriarUsuarioPayload } from "../types/usuarios";
import { criarUsuario, listarEquipesOpcoes } from "../services/usuarios";

export function useCriarUsuario() {
  return useMutation({
    mutationFn: (dados: CriarUsuarioPayload, sessao) => criarUsuario(dados, sessao),
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
