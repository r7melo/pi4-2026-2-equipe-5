import { useSyncExternalStore } from "react";
import { assinarSessaoOperacional, capturarSessaoOperacional } from "@/shared/lib/sessaoOperacao";

export function useSessaoUsuarios() {
  return useSyncExternalStore(assinarSessaoOperacional, capturarSessaoOperacional);
}
