import { useQuery } from "@tanstack/react-query";
import { buscarUsuarioLogado } from "../services/auth";
import { exigirSessaoOperacional } from "@/shared/lib/sessaoOperacao";

export function useUsuarioConfiguracoes(geracao: number) {
  return useQuery({
    queryKey: ["usuarioConfiguracoes", geracao], retry: false, gcTime: 0,
    queryFn: async ({ signal }) => {
      exigirSessaoOperacional(geracao);
      const usuario = await buscarUsuarioLogado({ signal, sessao403: geracao, politica401: "sessao" });
      exigirSessaoOperacional(geracao);
      return usuario;
    },
  });
}
