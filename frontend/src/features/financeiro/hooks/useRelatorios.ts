import { useMutacaoSessao } from '@/shared/hooks/useMutacaoSessao';
import { assinarSessaoOperacional, capturarSessaoOperacional, exigirSessaoOperacional } from '@/shared/lib/sessaoOperacao';
import { useSyncExternalStore } from 'react';
import type { PedidoExportacaoRelatorio } from '@/types';
import { exportarRelatorio } from '../services/relatorios';
import { useQuery, useMutation } from "@tanstack/react-query";
import { gerarLinkRelatorioDemonstracao, buscarRelatorioCusto } from "@/features/financeiro/services/relatorios";
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

export function useLinkRelatorioDemonstracao() {
  return useMutation({ mutationFn: gerarLinkRelatorioDemonstracao, retry: false });
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
