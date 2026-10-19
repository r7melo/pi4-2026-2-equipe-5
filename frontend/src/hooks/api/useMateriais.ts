import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { listarMateriais, registrarMaterial } from "@/services/materiais";
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
    mutationFn: ({ obraId, payload }: { obraId: number; payload: CriarMaterialPayload | Omit<Material, "id" | "obraId"> }) =>
      registrarMaterial(obraId, payload),
    onSuccess: (_, variables) => {
      void queryClient.invalidateQueries({ queryKey: ["materiais", variables.obraId] });
      toast.success("Material registrado com sucesso");
    },
    onError: () => {
      toast.error("Erro ao registrar material");
    },
  });
}
