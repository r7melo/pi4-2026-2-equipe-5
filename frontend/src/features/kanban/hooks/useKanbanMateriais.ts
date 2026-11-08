import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMutacaoSessao as useMutation } from "@/shared/hooks/useMutacaoSessao";
import { exigirSessaoOperacional } from "@/shared/lib/sessaoOperacao";
import { listarMateriais, registrarMaterial, atualizarMaterial, atualizarStatusMaterial, removerMaterial } from "../services/kanbanMateriais";
import type { CriarMaterialPayload } from "@/types";
import type { AlterarMaterial, AlterarStatusMaterial, ExcluirMaterial, LoteMateriais } from "../types/gestaoMateriais";

export function useMateriais(obraId: number) {
  return useQuery({ queryKey: ["materiais", obraId], queryFn: ({ signal }) => listarMateriais(obraId, undefined, signal), staleTime: 30_000, enabled: obraId > 0 });
}

function useInvalidarMateriais() {
  const client = useQueryClient();
  // O prefixo também cobre ["materiais", obraId], inclusive outros consumidores.
  return () => client.invalidateQueries({ queryKey: ["materiais"] });
}
export function useAdicionarMaterial() {
  const invalidar = useInvalidarMateriais();
  return useMutation({
    mutationKey: ["materiais"],
    mutationFn: async ({ obraId, payload }: { obraId: number; payload: CriarMaterialPayload }, sessao) => {
      const data = await registrarMaterial(obraId, payload, sessao);
      exigirSessaoOperacional(sessao);
      return data;
    },
    onSuccess: invalidar,
  });
}
export function useAtualizarMaterial() {
  const invalidar = useInvalidarMateriais();
  return useMutation({
    mutationKey: ["materiais"],
    mutationFn: async ({ id, payload }: AlterarMaterial, sessao) => {
      const data = await atualizarMaterial(id, payload, sessao);
      exigirSessaoOperacional(sessao);
      return data;
    },
    onSuccess: invalidar,
  });
}
export function useAtualizarStatusMaterial() {
  const invalidar = useInvalidarMateriais();
  return useMutation({
    mutationKey: ["materiais"],
    mutationFn: async ({ id, statusLogistico }: AlterarStatusMaterial, sessao) => {
      const data = await atualizarStatusMaterial(id, statusLogistico, sessao);
      exigirSessaoOperacional(sessao);
      return data;
    },
    onSuccess: invalidar,
  });
}
export function useLoteMateriais() {
  const invalidar = useInvalidarMateriais();
  return useMutation({
    mutationKey: ["materiais"],
    mutationFn: async (lote: LoteMateriais, sessao) => {
      const resultados = await Promise.allSettled(lote.ids.map(id => lote.acao === "excluir"
        ? removerMaterial(id, sessao)
        : atualizarStatusMaterial(id, lote.statusLogistico, sessao)));
      exigirSessaoOperacional(sessao);
      return resultados;
    },
    onSuccess: invalidar,
  });
}
export function useRemoverMaterial() {
  const invalidar = useInvalidarMateriais();
  return useMutation({
    mutationKey: ["materiais"],
    mutationFn: async ({ id }: ExcluirMaterial, sessao) => {
      await removerMaterial(id, sessao);
      exigirSessaoOperacional(sessao);
    },
    onSuccess: invalidar,
  });
}
