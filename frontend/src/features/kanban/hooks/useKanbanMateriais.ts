import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMutacaoSessao as useMutation } from "@/shared/hooks/useMutacaoSessao";
import { deveExibirErroLocal } from "@/shared/lib/sessaoOperacao";
import {
  listarMateriais,
  registrarMaterial,
  atualizarMaterial,
  atualizarStatusMaterial,
  removerMaterial,
} from "@/features/kanban/services/kanbanMateriais";
import type { Material, CriarMaterialPayload, StatusLogistico } from "@/types";
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
      void queryClient.invalidateQueries({ queryKey: ["materiais"] });
      toast.success("Material registrado com sucesso");
    },
    onError: (erro) => {
      if (!deveExibirErroLocal(erro)) return;
      toast.error("Erro ao registrar material");
    },
  });
}

export function useAtualizarMaterial() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Partial<Omit<Material, "id" | "obraId">> }, sessao) =>
      atualizarMaterial(id, payload, sessao),
    onSuccess: (data) => {
      if (data?.obraId) {
        void queryClient.invalidateQueries({ queryKey: ["materiais", data.obraId] });
      }
      void queryClient.invalidateQueries({ queryKey: ["materiais"] });
    },
    onError: (erro) => {
      if (!deveExibirErroLocal(erro)) return;
      toast.error("Erro ao atualizar material");
    },
  });
}

export function useAtualizarStatusMaterial() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, statusLogistico, obraId: _obraId }: { id: number; statusLogistico: StatusLogistico; obraId?: number }, sessao) =>
      atualizarStatusMaterial(id, statusLogistico, sessao),
    onSuccess: (data, variables) => {
      const oid = data?.obraId || variables.obraId;
      if (oid) {
        void queryClient.invalidateQueries({ queryKey: ["materiais", oid] });
      }
      void queryClient.invalidateQueries({ queryKey: ["materiais"] });
    },
    onError: (erro) => {
      if (!deveExibirErroLocal(erro)) return;
      toast.error("Erro ao alterar status do material");
    },
  });
}

export function useRemoverMaterial() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, obraId: _obraId }: { id: number; obraId: number }, sessao) =>
      removerMaterial(id, sessao),
    onSuccess: (_, variables) => {
      void queryClient.invalidateQueries({ queryKey: ["materiais", variables.obraId] });
      void queryClient.invalidateQueries({ queryKey: ["materiais"] });
      toast.success("Material removido com sucesso");
    },
    onError: (erro) => {
      if (!deveExibirErroLocal(erro)) return;
      toast.error("Erro ao remover material");
    },
  });
}
