import { useQuery } from "@tanstack/react-query";
import { buscarRelatorioPublico, type RelatorioPublicoDados } from "@/services/cronogramaPublico";

export function useRelatorioPublico(token: string) {
  return useQuery<RelatorioPublicoDados>({
    queryKey: ["relatorioPublico", token],
    queryFn: () => buscarRelatorioPublico(token),
    enabled: Boolean(token),
    staleTime: 1000 * 60 * 5, // 5 minutos de cache
  });
}
