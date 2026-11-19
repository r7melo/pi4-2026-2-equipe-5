import { useMutacaoSessao } from '@/shared/hooks/useMutacaoSessao';
import { assinarSessaoOperacional, capturarSessaoOperacional, exigirSessaoOperacional, sessaoOperacionalVigente } from '@/shared/lib/sessaoOperacao';
import { contextoDemonstracao, contextoDemonstracaoVigente } from '@/shared/lib/contextoDemonstracao';
import { useSyncExternalStore } from 'react';
import type { FiltrosRelatorioDemonstracao } from '@/shared/types/demonstracao';
import type { PedidoExportacaoRelatorio, AtualizarCustosPayload, ListaObrasFinanceiro, CustosObra } from "../types/relatorios";
import { exportarRelatorio } from '../services/relatorios';
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/shared/api/api";
import {
  gerarLinkRelatorioDemonstracao,
  buscarDreObra,
  buscarCustosObra,
  atualizarCustosObra,
} from "@/features/financeiro/services/relatorios";


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
  return useMutacaoSessao<CustosObra, AtualizarCustosPayload, { sessao: number; origem: string; obraId: number }>({
    onMutate: (_dados, _contexto, sessao) => ({
      sessao,
      origem: contextoDemonstracao(),
      obraId,
    }),
    mutationFn: async (payload, sessao) => {
      exigirSessaoOperacional(sessao);
      const origem = contextoDemonstracao();
      try {
        const resultado = await atualizarCustosObra(obraId, payload);
        if (!contextoDemonstracaoVigente(origem)) exigirSessaoOperacional(-1);
        exigirSessaoOperacional(sessao);
        return resultado;
      } catch (erro) {
        if (!contextoDemonstracaoVigente(origem)) exigirSessaoOperacional(-1);
        exigirSessaoOperacional(sessao);
        throw erro;
      }
    },
    onSuccess: (resultado, _payload, contexto) => {
      if (!contexto || !sessaoOperacionalVigente(contexto.sessao) || !contextoDemonstracaoVigente(contexto.origem)) {
        return;
      }
      const obraAlvo = resultado?.obraId ?? contexto.obraId;
      if (resultado && typeof resultado === "object") {
        queryClient.setQueryData(["custos", obraAlvo], resultado);
      }
      void queryClient.invalidateQueries({ queryKey: ["custos", obraAlvo] });
      void queryClient.invalidateQueries({ queryKey: ["dre"] });
      void queryClient.invalidateQueries({ queryKey: ["obras"] });
    },
  });
}

/** Hook leve de listagem de obras para dropdowns financeiros, desacoplado de outras fatias */
export function useObrasSelect() {
  return useQuery({
    queryKey: ["obras", "select"],
    queryFn: async () => {
      const { data } = await api.get<ListaObrasFinanceiro>("/obras", {
        params: { pageSize: 100 },
      });
      return data;
    },
    staleTime: 1000 * 60 * 5, // 5 minutos
  });
}

export function useLinkRelatorioDemonstracao() {
  return useMutation({
    mutationFn: (filtros: FiltrosRelatorioDemonstracao) => gerarLinkRelatorioDemonstracao(filtros),
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
