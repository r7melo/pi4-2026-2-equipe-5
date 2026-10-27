import { capturarSessaoOperacional, exigirSessaoOperacional } from "@/shared/lib/sessaoOperacao";
import { useSessaoUsuarios } from "./useGestaoUsuarios";
import { useQuery } from "@tanstack/react-query";
import { useMutacaoSessao as useMutation } from "@/shared/hooks/useMutacaoSessao";

import type { CriarUsuarioPayload } from "../types/usuarios";
import { criarUsuario, listarEquipesOpcoes } from "../services/usuarios";

export function useCriarUsuario() {
  return useMutation({
    mutationFn: async (dados: CriarUsuarioPayload, sessao) => { const r = await criarUsuario(dados, sessao); exigirSessaoOperacional(sessao); return r; },
    retry: false,
    networkMode: "always",
    gcTime: 0,
  });
}

export function useEquipesOpcoes(habilitada: boolean) {
  const geracao = useSessaoUsuarios();
  return useQuery({
    queryKey: ["equipes", "opcoes", geracao],
    queryFn: async () => { const s = capturarSessaoOperacional(); const r = await listarEquipesOpcoes(s); exigirSessaoOperacional(s); return r; },
    enabled: habilitada,
    retry: false,
    staleTime: 0,
  });
}
