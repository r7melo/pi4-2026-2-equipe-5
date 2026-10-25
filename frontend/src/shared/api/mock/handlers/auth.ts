import type MockAdapter from "axios-mock-adapter";
import { extrairDados } from "../core/http";
import { erroUsuarioMock, resolverUsuarioAutenticadoMock } from "../core/auth";
import { obterUsuariosCriados, usuarioPersistidoParaMock, MOCK_USUARIOS, gerarHashSenhaMock } from "../dados/usuarios";

// --- ROTAS DE AUTENTICAÇÃO ---

// Contador volátil em memória de falhas de login por e-mail (RN-02 / UC-01 FA3)
const tentativasFalhas: Record<string, number> = {};

export function registrarAuth(mock: MockAdapter): void {
  // POST /auth/login (suporta com/sem prefixo e com/sem barra)
  mock.onPost(/\/auth\/login\/?(\?.*)?$/).reply(async (config) => {
    try {
      const body = extrairDados<{ email?: unknown; senha?: unknown }>(config.data);
      if (typeof body.email !== "string" || typeof body.senha !== "string") {
        return erroUsuarioMock(400, "INVALID_BODY", "Corpo da requisição de login inválido");
      }
      const email = body.email.toLowerCase().trim();
      const senha = body.senha;
  
      // 1. Verificação de bloqueio por força bruta (RN-02: 5 falhas consecutivas)
      if (tentativasFalhas[email] && tentativasFalhas[email] >= 5) {
        return [
          423,
          {
            error: {
              code: "ACCOUNT_LOCKED",
              message: "Conta bloqueada por excesso de tentativas de login",
            },
          },
        ];
      }
  
      const criado = obterUsuariosCriados().find((usuario) => usuario.email === email);
      const usuarioMock = criado ? usuarioPersistidoParaMock(criado)
        : Object.hasOwn(MOCK_USUARIOS, email) ? MOCK_USUARIOS[email] : undefined;
  
      // 2. Validação canônica de credenciais (Senha padrão: Senha123!)
      const credencialValida = criado
        ? (await gerarHashSenhaMock(senha)) === criado.senhaHash
        : senha === "Senha123!";
      if ((tentativasFalhas[email] || 0) >= 5) {
        return erroUsuarioMock(423, "ACCOUNT_LOCKED", "Conta bloqueada por excesso de tentativas de login");
      }
      if (!usuarioMock || !credencialValida) {
        tentativasFalhas[email] = (tentativasFalhas[email] || 0) + 1;
  
        if (tentativasFalhas[email] >= 5) {
          return [
            423,
            {
              error: {
                code: "ACCOUNT_LOCKED",
                message: "Conta bloqueada por excesso de tentativas de login",
              },
            },
          ];
        }
  
        return [
          401,
          {
            error: {
              code: "INVALID_CREDENTIALS",
              message: "E-mail ou senha incorretos",
            },
          },
        ];
      }
  
      // 3. Sucesso: zera tentativas de falha
      tentativasFalhas[email] = 0;
  
      const resposta = {
        token: `mock_jwt_token_${btoa(usuarioMock.email)}_${Date.now()}`,
        expiresAt: new Date(Date.now() + 480 * 60 * 1000).toISOString(),
        usuario: {
          id: usuarioMock.id,
          nome: usuarioMock.nome,
          email: usuarioMock.email,
          perfil: usuarioMock.perfil.nomePerfil,
          equipeId: usuarioMock.equipeId,
        },
      };
  
      return [200, resposta];
    } catch {
      return erroUsuarioMock(500, "INTERNAL_ERROR", "Não foi possível concluir a autenticação.");
    }
  });
  
  // GET /auth/me (identifica o usuário autenticado através do token)
  mock.onGet(/\/auth\/me\/?(\?.*)?$/).reply((config) => {
    try {
      const usuario = resolverUsuarioAutenticadoMock(config.headers?.Authorization);
      if (!usuario) return erroUsuarioMock(401, "UNAUTHORIZED", "Sessão ausente ou expirada.");
      return [200, usuario];
    } catch {
      // Sem fallback de perfil: falhas de armazenamento não autenticam outro usuário.
      return erroUsuarioMock(500, "INTERNAL_ERROR", "Não foi possível consultar a sessão.");
    }
  });
  
  // POST /auth/logout
  mock.onPost(/\/auth\/logout\/?(\?.*)?$/).reply(() => {
    return [200, { mensagem: "Logout realizado com sucesso" }];
  });
}
