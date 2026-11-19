import { useCallback, useEffect, useRef } from "react";
import { capturarSessaoOperacional, sessaoOperacionalVigente } from "@/shared/lib/sessaoOperacao";

/** A sessão pode continuar válida depois que um formulário foi desmontado. */
export function useContextoUsuario() {
  const montagem = useRef<object | null>({});
  useEffect(() => {
    montagem.current = {};
    return () => { montagem.current = null; };
  }, []);
  return useCallback(() => {
    const identidade = montagem.current;
    const sessao = capturarSessaoOperacional();
    return () => identidade !== null && identidade === montagem.current && sessaoOperacionalVigente(sessao);
  }, []);
}
