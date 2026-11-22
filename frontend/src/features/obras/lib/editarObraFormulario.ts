import { z } from "zod";
import type { ObraDetalhe } from "../types/obras";

export const editarObraFormSchema = z.object({
  cidade: z.string().trim().min(2, "Informe ao menos 2 caracteres para a cidade"),
  endereco: z.string().trim().min(3, "Informe um endereço válido"),
  categoria: z.enum(["Residencial", "Comercial"]),
  quantidadePaineis: z
    .number({ error: "Informe a quantidade de painéis" })
    .int("Deve ser um número inteiro")
    .positive("A quantidade deve ser maior que zero"),
  quantidadeInversores: z
    .number({ error: "Informe a quantidade de inversores" })
    .int("Deve ser um número inteiro")
    .min(0, "A quantidade não pode ser negativa"),
  prazoContratualDias: z
    .number({ error: "Informe o prazo contratual" })
    .int("Deve ser um número inteiro")
    .positive("O prazo contratual deve ser de ao menos 1 dia"),
  dataInicioEstimada: z.string().optional(),
  dataFimEstimada: z.string().optional(),
  descricao: z.string().optional(),
});

export type EditarObraFormData = z.infer<typeof editarObraFormSchema>;

/** Mapeia os dados da obra para os valores iniciais do formulário de edição. */
export function mapearValoresFormularioObra(obra: ObraDetalhe): EditarObraFormData {
  return {
    cidade: obra.cliente?.cidade || "",
    endereco: obra.endereco || "",
    categoria: obra.categoria === "Comercial" ? "Comercial" : "Residencial",
    quantidadePaineis: obra.quantidadePaineis ?? 1,
    quantidadeInversores: obra.quantidadeInversores ?? 1,
    prazoContratualDias: obra.pagamento?.prazoContratualDias ?? 30,
    dataInicioEstimada: obra.dataInicioEstimada ? obra.dataInicioEstimada.split("T")[0] : "",
    dataFimEstimada: obra.dataFimEstimada ? obra.dataFimEstimada.split("T")[0] : "",
    descricao: obra.descricao || "",
  };
}
