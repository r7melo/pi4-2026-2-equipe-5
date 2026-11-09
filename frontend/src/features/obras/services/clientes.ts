import { api } from "@/shared/api/api";
import type { ClienteCadastro } from "@/types";

export async function listarClientes(): Promise<ClienteCadastro[]> {
  const { data } = await api.get<{ itens: ClienteCadastro[] }>("/clientes");
  return data.itens;
}

// Retrocompatibilidade
export const listarClientesDemonstracao = listarClientes;
