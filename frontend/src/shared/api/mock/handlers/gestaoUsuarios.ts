import type MockAdapter from "axios-mock-adapter";
import { z } from "zod";
import { extrairQueryParams, extrairDados } from "../core/http";
import { resolverUsuarioAutenticadoMock, erroUsuarioMock } from "../core/auth";
import { contasEfetivas, itemUsuario, modificarUsuario, FalhaGestao } from "../dados/operacoesGestao";
const perfis = z.enum(["Administrador", "Engenharia", "Financeiro", "InstaladorCampo"]);
const revisao = z.string().min(1);
const edicao = z.object({ nome: z.string(), perfil: z.string(), equipeId: z.number().int().positive().nullable(), revisao }).strict();
const status = z.object({ ativo: z.boolean(), revisao }).strict();
export function registrarGestaoUsuarios(mock: MockAdapter): void {
  mock.onGet(/\/usuarios\/?(\?.*)?$/).reply(config => {
    try {
      const operador = resolverUsuarioAutenticadoMock(config.headers?.Authorization);
      if (!operador) return erroUsuarioMock(401, "UNAUTHORIZED", "Sessão ausente ou expirada.");
      if (operador.perfil.nomePerfil !== "Administrador") return erroUsuarioMock(403, "ACCESS_DENIED", "Acesso não permitido.");
      const params = extrairQueryParams(config);
      const filtros = z.object({ page: z.coerce.number().int().min(1).default(1), pageSize: z.coerce.number().int().min(1).max(100).default(20), perfil: perfis.optional(), ativo: z.enum(["true", "false", "todos"]).default("true"), busca: z.string().trim().max(200).default("") }).safeParse(params);
      if (!filtros.success) return erroUsuarioMock(400, "INVALID_PARAMETER", "Filtros inválidos.");
      const f = filtros.data;
      const itens = contasEfetivas().filter(u => (!f.perfil || u.perfil === f.perfil) && (f.ativo === "todos" || u.ativo === (f.ativo === "true")) && (u.nome + " " + u.email).toLowerCase().includes(f.busca.toLowerCase())).sort((a,b) => a.nome.localeCompare(b.nome) || a.id-b.id);
      return [200, { page: f.page, pageSize: f.pageSize, total: itens.length, itens: itens.slice((f.page-1)*f.pageSize, f.page*f.pageSize).map(u => itemUsuario(u.id)) }];
    } catch { return erroUsuarioMock(500, "INTERNAL_ERROR", "Não foi possível listar usuários."); }
  });
  for (const metodo of ["put", "patch"] as const) {
    const rota = metodo === "put" ? /\/usuarios\/(\d+)\/?$/ : /\/usuarios\/(\d+)\/status\/?$/;
    const handler: Parameters<ReturnType<MockAdapter["onPut"]>["reply"]>[0] = config => {
      try {
        const operador = resolverUsuarioAutenticadoMock(config.headers?.Authorization);
        if (!operador) return erroUsuarioMock(401, "UNAUTHORIZED", "Sessão ausente ou expirada.");
        if (operador.perfil.nomePerfil !== "Administrador") return erroUsuarioMock(403, "ACCESS_DENIED", "Acesso não permitido.");
        const id = Number(config.url?.match(/\/usuarios\/(\d+)/)?.[1]);
        const body = (metodo === "put" ? edicao : status).safeParse(extrairDados(config.data));
        if (!Number.isSafeInteger(id) || id <= 0 || !body.success) return erroUsuarioMock(400, "INVALID_BODY", "Dados inválidos.");
        if (metodo === "put" && "perfil" in body.data) {
          if (!perfis.safeParse(body.data.perfil).success || !("nome" in body.data) || body.data.nome.trim().length < 3 || body.data.nome.trim().length > 200) return erroUsuarioMock(400, "VALIDATION_ERROR", "Verifique nome e perfil.");
        }
        const resultado = modificarUsuario(id, body.data, operador.id);
        return [200, metodo === "put" ? resultado : { id, ativo: resultado.ativo, revisao: resultado.revisao }];
      } catch (erro) { return erro instanceof FalhaGestao ? erroUsuarioMock(erro.status, erro.codigo, erro.message) : erroUsuarioMock(500, "INTERNAL_ERROR", "Não foi possível salvar o usuário."); }
    };
    if (metodo === "put") mock.onPut(rota).reply(handler); else mock.onPatch(rota).reply(handler);
  }
}
