import { useEffect, useRef, useSyncExternalStore } from "react";
import { useMutation } from "@tanstack/react-query";
import { assinarSessaoOperacional, capturarSessaoOperacional } from "@/shared/lib/sessaoOperacao";

export function useGeracaoSenha() {
  return useSyncExternalStore(assinarSessaoOperacional, capturarSessaoOperacional, capturarSessaoOperacional);
}

/** Nenhum payload sensível é variável de mutação ou parte de sua chave/cache. */
export function useOperacaoSenha<T>() {
  const tarefa = useRef<(() => Promise<T>) | null>(null);
  const controle = useRef<AbortController | null>(null);
  const montado = useRef(false);
  const origem = useRef(capturarSessaoOperacional());
  const mutation = useMutation<T, Error, void>({
    mutationKey: ["operacaoSenha"], retry: false, networkMode: "always", gcTime: 0,
    mutationFn: () => {
      const executar = tarefa.current;
      tarefa.current = null;
      if (!executar) throw new Error("Operação indisponível.");
      return executar();
    },
  });
  const { mutateAsync, reset } = mutation;
  useEffect(() => {
    montado.current = true;
    return () => { montado.current = false; controle.current?.abort(); tarefa.current = null; };
  }, []);
  const executar = async (operacao: (signal: AbortSignal) => Promise<T>) => {
    if (controle.current) return undefined;
    const controller = new AbortController();
    controle.current = controller;
    origem.current = capturarSessaoOperacional();
    tarefa.current = () => operacao(controller.signal);
    try {
      const resultado = await mutateAsync();
      return montado.current && !controller.signal.aborted && origem.current === capturarSessaoOperacional() ? resultado : undefined;
    } finally {
      tarefa.current = null;
      controle.current = null;
      if (montado.current) reset();
    }
  };
  return { executar, pendente: mutation.isPending, vigente: () => montado.current && origem.current === capturarSessaoOperacional() && !controle.current?.signal.aborted };
}
