import { z } from "zod";
import type { DadosInstalacao, FormatoExportacaoInstalacao, FaltanteInstalacao } from "@/types";

const id = z.number().int().positive();
const texto = z.string().nullish();
export const obraInstalacaoSchema = z.object({
  id, cliente: z.object({ nome: z.string() }), endereco: texto, descricao: texto,
});
export const materiaisInstalacaoSchema = z.array(z.object({
  id, obraId: id.optional(), nome: texto, descricao: texto, tipo: texto,
  quantidade: z.number().nullish(), unidade: texto,
}));
export const programacoesInstalacaoSchema = z.array(z.object({
  id, obraId: id, equipeId: id.nullish(), dataInicio: texto, dataFim: texto,
}));
export const equipesInstalacaoSchema = z.array(z.object({ id, nome: texto }));

export type EstadoExportacao =
  | { fase: "ocioso"; tentativa: number }
  | { fase: "verificando"; tentativa: number; formato: FormatoExportacaoInstalacao }
  | { fase: "confirmando"; tentativa: number; formato: FormatoExportacaoInstalacao; dados: DadosInstalacao; faltantes: FaltanteInstalacao[] }
  | { fase: "gerando"; tentativa: number; formato: FormatoExportacaoInstalacao }
  | { fase: "erro"; tentativa: number; formato: FormatoExportacaoInstalacao; mensagem: string };

export interface ExportarDetalhesInstalacaoProps {
  obraId: number;
  contextoValido: () => boolean;
  sinalContexto?: AbortSignal;
}

export interface ErroExportacaoInstalacao {
  status: number;
  codigo: string | null;
  mensagem: string;
}
