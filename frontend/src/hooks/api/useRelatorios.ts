import { useQuery } from "@tanstack/react-query";
import { buscarRelatorioCusto } from "@/services/relatorios";

export function useRelatorioCusto(obraId: number) {
  return useQuery({
    queryKey: ["relatorio-custo", obraId],
    queryFn: () => buscarRelatorioCusto(obraId),
    staleTime: 1000 * 60 * 5, // 5 minutos de cache (relatório pesado/demorado)
    enabled: !!obraId,
  });
}
