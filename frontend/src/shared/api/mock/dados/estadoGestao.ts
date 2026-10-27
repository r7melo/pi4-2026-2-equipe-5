import { EMAIL_USUARIO } from "@/shared/constants/emailUsuario";
import { z } from "zod";

export const CHAVE_GESTAO = "mock_gestao_usuarios_v1";
const id = z.number().int().positive().refine(Number.isSafeInteger);
export const equipeGestaoSchema = z.object({
  id, nome: z.string().min(1), especialidade: z.string().optional(),
  responsavelId: id.optional(), responsavelNome: z.string().optional(),
  membros: z.array(z.object({ id, nome: z.string(), email: z.string().optional() })).optional(),
}).passthrough();
export const contaGestaoSchema = z.object({
  id, nome: z.string().trim().min(3).max(200), email: z.string().max(200).regex(EMAIL_USUARIO),
  perfil: z.enum(["Administrador", "Engenharia", "Financeiro", "InstaladorCampo"]),
  equipeId: id.nullable(), ativo: z.boolean(),
});
const schema = z.object({
  versao: z.literal(1), operacionais: z.record(z.string(), id), novos: z.array(contaGestaoSchema.extend({ senhaHash: z.string().regex(/^[a-f0-9]{64}$/) })), contas: z.record(z.string(), contaGestaoSchema),
  revisoes: z.record(z.string(), z.string().min(1)),
  acessos: z.record(z.string(), z.number().int().nonnegative().refine(Number.isSafeInteger)),
  equipes: z.array(equipeGestaoSchema).nullable(), equipesRevisao: z.string(),
}).strict();
export type EstadoGestao = z.infer<typeof schema>;
export function lerGestao(): EstadoGestao {
  const raw = sessionStorage.getItem(CHAVE_GESTAO);
  return raw === null ? { versao: 1, operacionais: {}, novos: [], contas: {}, revisoes: {}, acessos: {}, equipes: null, equipesRevisao: "0" } : schema.parse(JSON.parse(raw));
}
/** Uma única escrita confirma conta, vínculos e revogação. Nunca altera a chave de senha. */
export function gravarGestao(estado: EstadoGestao): void {
  sessionStorage.setItem(CHAVE_GESTAO, JSON.stringify(schema.parse(estado)));
}
export function revisaoAcesso(email: string): number { return lerGestao().acessos[email] ?? 0; }
