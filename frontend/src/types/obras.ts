// Tipos do domínio Obra (RF-03, RF-04)
import { z } from "zod";
import type { StatusObra } from "@/constants/kanbanStatus";

export interface Obra {
  id: string;
  nome: string;
}

export interface ObraCard {
  id: number;
  status: StatusObra;
  clienteNome: string;
  categoria: string;
  quantidadePaineis: number;
  dataFimEstimada: string;
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
  clienteId: number;
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

/** Payload para alocar equipe a uma obra (Contrato Rota #15 / RF-08) */
export interface CriarProgramacaoPayload {
  obraId: number;
  equipeId: number;
  dataInicio: string; // ISO (yyyy-MM-dd)
  dataFim?: string;    // ISO exclusiva (yyyy-MM-dd) — opcional; se omitida, calcula por ~9 painéis/dia
  prioridade?: number;
}

