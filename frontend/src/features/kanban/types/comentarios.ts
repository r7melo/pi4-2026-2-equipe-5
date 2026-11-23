import { z } from "zod";

export const TIPOS_COMENTARIO = ["Cartao", "Manutencao", "Timeline"] as const;
export type TipoComentario = typeof TIPOS_COMENTARIO[number];
export const ROTULOS_COMENTARIO: Record<TipoComentario, string> = {
  Cartao: "Gestão da obra", Manutencao: "Manutenção", Timeline: "Linha do tempo",
};
export const comentarioSchema = z.object({
  id: z.number().int().positive(), tipo: z.enum(TIPOS_COMENTARIO).default("Cartao"),
  descricao: z.string(), dataRegistro: z.string(),
  usuario: z.object({ id: z.number().int().nonnegative(), nome: z.string() }),
});
export type ComentarioResposta = z.infer<typeof comentarioSchema>;
export interface ContextoComentario { origem: number }
export const erroComentarioSchema = z.object({ error: z.object({ code: z.string(), message: z.string() }) });
export type AlteracaoComentario =
  | { acao: "criar"; descricao: string; tipo: TipoComentario }
  | { acao: "editar"; id: number; descricao: string }
  | { acao: "excluir"; id: number };
