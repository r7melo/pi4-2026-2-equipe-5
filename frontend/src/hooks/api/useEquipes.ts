import { useQuery } from "@tanstack/react-query";
import { listarEquipes } from "@/services/equipes";

export function useEquipes() {
  return useQuery({
    queryKey: ["equipes"],
    queryFn: listarEquipes,
    staleTime: 1000 * 60 * 5, // 5 min
  });
}
