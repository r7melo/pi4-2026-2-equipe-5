import type { Usuario } from "@/types";
import { z } from "zod";
import { lerGestao, gravarGestao, equipeGestaoSchema } from "./estadoGestao";
import { obterEquipesArmazenadas } from "./equipes";

export type MockUsuario = Usuario & { ativo?: boolean };

/** Referencia contratual de QA; a demonstracao inicial usa gerarDadosCenario. */
export const MOCK_USUARIOS: Record<string, MockUsuario> = {
  "admin@zl.com.br": {
    id: 1,
    nome: "Carlos Administrador",
    email: "admin@zl.com.br",
    perfil: {
      id: 1,
      nomePerfil: "Administrador",
      permissoes: ["*"],
    },
    equipeId: null,
  },
  "engenharia@zlengenharia.com": {
    id: 2,
    nome: "Ana Souza",
    email: "engenharia@zlengenharia.com",
    perfil: {
      id: 2,
      nomePerfil: "Engenharia",
      permissoes: ["obras:criar", "obras:mover", "programacoes:editar"],
    },
    equipeId: null,
  },
  "financeiro@zl.com.br": {
    id: 3,
    nome: "Fernanda Financeiro",
    email: "financeiro@zl.com.br",
    perfil: {
      id: 3,
      nomePerfil: "Financeiro",
      permissoes: ["financeiro:visualizar", "relatorios:visualizar"],
    },
    equipeId: null,
  },
  "instalador@zl.com.br": {
    id: 4,
    nome: "Marcos Instalador",
    email: "instalador@zl.com.br",
    perfil: {
      id: 4,
      nomePerfil: "InstaladorCampo",
      permissoes: ["obras:visualizar", "materiais:confirmar"],
    },
    equipeId: 3,
  },
};

const PERFIS_USUARIOS_MOCK: Record<MockUsuario["perfil"]["nomePerfil"], MockUsuario["perfil"]> = {
  Administrador: { id: 1, nomePerfil: "Administrador", permissoes: ["*"] },
  Engenharia: { id: 2, nomePerfil: "Engenharia", permissoes: ["obras:criar", "obras:mover", "programacoes:editar"] },
  Financeiro: { id: 3, nomePerfil: "Financeiro", permissoes: ["financeiro:visualizar", "relatorios:visualizar"] },
  InstaladorCampo: { id: 4, nomePerfil: "InstaladorCampo", permissoes: ["obras:visualizar", "materiais:confirmar"] },
};

import { EMAIL_USUARIO } from "@/shared/constants/emailUsuario";

const perfilUsuarioMockSchema = z.enum(["Administrador", "Engenharia", "Financeiro", "InstaladorCampo"]);

const idUsuarioMockSchema = z.number().int().positive().refine(Number.isSafeInteger);



const cadastroUsuarioMockSchema = z.object({
  nome: z.string().trim().min(3).max(200),
  email: z.string().trim().toLowerCase().max(200).regex(EMAIL_USUARIO),
  senha: z.string().refine((senha) => {
    const tamanho = new TextEncoder().encode(senha).byteLength;
    return tamanho >= 6 && tamanho <= 72;
  }),
  perfil: perfilUsuarioMockSchema,
  equipeId: idUsuarioMockSchema.nullable().default(null),
}).superRefine((dados, ctx) => {
  if (dados.perfil === "InstaladorCampo" && dados.equipeId === null) {
    ctx.addIssue({ code: "custom", path: ["equipeId"], message: "Equipe obrigatória." });
  }
}).transform((dados) => ({
  ...dados, equipeId: dados.perfil === "InstaladorCampo" ? dados.equipeId : null,
}));

const usuarioPersistidoMockSchema = z.object({
  id: idUsuarioMockSchema,
  nome: z.string().min(3).max(200).refine((nome) => nome === nome.trim()),
  email: z.string().max(200).regex(EMAIL_USUARIO)
    .refine((email) => email === email.trim().toLowerCase()),
  perfil: perfilUsuarioMockSchema,
  equipeId: idUsuarioMockSchema.nullable(),
  ativo: z.literal(true),
  senhaHash: z.string().regex(/^[a-f0-9]{64}$/),
}).strict().superRefine((usuario, ctx) => {
  if ((usuario.perfil === "InstaladorCampo") !== (usuario.equipeId !== null)) {
    ctx.addIssue({ code: "custom", path: ["equipeId"], message: "Vínculo de equipe inválido." });
  }
});

