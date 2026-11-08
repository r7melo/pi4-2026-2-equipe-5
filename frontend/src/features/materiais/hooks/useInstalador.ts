import { useQuery } from "@tanstack/react-query";
import { listarInstalacoes, obterDetalhesInstalacao } from "../services/instalador";
import type { InstalacaoItemResumo, InstalacaoDetalhe } from "../types/instalador";

export function useInstalacoesInstalador() {
  return useQuery<InstalacaoItemResumo[]>({
    queryKey: ["instalacoes-instalador"],
    queryFn: listarInstalacoes,
    staleTime: 1000 * 30, // 30 segundos
  });
}

export function useDetalhesInstalacao(obraId?: number | null) {
  return useQuery<InstalacaoDetalhe>({
    queryKey: ["instalacao-detalhe", obraId],
    queryFn: () => (obraId ? obterDetalhesInstalacao(obraId) : Promise.reject(new Error("ID de obra inválido"))),
    enabled: typeof obraId === "number" && obraId > 0,
    staleTime: 1000 * 60, // 1 minuto
  });
}
