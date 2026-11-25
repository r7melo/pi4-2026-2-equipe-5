import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMutacaoSessao } from "@/shared/hooks/useMutacaoSessao";
import { capturarSessaoOperacional } from "@/shared/lib/sessaoOperacao";
import {
  comentarManutencao,
  concluirManutencao,
  listarInstalacoes,
  listarManutencoesInstalador,
  obterDetalhesInstalacao,
} from "../services/instalador";
import type {
  ConcluirManutencaoPayload,
  CriarComentarioManutencaoPayload,
  InstalacaoDetalhe,
  InstalacaoItemResumo,
  ManutencaoInstalador,
  StatusManutencao,
} from "../types/instalador";

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
    queryFn: () =>
      obraId ? obterDetalhesInstalacao(obraId) : Promise.reject(new Error("ID de obra inválido")),
    enabled: typeof obraId === "number" && obraId > 0,
    staleTime: 1000 * 60, // 1 minuto
  });
}

export function useManutencoesInstalador(status?: StatusManutencao) {
  const sessao = capturarSessaoOperacional();
  return useQuery<ManutencaoInstalador[]>({
    queryKey: ["manutencoes-instalador", status ?? "todas", sessao],
    queryFn: ({ signal }) => listarManutencoesInstalador(status, sessao, signal),
    enabled: sessao > 0,
    staleTime: 1000 * 30,
  });
}

export function useConcluirManutencao() {
  const queryClient = useQueryClient();
  return useMutacaoSessao({
    mutationKey: ["manutencoes-instalador", "concluir"],
    mutationFn: (
      { id, payload }: { id: number; payload: ConcluirManutencaoPayload },
      sessao
    ) => concluirManutencao(id, payload, sessao),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["manutencoes-instalador"] });
    },
  });
}

export function useComentarManutencao() {
  const queryClient = useQueryClient();
  return useMutacaoSessao({
    mutationKey: ["manutencoes-instalador", "comentar"],
    mutationFn: (
      { id, payload }: { id: number; payload: CriarComentarioManutencaoPayload },
      sessao
    ) => comentarManutencao(id, payload, sessao),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["manutencoes-instalador"] });
    },
  });
}
