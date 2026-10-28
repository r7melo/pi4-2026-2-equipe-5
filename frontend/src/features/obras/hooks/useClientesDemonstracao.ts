import { useQuery } from "@tanstack/react-query";
import { MOCK_ATIVO } from "@/shared/lib/modoApi";
import { listarClientesDemonstracao } from "../services/clientes";
export function useClientesDemonstracao() {
  return useQuery({ queryKey: ["clientes", "demonstracao"], queryFn: listarClientesDemonstracao, enabled: MOCK_ATIVO });
}
