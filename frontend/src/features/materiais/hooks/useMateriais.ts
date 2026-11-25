import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMutacaoSessao as useMutation } from "@/shared/hooks/useMutacaoSessao";
import { capturarSessaoOperacional, exigirSessaoOperacional } from "@/shared/lib/sessaoOperacao";
import {
  listarMateriais,
  listarProdutosCatalogoAtivos,
  buscarContextoObra,
  registrarMaterial,
  atualizarStatusMaterial,
  atualizarDadosMaterial,
  excluirMaterial,
} from "../services/materiais";
import type { CriarMaterialPayload } from "@/shared/types/materiais";
import type {
  AlterarMaterial,
  AlterarStatusMaterial,
  LoteMateriais,
} from "../types/gestaoMateriais";

function useInvalidarMateriais() {
  const queryClient = useQueryClient();
  // O prefixo ["materiais"] sincroniza quadro Kanban, painel lateral e /obras/:id/materiais.
  return () => queryClient.invalidateQueries({ queryKey: ["materiais"] });
}

export function useMateriais(obraId: number) {
  return useQuery({
    queryKey: ["materiais", obraId],
    queryFn: ({ signal }) => listarMateriais(obraId, undefined, signal),
    staleTime: 1000 * 30,
    enabled: obraId > 0,
  });
}

export function useProdutosCatalogoAtivos(habilitado = true) {
  const sessao = capturarSessaoOperacional();
  return useQuery({
    queryKey: ["materiais", "catalogo-ativos", sessao],
    queryFn: ({ signal }) => listarProdutosCatalogoAtivos(sessao, signal),
    staleTime: 1000 * 60,
    enabled: habilitado && sessao > 0,
  });
}

/** Hook autônomo para metadados da obra no módulo de materiais */
export function useObraContextoMateriais(obraId: number) {
  return useQuery({
    queryKey: ["obra-contexto-materiais", obraId],
    queryFn: ({ signal }) => buscarContextoObra(obraId, undefined, signal),
    staleTime: 1000 * 60 * 5,
    enabled: obraId > 0,
  });
}

export function useAdicionarMaterial() {
  const invalidar = useInvalidarMateriais();

  return useMutation({
    mutationKey: ["materiais"],
    mutationFn: async (
      { obraId, payload }: { obraId: number; payload: CriarMaterialPayload },
      sessao
    ) => {
      const data = await registrarMaterial(obraId, payload, sessao);
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
    mutationFn: async (
      { id, statusLogistico, quantidadeUtilizada }: AlterarStatusMaterial,
      sessao
    ) => {
      const data = await atualizarStatusMaterial(id, statusLogistico, sessao, quantidadeUtilizada);
      exigirSessaoOperacional(sessao);
      return data;
    },
    onSuccess: invalidar,
  });
}

export function useAtualizarDadosMaterial() {
  const invalidar = useInvalidarMateriais();

  return useMutation({
    mutationKey: ["materiais"],
    mutationFn: async ({ id, payload }: AlterarMaterial, sessao) => {
      const data = await atualizarDadosMaterial(id, payload, sessao);
      exigirSessaoOperacional(sessao);
      return data;
    },
    onSuccess: invalidar,
  });
}

export function useExcluirMaterial() {
  const invalidar = useInvalidarMateriais();

  return useMutation({
    mutationKey: ["materiais"],
    mutationFn: async ({ id }: { id: number; obraId: number }, sessao) => {
      await excluirMaterial(id, sessao);
      exigirSessaoOperacional(sessao);
    },
    onSuccess: invalidar,
  });
}

export function useLoteMateriais() {
  const invalidar = useInvalidarMateriais();

  return useMutation({
    mutationKey: ["materiais"],
    mutationFn: async (lote: LoteMateriais, sessao) => {
      const resultados = await Promise.allSettled(
        lote.ids.map((id) =>
          lote.acao === "excluir"
            ? excluirMaterial(id, sessao)
            : atualizarStatusMaterial(id, lote.statusLogistico, sessao)
        )
      );
      exigirSessaoOperacional(sessao);
      return resultados;
    },
    onSuccess: invalidar,
  });
}
