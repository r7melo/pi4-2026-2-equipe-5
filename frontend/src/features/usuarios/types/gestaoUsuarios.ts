import { EMAIL_USUARIO } from "@/shared/constants/emailUsuario";
import { z } from "zod";
import { NOMES_PERFIS } from "@/shared/constants/perfis";
const id = z.number().int().positive().refine(Number.isSafeInteger);
export const usuarioItemSchema = z.object({
  id,
  nome: z.string().min(1),
  email: z.string().max(200).regex(EMAIL_USUARIO),
  perfil: z.enum(NOMES_PERFIS),
  equipeId: id.nullable().optional(),
  equipeNome: z.string().nullable().optional(),
  ativo: z.boolean(),
  revisao: z.string().min(1).optional(),
});
export const usuariosRespostaSchema = z.object({ page: id, pageSize: id.max(100), total: z.number().int().nonnegative(), itens: z.array(usuarioItemSchema) });
export type UsuariosResposta = z.infer<typeof usuariosRespostaSchema>;
export type UsuarioItem = z.infer<typeof usuarioItemSchema>;
export interface FiltrosUsuarios { page: number; pageSize: number; busca: string; perfil?: UsuarioItem["perfil"]; ativo: "true" | "false" | "todos" }
export interface EditarUsuario { nome: string; email: string; perfil: UsuarioItem["perfil"]; revisao?: string }
export interface StatusUsuario { ativo: boolean; revisao?: string }
export interface UsuariosProps { usuarioId: number }
export interface FormularioCadastroProps { onConcluido?: () => void; onSemPermissao?: () => void; onOcupado?: (ocupado: boolean) => void; emModal?: boolean; onCancelar?: () => void }
export interface EditorUsuarioProps { usuario: UsuarioItem; proprio: boolean; onFechar: () => void; onConcluido: () => void }
export interface StatusUsuarioProps { usuario: UsuarioItem; onFechar: () => void; onConcluido: () => void }

export const erroGestaoSchema = z.object({ error: z.object({ code: z.string(), message: z.string().optional() }) });
export const statusRespostaSchema = z.object({
  id,
  ativo: z.boolean(),
  revisao: z.string().min(1).optional(),
}).passthrough();
