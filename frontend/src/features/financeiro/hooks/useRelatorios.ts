import { useQuery } from "@tanstack/react-query";
import { buscarRelatorioCusto } from "@/features/financeiro/services/relatorios";
import { api } from "@/shared/api/api";
import type { ListaObras } from "@/types";

export function useRelatorioCusto(obraId: number) {
  return useQuery({
    queryKey: ["relatorio-custo", obraId],
    queryFn: () => buscarRelatorioCusto(obraId),
    staleTime: 1000 * 60 * 5, // 5 minutos de cache (relatório pesado/demorado)
    enabled: !!obraId,
  });
}

/** Hook leve de listagem para dropdowns financeiros, desacoplado do Kanban */
export function useObrasSelect() {
  return useQuery({
    queryKey: ["obras", "select"],
    queryFn: async () => {
      const { data } = await api.get<ListaObras>("/obras", {
        params: { pageSize: 100 },
      });
      return data;
    },
    staleTime: 1000 * 60 * 5, // 5 minutos
  });
}
