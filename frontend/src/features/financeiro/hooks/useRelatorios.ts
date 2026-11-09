import { useMutacaoSessao } from '@/shared/hooks/useMutacaoSessao';
import { assinarSessaoOperacional, capturarSessaoOperacional, exigirSessaoOperacional } from '@/shared/lib/sessaoOperacao';
import { useSyncExternalStore } from 'react';
import type { PedidoExportacaoRelatorio, AtualizarCustosPayload, ListaObras } from '@/types';
import { exportarRelatorio } from '../services/relatorios';
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/shared/api/api";
import {
  gerarLinkCompartilhadoRelatorio,
  buscarRelatorioCusto,
  buscarDreObra,
  buscarCustosObra,
  atualizarCustosObra,
} from "@/features/financeiro/services/relatorios";

export function useRelatorioCusto(obraId: number) {
  return useQuery({
    queryKey: ["relatorio-custo", obraId],
    queryFn: () => buscarRelatorioCusto(obraId),
    staleTime: 1000 * 60 * 5, // 5 minutos de cache (relatório pesado/demorado)
    enabled: !!obraId,
  });
}

/** Hook de consulta do DRE da Obra — Rota #34 */
export function useDreObra(obraId: number | null, statusObra?: string) {
  return useQuery({
    queryKey: statusObra ? ["dre", obraId, statusObra] : ["dre", obraId],
    queryFn: () => (obraId ? buscarDreObra(obraId) : Promise.reject(new Error("ID de obra inválido"))),
    staleTime: 1000 * 15, // 15 segundos
    enabled: !!obraId,
    retry: false,
  });
}

/** Hook de consulta de Custos e Valor da Obra — Rota #31 */
export function useCustosObra(obraId: number | null) {
  return useQuery({
    queryKey: ["custos", obraId],
    queryFn: () => (obraId ? buscarCustosObra(obraId) : Promise.reject(new Error("ID de obra inválido"))),
    staleTime: 1000 * 15,
    enabled: !!obraId,
  });
}

/** Hook de mutação para atualizar custos e valor da obra — Rota #32 */
export function useAtualizarCustosObra(obraId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: AtualizarCustosPayload) => atualizarCustosObra(obraId, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["custos", obraId] });
      void queryClient.invalidateQueries({ queryKey: ["dre"] });
      void queryClient.invalidateQueries({ queryKey: ["relatorio-custo", obraId] });
      void queryClient.invalidateQueries({ queryKey: ["obras"] });
    },
  });
}

/** Hook leve de listagem de obras para dropdowns financeiros, desacoplado de outras fatias */
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

export function useLinkRelatorioDemonstracao() {
  return useMutation({
    mutationFn: (periodo: { dataInicio: string; dataFim: string }) => gerarLinkCompartilhadoRelatorio(periodo),
    retry: false,
  });
}

export function useExportarRelatorio() {
  const sessaoObservada = useSyncExternalStore(assinarSessaoOperacional, capturarSessaoOperacional);
  return useMutacaoSessao<Blob, PedidoExportacaoRelatorio>({ retry: false, mutationKey: ['exportacao-financeira', sessaoObservada],
    mutationFn: async (pedido, sessao) => {
      const blob = await exportarRelatorio(pedido.formato, pedido.filtros, sessao);
      exigirSessaoOperacional(sessao); return blob;
    },
  });
}
