import { api } from "@/shared/api/api";
import type { ClienteCadastro } from "@/types";
export async function listarClientesDemonstracao(): Promise<ClienteCadastro[]> {
  const { data } = await api.get<{ itens: ClienteCadastro[] }>("/clientes");
  return data.itens;
}
