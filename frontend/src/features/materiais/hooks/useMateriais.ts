import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMutacaoSessao as useMutation } from "@/shared/hooks/useMutacaoSessao";
import { deveExibirErroLocal } from "@/shared/lib/sessaoOperacao";

import { listarMateriais, registrarMaterial } from "@/features/materiais/services/materiais";
import type { Material, CriarMaterialPayload } from "@/types";
import { toast } from "sonner";

export function useMateriais(obraId: number) {
  return useQuery({
    queryKey: ["materiais", obraId],
    queryFn: () => listarMateriais(obraId),
    staleTime: 1000 * 30,
    enabled: !!obraId,
  });
}

export function useAdicionarMaterial() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ obraId, payload }: { obraId: number; payload: CriarMaterialPayload | Omit<Material, "id" | "obraId"> }, sessao) =>
      registrarMaterial(obraId, payload, sessao),
    onSuccess: (_, variables) => {
      void queryClient.invalidateQueries({ queryKey: ["materiais", variables.obraId] });
      toast.success("Material registrado com sucesso");
    },
    onError: (erro) => {
      if (!deveExibirErroLocal(erro)) return;
      toast.error("Erro ao registrar material");
    },
  });
}
