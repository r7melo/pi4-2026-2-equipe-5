import { exigirSessaoOperacional } from "@/shared/lib/sessaoOperacao";
import { useMutacaoSessao as useMutation } from "@/shared/hooks/useMutacaoSessao";

import type { CriarUsuarioPayload } from "../types/usuarios";
import { criarUsuario } from "../services/usuarios";

export function useCriarUsuario() {
  return useMutation({
    mutationFn: async (dados: CriarUsuarioPayload, sessao) => { const r = await criarUsuario(dados, sessao); exigirSessaoOperacional(sessao); return r; },
    retry: false,
    networkMode: "always",
    gcTime: 0,
  });
}
