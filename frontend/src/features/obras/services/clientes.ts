import { api } from "@/shared/api/api";
import type { ClienteCadastro } from "../types/clientes";

export async function listarClientes(): Promise<ClienteCadastro[]> {
  const { data } = await api.get<{ itens: ClienteCadastro[] }>("/clientes", {
    params: { pageSize: 100 },
  });
  return data.itens;
}

