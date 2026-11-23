import type MockAdapter from "axios-mock-adapter";
import { obterHistoricoArmazenado, obterComentariosArmazenados, adicionarComentarioArmazenado, editarComentarioArmazenado, excluirComentarioArmazenado, adicionarHistoricoArmazenado } from "../dados/registros";
import { extrairDados } from "../core/http";
import { resolverUsuarioAutenticadoMock } from "../core/auth";
import { obterObrasArmazenadas } from "../dados/obras";

const erro = (status: number, code: string, message: string): [number, object] => [status, { error: { code, message } }];
const naoEncontrado = () => erro(404, "COMENTARIO_NOT_FOUND", "Comentário não encontrado.");

export function registrarRegistros(mock: MockAdapter): void {
  mock.onGet(/\/obras\/\d+\/historico\/?(\?.*)?$/).reply(config => {
    const obraId = Number(config.url?.match(/\/obras\/(\d+)/)?.[1]);
    if (!obterObrasArmazenadas().some(o => o.id === obraId)) return erro(404, "OBRA_NOT_FOUND", "Obra não encontrada.");
    return [200, obterHistoricoArmazenado().filter(h => h.obraId === obraId)];
  });
  mock.onGet(/\/obras\/\d+\/comentarios\/?(\?.*)?$/).reply(config => {
    const obraId = Number(config.url?.match(/\/obras\/(\d+)/)?.[1]);
    if (!obterObrasArmazenadas().some(o => o.id === obraId)) return erro(404, "OBRA_NOT_FOUND", "Obra não encontrada.");
    const params: unknown = config.params;
    const tipo = params && typeof params === "object" && "tipo" in params ? params.tipo : new URL(config.url ?? "", "http://mock.local").searchParams.get("tipo");
    if (tipo && (typeof tipo !== "string" || !["Cartao", "Manutencao", "Timeline"].includes(tipo))) return erro(400, "INVALID_PARAMETER", "Tipo de comentário inválido.");
    return [200, obterComentariosArmazenados().filter(c => c.obraId === obraId && (!tipo || (c.tipo ?? "Cartao") === tipo))];
  });
  mock.onPost(/\/obras\/\d+\/comentarios\/?(\?.*)?$/).reply(config => {
    const usuario = resolverUsuarioAutenticadoMock(config.headers?.Authorization);
    if (!usuario) return erro(401, "UNAUTHORIZED", "Sessão ausente ou expirada.");
    const perfil = usuario.perfil.nomePerfil;
    if (!["Administrador", "Engenharia", "Financeiro"].includes(perfil)) return erro(403, "ACCESS_DENIED", "Você não possui permissão para comentar.");
    const obraId = Number(config.url?.match(/\/obras\/(\d+)/)?.[1]);
    if (!obterObrasArmazenadas().some(o => o.id === obraId)) return erro(404, "OBRA_NOT_FOUND", "Obra não encontrada.");
    try {
      const body = extrairDados<{ descricao?: string; tipo?: "Cartao" | "Timeline" }>(config.data);
      const tipo = body.tipo ?? (perfil === "Financeiro" ? "Timeline" : "Cartao");
      if (!["Cartao", "Timeline"].includes(tipo) || !body.descricao?.trim()) return erro(400, "VALIDATION_ERROR", "Informe tipo e descrição válidos.");
      if (perfil === "Financeiro" && tipo !== "Timeline") return erro(403, "ACCESS_DENIED", "O Financeiro comenta somente na linha do tempo.");
      const autor = { id: usuario.id, nome: usuario.nome };
      const novo = adicionarComentarioArmazenado(obraId, body.descricao.trim(), autor, tipo);
      adicionarHistoricoArmazenado(obraId, null, null, "Comentário registrado.", autor, "Comentario");
      return [201, novo];
    } catch { return erro(400, "INVALID_BODY", "Confira os dados informados."); }
  });
  mock.onPut(/\/comentarios\/\d+\/?(\?.*)?$/).reply(config => {
    const usuario = resolverUsuarioAutenticadoMock(config.headers?.Authorization);
    if (!usuario) return erro(401, "UNAUTHORIZED", "Sessão ausente ou expirada.");
    if (usuario.perfil.nomePerfil !== "Administrador") return erro(403, "ACCESS_DENIED", "Somente o Administrador edita comentários.");
    try {
      const body = extrairDados<{ descricao?: string }>(config.data);
      if (!body.descricao?.trim()) return erro(400, "VALIDATION_ERROR", "A descrição é obrigatória.");
      const comentario = editarComentarioArmazenado(Number(config.url?.match(/\/comentarios\/(\d+)/)?.[1]), body.descricao.trim());
      return comentario ? [200, comentario] : naoEncontrado();
    } catch { return erro(400, "INVALID_BODY", "Confira os dados informados."); }
  });
  mock.onDelete(/\/comentarios\/\d+\/?(\?.*)?$/).reply(config => {
    const usuario = resolverUsuarioAutenticadoMock(config.headers?.Authorization);
    if (!usuario) return erro(401, "UNAUTHORIZED", "Sessão ausente ou expirada.");
    if (usuario.perfil.nomePerfil !== "Administrador") return erro(403, "ACCESS_DENIED", "Somente o Administrador exclui comentários.");
    return excluirComentarioArmazenado(Number(config.url?.match(/\/comentarios\/(\d+)/)?.[1])) ? [204] : naoEncontrado();
  });
}
