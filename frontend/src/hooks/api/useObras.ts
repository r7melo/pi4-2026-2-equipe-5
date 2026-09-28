import { useQuery } from "@tanstack/react-query";
import { listarObras } from "@/services/obras";
import type { ListaObras } from "@/types";

export function useObras(params?: {
  status?: string;
  clienteNome?: string;
  page?: number;
  pageSize?: number;
}) {
  return useQuery<ListaObras>({
    queryKey: params ? ["obras", params] : ["obras"],
    queryFn: () => listarObras(params ?? { pageSize: 200 }),
    staleTime: 1000 * 30,
  });
}

