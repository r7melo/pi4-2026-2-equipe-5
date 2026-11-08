import { EMAIL_USUARIO } from "@/shared/constants/emailUsuario";
import { z } from "zod";
export const PERFIS_GESTAO = ["Administrador", "Engenharia", "Financeiro", "InstaladorCampo"] as const;
const id = z.number().int().positive().refine(Number.isSafeInteger);
export const usuarioItemSchema = z.object({ id, nome: z.string().min(1), email: z.string().max(200).regex(EMAIL_USUARIO), perfil: z.enum(PERFIS_GESTAO), equipeId: id.nullable(), equipeNome: z.string().nullable(), ativo: z.boolean(), revisao: z.string().min(1) });
export const usuariosRespostaSchema = z.object({ page: id, pageSize: id.max(100), total: z.number().int().nonnegative(), itens: z.array(usuarioItemSchema) });
export type UsuarioItem = z.infer<typeof usuarioItemSchema>;
export interface FiltrosUsuarios { page: number; pageSize: number; busca: string; perfil?: UsuarioItem["perfil"]; ativo: "true" | "false" | "todos" }
export interface EditarUsuario { nome: string; perfil: UsuarioItem["perfil"]; equipeId: number | null; revisao: string }
export interface StatusUsuario { ativo: boolean; revisao: string }
export interface UsuariosProps { usuarioId: number }
export interface FormularioCadastroProps { onConcluido?: () => void; onSemPermissao?: () => void; onOcupado?: (ocupado: boolean) => void }
export interface EditorUsuarioProps { usuario: UsuarioItem; proprio: boolean; onFechar: () => void; onConcluido: () => void }
export interface StatusUsuarioProps { usuario: UsuarioItem; onFechar: () => void; onConcluido: () => void }

export const erroGestaoSchema = z.object({ error: z.object({ code: z.string(), message: z.string().optional() }) });
export const statusRespostaSchema = z.object({ id, ativo: z.boolean(), revisao: z.string().min(1) });