export type UsuarioPersistidoMock = z.infer<typeof usuarioPersistidoMockSchema>;

function validarUsuariosPersistidosMock(valor: unknown): UsuarioPersistidoMock[] {
  const parsed = z.array(usuarioPersistidoMockSchema).safeParse(valor);
  if (!parsed.success) throw new Error("Armazenamento de usuários inválido.");
  const ids = new Set(Object.values(MOCK_USUARIOS).map((usuario) => usuario.id));
  const emails = new Set(Object.keys(MOCK_USUARIOS).map((email) => email.toLowerCase()));
  for (const usuario of parsed.data) {
    if (ids.has(usuario.id) || emails.has(usuario.email)) {
      throw new Error("Armazenamento de usuários inválido.");
    }
    ids.add(usuario.id);
    emails.add(usuario.email);
  }
  return parsed.data;
}

export function obterUsuariosCriados(): UsuarioPersistidoMock[] {
  try {
    return validarUsuariosPersistidosMock(lerGestao().novos);
  } catch {
    throw new Error("Não foi possível ler os usuários simulados.");
  }
}

export function salvarUsuariosCriados(usuarios: UsuarioPersistidoMock[]): void {
  try {
    const validados = validarUsuariosPersistidosMock(usuarios);
    const anteriores = obterUsuariosCriados();
    const estado = lerGestao();
    estado.novos = validados;
    const equipes = structuredClone(obterEquipesArmazenadas());
    for (const u of estado.novos.filter(candidato => !anteriores.some(a => a.id === candidato.id))) {
      if (u.perfil !== "InstaladorCampo") continue;
      const equipe = equipes.find(e => e.id === u.equipeId);
      if (!equipe) throw new Error("Equipe indisponível.");
      equipe.membros = [...(equipe.membros ?? []).filter(m => m.id !== u.id), { id: u.id, nome: u.nome }];
    }
    estado.equipes = equipes.map(e => equipeGestaoSchema.parse(e));
    gravarGestao(estado);
  } catch {
    throw new Error("Não foi possível salvar os usuários simulados.");
  }
}

export async function gerarHashSenhaMock(senha: string): Promise<string> {
  if (!globalThis.crypto?.subtle) throw new Error("Criptografia indisponível.");
  const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(senha));
  return Array.from(new Uint8Array(hash), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function validarCadastroUsuarioMock(valor: unknown) {
  return cadastroUsuarioMockSchema.safeParse(valor);
}

export function usuarioPersistidoParaMock(usuario: UsuarioPersistidoMock): MockUsuario {
  const perfil = PERFIS_USUARIOS_MOCK[usuario.perfil];
  return {
    id: usuario.id, nome: usuario.nome, email: usuario.email,
    perfil: { ...perfil, permissoes: [...perfil.permissoes] },
    equipeId: usuario.equipeId,
  };
}

export function buscarUsuarioPorEmailMock(email: string): MockUsuario | undefined {
  email = email.trim().toLowerCase();
  const criado = obterUsuariosCriados().find((usuario) => usuario.email === email);
  const base = criado ? usuarioPersistidoParaMock(criado) : Object.hasOwn(MOCK_USUARIOS, email) ? MOCK_USUARIOS[email] : undefined;
  if (!base) return undefined;
  const alterado = lerGestao().contas[String(base.id)];
  if (!alterado) return { ...base, ativo: true };
  if (alterado.email !== base.email) throw new Error("Identidade de usuário inconsistente.");
  return { ...base, nome: alterado.nome, equipeId: alterado.equipeId, ativo: alterado.ativo,
    perfil: { ...PERFIS_USUARIOS_MOCK[alterado.perfil] } };
}

export function equipeExisteParaUsuarioMock(equipeId: number | null): boolean {
  if (equipeId === null) return true;
  return obterEquipesArmazenadas().some((equipe) => equipe.id === equipeId);
}
