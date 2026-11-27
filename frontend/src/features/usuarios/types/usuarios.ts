import { z } from "zod";

import { NOMES_PERFIS } from "@/shared/constants/perfis";
import { EMAIL_USUARIO } from "@/shared/constants/emailUsuario";

export const cadastroUsuarioSchema = z.object({
  nome: z.string().trim().min(3, "Informe ao menos 3 caracteres.").max(200, "Use até 200 caracteres."),
  email: z.string().trim().toLowerCase().max(200, "Use até 200 caracteres.")
    .regex(EMAIL_USUARIO, "Informe um e-mail válido."),
  senha: z.string().refine((senha) => {
    const bytes = new TextEncoder().encode(senha).byteLength;
    return bytes >= 6 && bytes <= 72;
  }, "A senha deve ter entre 6 e 72 bytes."),
  perfil: z.string().pipe(z.enum(NOMES_PERFIS, { error: "Selecione um perfil de acesso." })),
});

export type CadastroUsuarioEntrada = z.input<typeof cadastroUsuarioSchema>;
export type CadastroUsuarioDados = z.infer<typeof cadastroUsuarioSchema>;
export type CriarUsuarioPayload = CadastroUsuarioDados;

export interface UsuarioCriado {
  id: number;
  nome: string;
  email: string;
  perfil: CadastroUsuarioDados["perfil"];
  equipeId?: number | null;
  ativo: boolean;
}
