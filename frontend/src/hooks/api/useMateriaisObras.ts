import { useQueries } from "@tanstack/react-query";
import { useMemo } from "react";
import { listarMateriais } from "@/services/materiais";
import type { Material } from "@/services/materiais";

export function useMateriaisObras(obraIds: number[]) {
  const queryDefs = useMemo(
    () =>
      obraIds.map((id) => ({
        queryKey: ["materiais", id],
        queryFn: () => listarMateriais(id),
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
        if (res && res.data) {
          mapa.set(id, res.data);
        }
      });
      return {
        mapaMateriais: mapa,
        isLoading: results.some((r) => r.isLoading),
      };
    },
  });
}
