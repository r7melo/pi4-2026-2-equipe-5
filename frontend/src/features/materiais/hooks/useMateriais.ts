import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMutacaoSessao as useMutation } from "@/shared/hooks/useMutacaoSessao";
import { deveExibirErroLocal } from "@/shared/lib/sessaoOperacao";
import {
  listarMateriais,
  registrarMaterial,
  atualizarStatusMaterial,
  atualizarDadosMaterial,
  excluirMaterial,
} from "@/features/materiais/services/materiais";
import type { Material, CriarMaterialPayload, StatusLogistico, AtualizarMaterialPayload } from "@/types";
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
    mutationFn: (
      { obraId, payload }: { obraId: number; payload: CriarMaterialPayload | Omit<Material, "id" | "obraId"> },
      sessao
    ) => registrarMaterial(obraId, payload, sessao),
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

export function useAtualizarStatusMaterial() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (
      { id, statusLogistico }: { id: number; statusLogistico: StatusLogistico; obraId: number },
      sessao
    ) => atualizarStatusMaterial(id, statusLogistico, sessao),
    onSuccess: (_, variables) => {
      void queryClient.invalidateQueries({ queryKey: ["materiais", variables.obraId] });
      toast.success("Status logístico atualizado com sucesso");
    },
    onError: (erro) => {
      if (!deveExibirErroLocal(erro)) return;
      toast.error("Erro ao atualizar status logístico");
    },
  });
}

export function useAtualizarDadosMaterial() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (
      { id, payload }: { id: number; payload: AtualizarMaterialPayload; obraId: number },
      sessao
    ) => atualizarDadosMaterial(id, payload, sessao),
    onSuccess: (_, variables) => {
      void queryClient.invalidateQueries({ queryKey: ["materiais", variables.obraId] });
      toast.success("Insumo atualizado com sucesso");
    },
    onError: (erro) => {
      if (!deveExibirErroLocal(erro)) return;
      toast.error("Erro ao atualizar insumo");
    },
  });
}

export function useExcluirMaterial() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (
      { id }: { id: number; obraId: number },
      sessao
    ) => excluirMaterial(id, sessao),
    onSuccess: (_, variables) => {
      void queryClient.invalidateQueries({ queryKey: ["materiais", variables.obraId] });
      toast.success("Material removido com sucesso");
    },
    onError: (erro) => {
      if (!deveExibirErroLocal(erro)) return;
      toast.error("Erro ao remover material");
    },
  });
}
