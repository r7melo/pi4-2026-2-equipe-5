import { EMAIL_USUARIO } from "@/shared/constants/emailUsuario";
import { geracaoCenario } from "../core/estadoCenario";
import { armazenamentoCenario } from "../core/estadoCenario";
import { z } from "zod";

export const CHAVE_SEGURANCA_SENHA_MOCK = "mock_seguranca_senhas_v1";
const emailSchema = z.string().regex(EMAIL_USUARIO).refine(email => email === email.trim().toLowerCase());
const revisaoSchema = z.number().int().nonnegative().refine(Number.isSafeInteger);
const contaSchema = z.object({ revisao: revisaoSchema.refine(revisao => revisao > 0), hash: z.string().regex(/^[a-f0-9]{64}$/) }).strict();
const linkSchema = z.object({ email: emailSchema, expiraEm: z.number().int().positive(), revisao: revisaoSchema }).strict();
const estadoSchema = z.object({ versao: z.literal(1), contas: z.record(emailSchema, contaSchema), links: z.record(z.string().uuid(), linkSchema) }).strict();
type Estado = z.infer<typeof estadoSchema>;

function ler(): Estado {
  const raw = armazenamentoCenario.getItem(CHAVE_SEGURANCA_SENHA_MOCK);
  return raw === null ? { versao: 1, contas: {}, links: {} } : estadoSchema.parse(JSON.parse(raw));
}
function salvar(estado: Estado): void {
  armazenamentoCenario.setItem(CHAVE_SEGURANCA_SENHA_MOCK, JSON.stringify(estadoSchema.parse(estado)));
}
export function credencialSenhaMock(email: string) {
  const estado = ler();
  const normalizado = email.trim().toLowerCase();
  return Object.hasOwn(estado.contas, normalizado) ? estado.contas[normalizado] : undefined;
}
export function revisaoSenhaMock(email: string): number {
  return credencialSenhaMock(email)?.revisao ?? 0;
}
export function criarLinkSenhaMock(email: string, existente: boolean): string | undefined {
  const estado = ler();
  const normalizado = email.trim().toLowerCase();
  estado.links = Object.fromEntries(Object.entries(estado.links).filter(([, link]) => link.email !== normalizado && link.expiraEm > Date.now()));
  if (!existente) { salvar(estado); return undefined; }
  const token = crypto.randomUUID();
  estado.links[token] = { email: normalizado, expiraEm: Date.now() + 3600000, revisao: estado.contas[normalizado]?.revisao ?? 0 };
  salvar(estado);
  return token;
}
export function consultarLinkSenhaMock(token: string) {
  const estado = ler();
  const link = Object.hasOwn(estado.links, token) ? estado.links[token] : undefined;
  if (!link || Date.now() >= link.expiraEm || link.revisao !== (estado.contas[link.email]?.revisao ?? 0)) return undefined;
  return link;
}
function trocar(estado: Estado, email: string, hash: string): void {
  estado.contas[email] = { hash, revisao: (estado.contas[email]?.revisao ?? 0) + 1 };
  estado.links = Object.fromEntries(Object.entries(estado.links).filter(([, link]) => link.email !== email));
  salvar(estado);
}
export function consumirLinkSenhaMock(token: string, hash: string): boolean {
  const link = consultarLinkSenhaMock(token);
  if (!link) return false;
  const estado = ler();
  trocar(estado, link.email, hash);
  return true;
}
export function alterarCredencialSenhaMock(email: string, revisao: number, hash: string): boolean {
  const estado = ler();
  const normalizado = email.trim().toLowerCase();
  if ((estado.contas[normalizado]?.revisao ?? 0) !== revisao) return false;
  trocar(estado, normalizado, hash);
  return true;
}
/** Sufixo de versão evita colisão temporal; tokens anteriores à demanda são versão zero. */
export function identidadeTokenSenhaMock(authorization: unknown) {
  if (typeof authorization !== "string") return undefined;
  const match = /^Bearer mock_jwt_token_([A-Za-z0-9+/=]+)_(\d+)(?:_v(\d+))?(?:_a(\d+))?_g([0-9a-f-]+)$/.exec(authorization);
  if (!match || match[5] !== geracaoCenario()) return undefined;
  try {
    return { email: atob(match[1]).trim().toLowerCase(), emitidoEm: Number(match[2]), revisao: Number(match[3] ?? 0), acesso: Number(match[4] ?? 0) };
  } catch { return undefined; }
}
export function acessoRevogadoSenhaMock(authorization: unknown): boolean {
  const identidade = identidadeTokenSenhaMock(authorization);
  return identidade !== undefined && identidade.revisao !== revisaoSenhaMock(identidade.email);
}
