import { useCallback, useLayoutEffect, useRef } from "react";
import { toast } from "sonner";
import {
  capturarSessaoOperacional,
  deveExibirErroLocal,
  sessaoOperacionalVigente,
  statusHttp,
} from "@/shared/lib/sessaoOperacao";

export const MENSAGEM_ERRO_403_MATERIAL = "Você não possui permissão para realizar esta ação.";

/**
 * Coordena vigência de sessão, ciclo de montagem e tradução de erro 403 local nos consumidores
 * de materiais sem bloquear operações independentes por linha quando usarTrava=false.
 */
export function useSessaoMontadaMaterial() {
  const montadoRef = useRef(true);
  const travaRef = useRef(false);

  useLayoutEffect(() => {
    montadoRef.current = true;
    return () => {
      montadoRef.current = false;
      travaRef.current = false;
    };
  }, []);

  const vigente = useCallback(
    (sessao: number) => montadoRef.current && sessaoOperacionalVigente(sessao),
    []
  );

  const iniciarOperacao = useCallback((usarTrava = true): number | undefined => {
    if (usarTrava && travaRef.current) return undefined;
    if (usarTrava) travaRef.current = true;
    return capturarSessaoOperacional();
  }, []);

  const liberarOperacao = useCallback(() => {
    travaRef.current = false;
  }, []);

  const informarErro = useCallback(
    (erro: unknown, sessao: number, mensagemPadrao: string) => {
      if (!vigente(sessao) || !deveExibirErroLocal(erro)) return;
      toast.error(statusHttp(erro) === 403 ? MENSAGEM_ERRO_403_MATERIAL : mensagemPadrao);
    },
    [vigente]
  );

  return {
    vigente,
    iniciarOperacao,
    liberarOperacao,
    informarErro,
  };
}
