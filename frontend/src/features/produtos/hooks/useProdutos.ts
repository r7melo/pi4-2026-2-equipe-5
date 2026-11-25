import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMutacaoSessao } from "@/shared/hooks/useMutacaoSessao";
import { capturarSessaoOperacional } from "@/shared/lib/sessaoOperacao";
import type {
  CriarProdutoPayload,
  EditarProdutoPayload,
  FiltroProdutosParams,
} from "@/shared/types/produtos";
import { criarProduto, editarProduto, listarProdutos } from "../services/produtos";

function useInvalidarProdutos() {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: ["produtos"] });
  };
}

export function useProdutos(filtros: FiltroProdutosParams = {}) {
  const sessao = capturarSessaoOperacional();
  const chaveFiltros = {
    nome: filtros.nome?.trim() ?? "",
    tipo: filtros.tipo?.trim() ?? "",
    incluirInativos: Boolean(filtros.incluirInativos),
  };

  return useQuery({
    queryKey: ["produtos", chaveFiltros, sessao],
    queryFn: ({ signal }) => listarProdutos(chaveFiltros, sessao, signal),
    enabled: sessao > 0,
  });
}

export function useCriarProduto() {
  const invalidar = useInvalidarProdutos();
  return useMutacaoSessao({
    mutationKey: ["produtos", "criar"],
    mutationFn: (payload: CriarProdutoPayload, sessao) => criarProduto(payload, sessao),
    onSuccess: invalidar,
  });
}

export function useEditarProduto() {
  const invalidar = useInvalidarProdutos();
  return useMutacaoSessao({
    mutationKey: ["produtos", "editar"],
    mutationFn: (
      { id, payload }: { id: number; payload: EditarProdutoPayload },
      sessao
    ) => editarProduto(id, payload, sessao),
    onSuccess: invalidar,
  });
}
