import { useQueries } from "@tanstack/react-query";
import { useMemo } from "react";
import { listarMateriais } from "../services/materiais";
import type { Material } from "@/shared/types/materiais";

export function useMateriaisObras(obraIds: number[]) {
  const queryDefs = useMemo(
    () =>
      obraIds.map((id) => ({
        queryKey: ["materiais", id],
        queryFn: ({ signal }: { signal: AbortSignal }) => listarMateriais(id, undefined, signal),
        staleTime: 5 * 60 * 1000,
        enabled: id > 0,
      })),
    [obraIds]
  );

  return useQueries({
    queries: queryDefs,
    combine: (results) => {
      const mapa = new Map<number, Material[]>();
      obraIds.forEach((id, index) => {
        const res = results[index];
        // Não expor dados em cache se a consulta falhou (evita falso gargalo).
        if (res && res.data && !res.isError) {
          mapa.set(id, res.data);
        }
      });
      return {
        mapaMateriais: mapa,
        isLoading: results.some((r) => r.isLoading),
        isError: results.some((r) => r.isError),
        refetchErros: () => Promise.all(results.filter((r) => r.isError).map((r) => r.refetch())),
      };
    },
  });
}
