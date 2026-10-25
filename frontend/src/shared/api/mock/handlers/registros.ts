import type MockAdapter from "axios-mock-adapter";
import { obterHistoricoArmazenado, obterComentariosArmazenados, adicionarComentarioArmazenado } from "../dados/registros";
import { extrairDados } from "../core/http";
import { MOCK_USUARIOS } from "../dados/usuarios";

export function registrarRegistros(mock: MockAdapter): void {
  // ─── HISTÓRICO E COMENTÁRIOS ───
  // GET /obras/:id/historico
  mock.onGet(/\/obras\/\d+\/historico\/?(\?.*)?$/).reply((config) => {
    const match = config.url?.match(/\/obras\/(\d+)\/historico/);
    const obraId = match ? Number(match[1]) : 0;
    const itens = obterHistoricoArmazenado().filter(h => h.obraId === obraId);
    return [200, itens];
  });
  
  // GET /obras/:id/comentarios
  mock.onGet(/\/obras\/\d+\/comentarios\/?(\?.*)?$/).reply((config) => {
    const match = config.url?.match(/\/obras\/(\d+)\/comentarios/);
    const obraId = match ? Number(match[1]) : 0;
    const itens = obterComentariosArmazenados().filter(c => c.obraId === obraId);
    return [200, itens];
  });
  
  // POST /obras/:id/comentarios
  mock.onPost(/\/obras\/\d+\/comentarios\/?$/).reply((config) => {
    const match = config.url?.match(/\/obras\/(\d+)\/comentarios/);
    const obraId = match ? Number(match[1]) : 0;
    try {
      const body = extrairDados<{ descricao: string }>(config.data);
      
      // Obtém o usuário logado para atribuir ao comentário
      const authHeader = config.headers?.Authorization || "";
      let usuario = MOCK_USUARIOS["engenharia@zlengenharia.com"];
      if (authHeader.includes("admin")) usuario = MOCK_USUARIOS["admin@zl.com.br"];
      else if (authHeader.includes("mock_jwt_token_")) {
        const matchToken = authHeader.match(/mock_jwt_token_([A-Za-z0-9+/=]+)_/);
        if (matchToken && matchToken[1]) {
          const emailDecodificado = atob(matchToken[1]);
          if (MOCK_USUARIOS[emailDecodificado]) usuario = MOCK_USUARIOS[emailDecodificado];
        }
      }
  
      const novo = adicionarComentarioArmazenado(obraId, body.descricao, { id: usuario.id, nome: usuario.nome });
      return [201, novo];
    } catch {
      return [400, { error: { message: "Erro ao adicionar comentário" } }];
    }
  });
}
