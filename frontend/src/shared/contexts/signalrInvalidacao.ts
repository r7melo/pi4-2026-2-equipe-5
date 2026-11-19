import type { QueryClient } from "@tanstack/react-query";

export interface ReferenciaTemporizador {
  current: ReturnType<typeof setTimeout> | null;
}

export function limparTemporizador(timerRef: ReferenciaTemporizador): void {
  if (timerRef.current) {
    clearTimeout(timerRef.current);
    timerRef.current = null;
  }
}

/**
 * Reagenda a invalidação debounced enquanto houver mutações ativas em `["programacoes"]`,
 * evitando descarte silencioso de notificações remotas recebidas durante drag/reatribuição em voo.
 */
export function agendarInvalidacaoProgramacoes(
  queryClient: QueryClient,
  timerRef: ReferenciaTemporizador,
  atrasoMs = 100
): void {
  limparTemporizador(timerRef);
  timerRef.current = setTimeout(() => {
    if (queryClient.isMutating({ mutationKey: ["programacoes"] }) === 0) {
      timerRef.current = null;
      void queryClient.invalidateQueries({ queryKey: ["programacoes"] });
      void queryClient.invalidateQueries({ queryKey: ["equipes"] });
      void queryClient.invalidateQueries({ queryKey: ["obras"] });
    } else {
      agendarInvalidacaoProgramacoes(queryClient, timerRef, atrasoMs);
    }
  }, atrasoMs);
}
