export { novaObraSchema } from "@/shared/types/obrasCadastro";
export type { NovaObraInput, NovaObraFormData } from "@/shared/types/obrasCadastro";

export interface ClienteNovoPayload {
  nome: string;
  cpfCnpj: string;
  cidade?: string;
  endereco?: string;
  telefone?: string;
  email?: string;
  dadosContrato?: string;
}

export interface CriarObraPayload {
  clienteId?: number;
  cliente?: ClienteNovoPayload;
  clienteNome?: string;
  cidade?: string;
  quantidadePaineis: number;
  quantidadeInversores?: number;
  dataInicioEstimada: string;
  dataFimEstimada: string;
  pagamento: {
    prazoContratualDias: number;
    dataConfirmacao?: string;
  };
  endereco?: string;
  categoria?: string;
}

export interface ObraCriadaResposta {
  id: number;
  status: string;
  clienteId: number;
  dataInicioEstimada: string;
  dataFimEstimada: string;
  dataInicioReal?: string | null;
  dataFimReal?: string | null;
  criadoEm?: string;
}

