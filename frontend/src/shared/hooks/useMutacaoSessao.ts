import { useMutation, type MutateOptions } from "@tanstack/react-query";
import type { OpcoesMutacaoSessao, VariaveisSessao } from "@/shared/types/autorizacao";
import { capturarSessaoOperacional, erroDaSessaoAnterior, exigirSessaoOperacional } from "@/shared/lib/sessaoOperacao";

/** Captura antes de onMutate/await; protege os callbacks do hook e da chamada. */
export function useMutacaoSessao<D, V, C = unknown>(opcoes: OpcoesMutacaoSessao<D, V, C>) {
  const { onMutate } = opcoes;
  const mutacao = useMutation<D, Error, VariaveisSessao<V>, C>({
    ...opcoes,
    mutationFn: ({ dados, sessao }) => {
      exigirSessaoOperacional(sessao);
      return opcoes.mutationFn(dados, sessao);
    },
    onMutate: onMutate ? ({ dados, sessao }, contexto) => onMutate(dados, contexto, sessao) : undefined,
    onSuccess: (resultado, { dados }, anterior, contexto) => opcoes.onSuccess?.(resultado, dados, anterior, contexto),
    onError: (erro, { dados }, anterior, contexto) => {
      if (!erroDaSessaoAnterior(erro)) return opcoes.onError?.(erro, dados, anterior, contexto);
    },
    onSettled: (resultado, erro, { dados }, anterior, contexto) => {
      if (!erroDaSessaoAnterior(erro)) return opcoes.onSettled?.(resultado, erro, dados, anterior, contexto);
    },
  });

  function callbacks(locais?: MutateOptions<D, Error, V, C>): MutateOptions<D, Error, VariaveisSessao<V>, C> {
    return {
      onSuccess: (resultado, { dados }, anterior, contexto) => locais?.onSuccess?.(resultado, dados, anterior, contexto),
      onError: (erro, { dados }, anterior, contexto) => {
        if (!erroDaSessaoAnterior(erro)) locais?.onError?.(erro, dados, anterior, contexto);
      },
      onSettled: (resultado, erro, { dados }, anterior, contexto) => {
        if (!erroDaSessaoAnterior(erro)) locais?.onSettled?.(resultado, erro, dados, anterior, contexto);
      },
    };
  }

  return {
    ...mutacao,
    variables: mutacao.variables?.dados,
    mutate: (dados: V, locais?: MutateOptions<D, Error, V, C>, sessao = capturarSessaoOperacional()) =>
      mutacao.mutate({ dados, sessao }, callbacks(locais)),
    mutateAsync: (dados: V, locais?: MutateOptions<D, Error, V, C>, sessao = capturarSessaoOperacional()) =>
      mutacao.mutateAsync({ dados, sessao }, callbacks(locais)),
  };
}
