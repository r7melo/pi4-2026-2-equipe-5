import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMutacaoSessao as useMutation } from "@/shared/hooks/useMutacaoSessao";
import { contextoDemonstracao, contextoDemonstracaoVigente } from "@/shared/lib/contextoDemonstracao";
import { erroDaSessaoAnterior, sessaoOperacionalVigente } from "@/shared/lib/sessaoOperacao";

import { listarObras, obterHomologacaoObra, excluirObra, criarObra } from "../services/obras";
import type { ObraCadastrada } from "../types/clientes";
import type { ListaObras, DadosHomologacao } from "../types/obras";
import type { CriarObraPayload } from "../types/obrasCadastro";

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
          } catch (erro) {
            if (erroDaSessaoAnterior(erro)) throw erro;
            return { obraId: id, parecerAcesso: "Pendente" as const };
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
    mutationFn: (id: number, sessao) => excluirObra(id, sessao),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["obras"] });
      void queryClient.invalidateQueries({ queryKey: ["programacoes"] });
    },
  });
}

interface ContextoCriacaoObra {
  sessao: number;
  origemDemonstracao: string;
}

export function useCriarObra() {
  const queryClient = useQueryClient();
  return useMutation<ObraCadastrada, CriarObraPayload, ContextoCriacaoObra>({
    onMutate: (_payload, _contexto, sessao) => ({
      sessao,
      origemDemonstracao: contextoDemonstracao(),
    }),
    mutationFn: (payload, sessao) => criarObra(payload, sessao),
    onSuccess: (novaObra, _payload, contexto) => {
      if (
        !contexto ||
        !sessaoOperacionalVigente(contexto.sessao) ||
        !contextoDemonstracaoVigente(contexto.origemDemonstracao)
      ) {
        return;
      }
      void queryClient.invalidateQueries({ queryKey: ["clientes"] });
      queryClient.setQueryData<ListaObras>(["obras"], (old) => {
        if (!old) return old;
        if (old.itens.some((item) => item.id === novaObra.id)) return old;
        return {
          ...old,
          total: old.total + 1,
          itens: [novaObra, ...old.itens],
        };
      });
      void queryClient.invalidateQueries({ queryKey: ["obras"] });
    },
  });
}
