// frontend/src/hooks/api/useObras.ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { listarObras, obterHomologacaoObra, excluirObra } from "@/services/obras";
import type { ListaObras, DadosHomologacao } from "@/types";

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

/** Hook individual para o Drawer lateral */
export function useHomologacao(obraId?: number) {
  return useQuery<DadosHomologacao>({
    queryKey: ["homologacao", obraId],
    queryFn: () => obterHomologacaoObra(obraId!),
    enabled: typeof obraId === "number" && obraId > 0,
    staleTime: 1000 * 60 * 5, // 5 min
  });
}

/** 
 * Hook em lote para prover status de homologação aos micro-ícones do Gantt.
 * Alimenta automaticamente o cache individual de cada obraId no React Query.
 */
export function useHomologacoesObras(obraIds: number[]) {
  const queryClient = useQueryClient();
  const idsChave = obraIds.slice().sort((a, b) => a - b).join(",");

  return useQuery<Record<number, DadosHomologacao>>({
    queryKey: ["homologacoes", idsChave],
    queryFn: async () => {
      const resultados = await Promise.all(
        obraIds.map(async (id) => {
          try {
            const h = await obterHomologacaoObra(id);
            queryClient.setQueryData(["homologacao", id], h);
            return h;
          } catch {
            const fallback: DadosHomologacao = { obraId: id, parecerAcesso: "Pendente" as const };
            queryClient.setQueryData(["homologacao", id], fallback);
            return fallback;
          }
        })
      );
      return resultados.reduce((acc, h) => {
        acc[h.obraId] = h;
        return acc;
      }, {} as Record<number, DadosHomologacao>);
    },
    enabled: obraIds.length > 0,
    staleTime: 1000 * 60 * 5,
  });
}

export function useExcluirObra() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => excluirObra(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["obras"] });
      queryClient.invalidateQueries({ queryKey: ["programacoes"] });
    },
  });
}

