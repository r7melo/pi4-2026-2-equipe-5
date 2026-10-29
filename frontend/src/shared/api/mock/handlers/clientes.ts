import type MockAdapter from "axios-mock-adapter";
import { erroUsuarioMock, resolverUsuarioAutenticadoMock } from "../core/auth";
import { clientesCenario } from "../dados/detalhes";
export function registrarClientes(mock: MockAdapter): void {
  mock.onGet(/\/clientes\/?(?:\?.*)?$/).reply(config => {
    const usuario = resolverUsuarioAutenticadoMock(config.headers?.Authorization);
    if (!usuario) return erroUsuarioMock(401, "UNAUTHORIZED", "Sessão ausente ou expirada.");
    if (!["Administrador", "Engenharia"].includes(usuario.perfil.nomePerfil)) {
      return erroUsuarioMock(403, "ACCESS_DENIED", "Acesso não permitido.");
    }
    const itens = clientesCenario();
    return [200, { itens, total: itens.length }];
  });
}
