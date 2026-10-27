import type MockAdapter from "axios-mock-adapter";
import { resolverUsuarioAutenticadoMock, erroUsuarioMock } from "../core/auth";
import { validarCadastroUsuarioMock, equipeExisteParaUsuarioMock, gerarHashSenhaMock, obterUsuariosCriados, MOCK_USUARIOS, salvarUsuariosCriados } from "../dados/usuarios";
import { lerGestao } from "../dados/estadoGestao";
import { MOCK_INSTALADORES_DISPONIVEIS } from "../dados/equipes";
import { extrairDados } from "../core/http";

export function registrarUsuarios(mock: MockAdapter): void {
  // POST /api/usuarios — RF-01, UC-05/06/07/09; autorização e gravação após o hash.
  mock.onPost(/\/usuarios\/?(\?.*)?$/).reply(async (config) => {
    try {
      const operador = resolverUsuarioAutenticadoMock(config.headers?.Authorization);
      if (!operador) return erroUsuarioMock(401, "UNAUTHORIZED", "Sessão ausente ou expirada.");
      if (operador.perfil.nomePerfil !== "Administrador") {
        return erroUsuarioMock(403, "ACCESS_DENIED", "Acesso não permitido.");
      }
      const parsed = validarCadastroUsuarioMock(extrairDados<unknown>(config.data));
      if (!parsed.success) return erroUsuarioMock(400, "VALIDATION_ERROR", "Dados inválidos.");
      const dados = parsed.data;
      if (!equipeExisteParaUsuarioMock(dados.equipeId)) {
        return erroUsuarioMock(404, "EQUIPE_NOT_FOUND", "Equipe não encontrada.");
      }
      const senhaHash = await gerarHashSenhaMock(dados.senha);
  
      // Seção síncrona: nenhuma suspensão entre releitura, validação e persistência.
      const operadorAtual = resolverUsuarioAutenticadoMock(config.headers?.Authorization);
      if (!operadorAtual) return erroUsuarioMock(401, "UNAUTHORIZED", "Sessão ausente ou expirada.");
      if (operadorAtual.perfil.nomePerfil !== "Administrador") {
        return erroUsuarioMock(403, "ACCESS_DENIED", "Acesso não permitido.");
      }
      if (!equipeExisteParaUsuarioMock(dados.equipeId)) {
        return erroUsuarioMock(404, "EQUIPE_NOT_FOUND", "Equipe não encontrada.");
      }
      const usuarios = obterUsuariosCriados();
      if (Object.hasOwn(MOCK_USUARIOS, dados.email) ||
          usuarios.some((usuario) => usuario.email === dados.email)) {
        return erroUsuarioMock(409, "EMAIL_ALREADY_EXISTS", "E-mail já cadastrado.");
      }
      const reservados = Object.values(lerGestao().operacionais).map(id => ({ id }));
      const maiorId = [...Object.values(MOCK_USUARIOS), ...usuarios, ...MOCK_INSTALADORES_DISPONIVEIS, ...reservados]
        .reduce((maior, usuario) => Math.max(maior, usuario.id), 0);
      const id = maiorId + 1;
      if (!Number.isSafeInteger(id)) throw new Error("Identificador indisponível.");
      const novo = {
        id, nome: dados.nome, email: dados.email, perfil: dados.perfil,
        equipeId: dados.equipeId, ativo: true as const, senhaHash,
      };
      salvarUsuariosCriados([...usuarios, novo]);
      return [201, {
        id: novo.id, nome: novo.nome, email: novo.email, perfil: novo.perfil,
        equipeId: novo.equipeId, ativo: novo.ativo,
      }];
    } catch {
      return erroUsuarioMock(500, "INTERNAL_ERROR", "Não foi possível concluir o cadastro.");
    }
  });
}
