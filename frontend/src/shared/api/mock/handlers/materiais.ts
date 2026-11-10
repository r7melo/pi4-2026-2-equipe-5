import type MockAdapter from "axios-mock-adapter";
import {
  obterMateriaisArmazenados,
  adicionarMaterialArmazenado,
  atualizarMaterialArmazenado,
  removerMaterialArmazenado,
} from "../dados/materiais";
import { extrairDados } from "../core/http";
import { z } from "zod";
import { resolverUsuarioAutenticadoMock } from "../core/auth";

const campos = {
  tipo: z.string().trim().min(1).max(200),
  quantidade: z.number().int().nonnegative().refine(Number.isSafeInteger),
  statusLogistico: z.enum(["EmSolicitacao", "Comprado", "EmTransito", "Disponivel", "Utilizado"]).nullable().optional(),
  custoUnitario: z.number().nonnegative().nullable().optional(),
};
// Preservar POST legado de MateriaisObra e ignorar identidade enviada pelo cliente.
const criar = z.object({ ...campos, tipo: campos.tipo.optional(), descricao: z.string().optional(), unidade: z.string().optional() }).refine(d => Boolean(d.tipo || d.descricao));
const alterar = z.object(campos).partial().strict().refine(d => Object.keys(d).length > 0);
const erroValidacao: [number, unknown] = [400, { error: { code: "VALIDATION_ERROR", message: "Dados do material inválidos." } }];
const erroPermissao: [number, unknown] = [403, { error: { code: "ACCESS_DENIED", message: "Operação não permitida para este perfil." } }];
const erroNaoAutenticado: [number, unknown] = [401, { error: { code: "UNAUTHORIZED", message: "Sessão ausente ou expirada." } }];

const podeCriar = (authorization: unknown) => {
  const perfil = resolverUsuarioAutenticadoMock(authorization)?.perfil.nomePerfil;
  return perfil === "Administrador" || perfil === "Engenharia";
};

const podeAtualizarStatus = (authorization: unknown) => {
  const perfil = resolverUsuarioAutenticadoMock(authorization)?.perfil.nomePerfil;
  return perfil === "Administrador" || perfil === "Financeiro";
};

export function registrarMateriais(mock: MockAdapter): void {
  // ─── MATERIAIS ───
  // GET /obras/:id/materiais — Rota #18
  mock.onGet(/\/obras\/\d+\/materiais\/?(\?.*)?$/).reply((config) => {
    const usuario = resolverUsuarioAutenticadoMock(config.headers?.Authorization);
    if (!usuario) return erroNaoAutenticado;
    const match = config.url?.match(/\/obras\/(\d+)\/materiais/);
    const obraId = match ? Number(match[1]) : 0;
    const itens = obterMateriaisArmazenados().filter((m) => m.obraId === obraId);
    return [200, itens];
  });

  // POST /obras/:id/materiais — Rota #19 (Fixado status inicial em EmSolicitacao)
  mock.onPost(/\/obras\/\d+\/materiais\/?$/).reply((config) => {
    const usuario = resolverUsuarioAutenticadoMock(config.headers?.Authorization);
    if (!usuario) return erroNaoAutenticado;
    if (!podeCriar(config.headers?.Authorization)) return erroPermissao;
    const match = config.url?.match(/\/obras\/(\d+)\/materiais/);
    const obraId = match ? Number(match[1]) : 0;
    try {
      const validacao = criar.safeParse(extrairDados<unknown>(config.data));
      if (!validacao.success) return erroValidacao;
      const body = {
        ...validacao.data,
        statusLogistico: "EmSolicitacao" as const, // Regra canônica: todo material nasce em EmSolicitacao
      };
      const novo = adicionarMaterialArmazenado(obraId, body);
      if (!novo) return [404, { error: { code: "OBRA_NOT_FOUND", message: "Obra não encontrada." } }];
      return [201, novo];
    } catch {
      return [400, { error: { code: "VALIDATION_ERROR", message: "Erro ao adicionar material." } }];
    }
  });

  // PATCH /materiais/:id — Rota #20 (Restrito a Administrador e Financeiro)
  mock.onPatch(/\/materiais\/\d+\/?$/).reply((config) => {
    const usuario = resolverUsuarioAutenticadoMock(config.headers?.Authorization);
    if (!usuario) return erroNaoAutenticado;
    if (!podeAtualizarStatus(config.headers?.Authorization)) return erroPermissao;
    const match = config.url?.match(/\/materiais\/(\d+)/);
    const id = match ? Number(match[1]) : 0;
    try {
      const validacao = alterar.safeParse(extrairDados<unknown>(config.data));
      if (!validacao.success) return erroValidacao;
      const payload = validacao.data;

      const atualizado = atualizarMaterialArmazenado(id, payload);
      if (!atualizado) {
        return [404, { error: { code: "MATERIAL_NOT_FOUND", message: "Material não encontrado." } }];
      }
      return [200, atualizado];
    } catch {
      return [400, { error: { code: "VALIDATION_ERROR", message: "Erro ao atualizar material." } }];
    }
  });

  // DELETE /materiais/:id — Rota restrita a Administrador e Engenharia
  mock.onDelete(/\/materiais\/\d+\/?$/).reply((config) => {
    const match = config.url?.match(/\/materiais\/(\d+)/);
    const id = match ? Number(match[1]) : 0;
    if (!podeCriar(config.headers?.Authorization)) return erroPermissao;
    const removido = removerMaterialArmazenado(id);
    if (!removido) {
      return [404, { error: { code: "MATERIAL_NOT_FOUND", message: "Material não encontrado." } }];
    }
    return [204, undefined];
  });
}
