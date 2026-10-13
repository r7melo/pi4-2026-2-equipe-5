// Tipos do domínio Obra (RF-03, RF-04, RF-17)
import { z } from "zod";
import type { StatusObra } from "@/constants/kanbanStatus";

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
  potenciaKwp?: number;
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

export interface MoverStatusResposta {
  id: number;
  statusAnterior: string;
  statusNovo: string;
  dataAlteracao: string;
  emailNotificacaoEnviado: boolean;
}

export const novaObraSchema = z
  .object({
    clienteNome: z.string().min(3, "Nome do cliente deve ter no mínimo 3 caracteres"),
    cidade: z.string().min(2, "Cidade deve ter no mínimo 2 caracteres"),
    quantidadePaineis: z.coerce
      .number()
      .min(1, "Quantidade de painéis deve ser maior que zero"),
    dataInicioEstimada: z.string().min(1, "Data de início estimada é obrigatória"),
    dataFimEstimada: z.string().min(1, "Data de término estimada é obrigatória"),
    pagamento: z.object({
      prazoContratualDias: z.coerce
        .number()
        .min(1, "Prazo contratual deve ser maior que zero"),
    }),
  })
  .refine(
    (data) => {
      if (!data.dataInicioEstimada || !data.dataFimEstimada) return true;
      return new Date(data.dataFimEstimada) >= new Date(data.dataInicioEstimada);
    },
    {
      message: "Data Final menor que Data Inicial",
      path: ["dataFimEstimada"],
    }
  );

export type NovaObraInput = z.input<typeof novaObraSchema>;
export type NovaObraFormData = z.infer<typeof novaObraSchema>;

export interface CriarObraPayload {
  clienteNome: string;
  cidade: string;
  quantidadePaineis: number;
  dataInicioEstimada: string;
  dataFimEstimada: string;
  pagamento: {
    prazoContratualDias: number;
  };
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

/** Dados de homologação da concessionária (Contrato Rota #17 / RF-17) */
export interface DadosHomologacao {
  obraId: number;
  parecerAcesso: "Aprovado" | "Pendente" | "EmAnalise" | "Reprovado";
  artTrt?: string;
  prazoVistoria?: string;
  atualizadoEm?: string;
}

/** Detalhamento completo da obra para tela de Detalhe e Drawer (Rota #5) */
export interface ObraDetalhe {
  id: number;
  status: StatusObra;
  dataInicioEstimada: string;
  dataFimEstimada: string;
  dataInicioReal: string | null;
  dataFimReal: string | null;
  cliente: {
    id: number;
    nome: string;
    cidade: string;
  };
  pagamento: {
    id: number;
    dataConfirmacao: string;
    prazoContratualDias: number;
  };
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
