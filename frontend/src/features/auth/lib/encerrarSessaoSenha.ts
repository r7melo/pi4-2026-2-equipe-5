import type { QueryClient } from "@tanstack/react-query";
import { sessaoOperacionalVigente } from "@/shared/lib/sessaoOperacao";
import { CHAVE_ROTA_RETORNO } from "@/shared/lib/rotasSessao";
import { useAuthStore } from "../stores/useAuthStore";

export function encerrarSessaoSenha(client: QueryClient, geracao: number): boolean {
  if (!sessaoOperacionalVigente(geracao)) return false;
  client.clear();
  try { sessionStorage.removeItem(CHAVE_ROTA_RETORNO); } catch { /* Saída independe de storage. */ }
  useAuthStore.getState().logout();
  return true;
}
