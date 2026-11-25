// Contratos compartilhados de Gestão de Clientes (RF-23, UC-08, Rotas #10, #10a, #10b, #11)
export interface Cliente {
  id: number;
  nome: string;
  cpfCnpj: string;
  cidade?: string | null;
  endereco?: string | null;
  telefone?: string | null;
  email?: string | null;
  dadosContrato?: string | null;
  quantidadeObras?: number;
}

export interface CriarClientePayload {
  nome: string;
  cpfCnpj: string;
  cidade?: string | null;
  endereco?: string | null;
  telefone?: string | null;
  email?: string | null;
  dadosContrato?: string | null;
}

export type EditarClientePayload = Partial<CriarClientePayload>;

export interface FiltroClientesParams {
  nome?: string;
  page?: number;
  pageSize?: number;
}

export interface ListaClientesResposta {
  page: number;
  pageSize: number;
  total: number;
  itens: Cliente[];
}
