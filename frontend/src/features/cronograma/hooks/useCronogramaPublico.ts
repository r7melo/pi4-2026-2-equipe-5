import { useQuery } from "@tanstack/react-query";
import type { FiltrosCronogramaCompartilhado } from "@/types";
import { obterCronogramaCompartilhado } from "@/features/cronograma/services/cronogramaPublico";
import { programacoesPublicasValidas } from "@/features/cronograma/lib/compartilhamento";
import { statusHttp } from "@/shared/lib/sessaoOperacao";

export function useCronogramaPublico(token: string, filtros: FiltrosCronogramaCompartilhado) {
  return useQuery({
    queryKey: ["cronogramaPublico", token, filtros.dataInicio, filtros.dataFim],
    queryFn: async () => {
      const dados = await obterCronogramaCompartilhado(token, filtros);
      if (!programacoesPublicasValidas(dados)) throw new Error("Não foi possível carregar o cronograma.");
      return dados;
    },
    enabled: Boolean(token),
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: "always",
    retry: (tentativa, erro) => ![400, 401, 403, 404].includes(statusHttp(erro) ?? 0) && tentativa < 1,
  });
}
