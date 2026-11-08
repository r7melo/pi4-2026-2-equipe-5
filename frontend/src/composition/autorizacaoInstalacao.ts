import { useAuthStore } from "@/features/auth/stores/useAuthStore";

// Mesma duração do singleton de autenticação. Registrar antes de consumidores React:
// transições intermediárias também invalidam o sinal, mesmo quando agrupadas no render.
let controlador = new AbortController();
let snapshot = { geracao: 0, signal: controlador.signal };
const assinantes = new Set<() => void>();
useAuthStore.subscribe((atual, anterior) => {
  if (atual.token === anterior.token && atual.usuario === anterior.usuario && atual.expiresAt === anterior.expiresAt) return;
  const antigo = controlador;
  controlador = new AbortController();
  snapshot = { geracao: snapshot.geracao + 1, signal: controlador.signal };
  antigo.abort();
  assinantes.forEach((avisar) => avisar());
});
export const lerAutorizacaoInstalacao = () => snapshot;
export function assinarAutorizacaoInstalacao(avisar: () => void): () => void {
  assinantes.add(avisar);
  return () => { assinantes.delete(avisar); };
}
