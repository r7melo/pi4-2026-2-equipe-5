// Tipos do domínio Obra espelhados 1:1 com o Contrato C#
import type { StatusObra } from "@/shared/constants/kanbanStatus";

export type CategoriaObra = "Residencial" | "Comercial" | "Industrial" | "Rural" | "Manutenção";

export interface ObraCard {
  id: number;
  status: StatusObra;
  clienteNome: string;
  categoria: CategoriaObra;
  quantidadePaineis: number;
  dataFimEstimada: string;
  dataFimReal?: string;
  nome?: string;
  cidade?: string;
  uf?: string;
  endereco?: string;
  observacoes?: string;
  progressoGeral?: number;
  valorTotal?: number;
  atualizadoPor?: string;
  prazoContratualDias?: number;
}

export interface ListaObras {
  page: number;
  pageSize: number;
  total: number;
  itens: ObraCard[];
}

/** Dados de homologação da concessionária (RF-17) */
export interface DadosHomologacao {
  obraId: number;
  parecerAcesso: "Aprovado" | "Pendente" | "EmAnalise" | "Reprovado";
  artTrt?: string;
  prazoVistoria?: string;
  atualizadoEm?: string;
}

/** Detalhamento completo da obra para tela de Detalhe e Drawer (Rota #8 do Contrato Oficial 07-api) */
export interface ObraDetalhe {
  id: number;
  status: StatusObra;
  dataInicioEstimada: string;
  dataFimEstimada: string;
  dataInicioReal?: string | null;
  dataFimReal?: string | null;
  cliente: {
    id: number;
    nome: string;
    cidade?: string | null;
  };
  pagamento: {
    id: number;
    dataConfirmacao?: string | null;
    prazoContratualDias: number;
  };
  categoria?: string;
  endereco?: string;
  descricao?: string | null;
  quantidadePaineis?: number;
  quantidadeInversores?: number;
  valorTotal?: number;
}

export interface HistoricoObra {
  id: number;
  obraId: number;
  statusAnterior: string;
  statusNovo: string;
  dataAlteracao: string;
  observacao?: string;
  usuario: { id: number; nome: string };
}

export interface ComentarioObra {
  id: number;
  obraId: number;
  descricao: string;
  dataRegistro: string;
  usuario: { id: number; nome: string };
}

/** Payload para edição de obra (PUT /api/obras/{id} - Rota #9 do Contrato / UC-17) */
export interface EditarObraPayload {
  cidade?: string;
  categoria?: "Residencial" | "Comercial";
  quantidadePaineis?: number;
  quantidadeInversores?: number;
  endereco?: string;
  descricao?: string;
  dataInicioEstimada?: string;
  dataFimEstimada?: string;
  pagamento?: {
    prazoContratualDias?: number;
    dataConfirmacao?: string;
  };
}
