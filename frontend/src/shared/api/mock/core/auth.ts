import { revisaoAcesso } from "../dados/estadoGestao";
import { identidadeTokenSenhaMock, revisaoSenhaMock } from "../dados/segurancaSenha";
import { buscarUsuarioPorEmailMock } from "../dados/usuarios";

export function erroUsuarioMock(status: number, code: string, message: string):
  [number, { error: { code: string; message: string } }] {
  return [status, { error: { code, message } }];
}

export function resolverUsuarioAutenticadoMock(authorization: unknown) {
  const identidade = identidadeTokenSenhaMock(authorization);
  if (!identidade || identidade.revisao !== revisaoSenhaMock(identidade.email)) return undefined;
  const emitidoEm = identidade.emitidoEm;
  const agora = Date.now();
  if (!Number.isSafeInteger(emitidoEm) || emitidoEm <= 0 ||
      emitidoEm > agora || agora - emitidoEm >= 480 * 60 * 1000) return undefined;
  const usuario = buscarUsuarioPorEmailMock(identidade.email);
  return usuario?.ativo !== false && identidade.acesso === revisaoAcesso(identidade.email) ? usuario : undefined;
}
