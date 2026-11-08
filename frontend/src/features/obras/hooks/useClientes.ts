import { useQuery } from "@tanstack/react-query";
import { listarClientes } from "../services/clientes";

export function useClientes() {
  return useQuery({
    queryKey: ["clientes"],
    queryFn: listarClientes,
  });
}

// Retrocompatibilidade
export const useClientesDemonstracao = useClientes;
