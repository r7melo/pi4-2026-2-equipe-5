import type MockAdapter from "axios-mock-adapter";
import { obterHistoricoArmazenado, obterComentariosArmazenados, adicionarComentarioArmazenado } from "../dados/registros";
import { extrairDados } from "../core/http";
import { resolverUsuarioAutenticadoMock } from "../core/auth";
import { obterObrasArmazenadas } from "../dados/obras";

export function registrarRegistros(mock: MockAdapter): void {
  // ─── HISTÓRICO E COMENTÁRIOS ───
  // GET /obras/:id/historico — Rota #21 (Admin, Engenharia, Financeiro. Instalador: 403)
  mock.onGet(/\/obras\/\d+\/historico\/?(\?.*)?$/).reply((config) => {
    const auth = resolverUsuarioAutenticadoMock(config.headers?.Authorization);
    if (auth && auth.perfil.nomePerfil === "InstaladorCampo") {
      return [403, { error: { code: "ACCESS_DENIED", message: "Instalador não possui permissão para visualizar o histórico." } }];
    }
    const match = config.url?.match(/\/obras\/(\d+)\/historico/);
    const obraId = match ? Number(match[1]) : 0;
    const itens = obterHistoricoArmazenado().filter(h => h.obraId === obraId);
    return [200, itens];
  });
  
  // GET /obras/:id/comentarios — Rota #22
  mock.onGet(/\/obras\/\d+\/comentarios\/?(\?.*)?$/).reply((config) => {
    const match = config.url?.match(/\/obras\/(\d+)\/comentarios/);
    const obraId = match ? Number(match[1]) : 0;
    const itens = obterComentariosArmazenados().filter(c => c.obraId === obraId);
    return [200, itens];
  });
  
  // POST /obras/:id/comentarios — Rota #23 (Admin, Engenharia e Financeiro. Instalador: 403)
  mock.onPost(/\/obras\/\d+\/comentarios\/?$/).reply((config) => {
    const match = config.url?.match(/\/obras\/(\d+)\/comentarios/);
    const obraId = match ? Number(match[1]) : 0;
    try {
      const body = extrairDados<{ descricao: string; tipo?: string }>(config.data);
      
      const usuario = resolverUsuarioAutenticadoMock(config.headers?.Authorization);
      if (!usuario) return [401];
      if (usuario.perfil.nomePerfil === "InstaladorCampo") {
        return [403, { error: { code: "ACCESS_DENIED", message: "Instalador não possui permissão para comentar na obra." } }];
      }
      if (usuario.perfil.nomePerfil === "Financeiro" && body.tipo && body.tipo !== "Timeline") {
        return [403, { error: { code: "ACCESS_DENIED", message: "O perfil Financeiro comenta somente na timeline." } }];
      }
      if (!obterObrasArmazenadas().some(o => o.id === obraId)) return [404];
      if (typeof body.descricao !== "string" || !body.descricao.trim()) return [400];
      const novo = adicionarComentarioArmazenado(obraId, body.descricao, { id: usuario.id, nome: usuario.nome });
      return [201, novo];
    } catch {
      return [400, { error: { message: "Erro ao adicionar comentário" } }];
    }
  });
}
