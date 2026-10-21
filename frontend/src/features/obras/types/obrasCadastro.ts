import { z } from "zod";
import { validarCpfCnpj, limparDocumento } from "@/shared/lib/validacoesDocumento";

export const novaObraSchema = z
  .object({
    tipoCliente: z.enum(["existente", "novo"]).default("existente"),
    clienteId: z.coerce.number().optional(),
    clienteNome: z.string().optional(),
    cpfCnpj: z.string().optional(),
    cidade: z.string().optional(),
    endereco: z.string().optional(),
    telefone: z.string().optional(),
    email: z.string().optional(),
    categoria: z.enum(["Residencial", "Comercial"]).default("Residencial"),
    quantidadePaineis: z.coerce
      .number()
      .min(1, "Quantidade de painéis deve ser maior que zero"),
    quantidadeInversores: z.coerce
      .number()
      .min(0, "Quantidade de inversores não pode ser negativa")
      .default(1),
    dataInicioEstimada: z.string().min(1, "Data de início estimada é obrigatória"),
    dataFimEstimada: z.string().min(1, "Data de término estimada é obrigatória"),
    pagamento: z.object({
      prazoContratualDias: z.coerce
        .number()
        .min(1, "Prazo contratual deve ser maior que zero"),
    }),
  })
  .superRefine((data, ctx) => {
    if (data.tipoCliente === "existente") {
      if (!data.clienteId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Selecione um cliente cadastrado",
          path: ["clienteId"],
        });
      }
    } else {
      if (!data.clienteNome || data.clienteNome.trim().length < 3) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Nome do cliente deve ter no mínimo 3 caracteres",
          path: ["clienteNome"],
        });
      }
      const docLimpo = limparDocumento(data.cpfCnpj || "");
      if (!docLimpo || (docLimpo.length !== 11 && docLimpo.length !== 14)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Informe um CPF (11 dígitos) ou CNPJ (14 dígitos)",
          path: ["cpfCnpj"],
        });
      } else if (!validarCpfCnpj(docLimpo)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "CPF ou CNPJ inválido: os dígitos verificadores não conferem",
          path: ["cpfCnpj"],
        });
      }
      if (!data.cidade || data.cidade.trim().length < 2) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Cidade deve ter no mínimo 2 caracteres",
          path: ["cidade"],
        });
      }
      if (!data.endereco || data.endereco.trim().length < 3) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Endereço deve ter no mínimo 3 caracteres",
          path: ["endereco"],
        });
      }
      if (data.email && data.email.trim().length > 0 && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email.trim())) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "E-mail com formato inválido",
          path: ["email"],
        });
      }
    }

    if (data.dataInicioEstimada && data.dataFimEstimada) {
      if (new Date(data.dataFimEstimada) < new Date(data.dataInicioEstimada)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Data Final menor que Data Inicial",
          path: ["dataFimEstimada"],
        });
      }
    }
  });

export type NovaObraInput = z.input<typeof novaObraSchema>;
export type NovaObraFormData = z.infer<typeof novaObraSchema>;

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

