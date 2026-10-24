import { buscarUsuarioPorEmailMock } from "../dados/usuarios";

export function erroUsuarioMock(status: number, code: string, message: string):
  [number, { error: { code: string; message: string } }] {
  return [status, { error: { code, message } }];
}

export function resolverUsuarioAutenticadoMock(authorization: unknown) {
  if (typeof authorization !== "string") return undefined;
  const match = /^Bearer mock_jwt_token_([A-Za-z0-9+/=]+)_(\d+)$/.exec(authorization);
  if (!match) return undefined;
  const emitidoEm = Number(match[2]);
  const agora = Date.now();
  if (!Number.isSafeInteger(emitidoEm) || emitidoEm <= 0 ||
      emitidoEm > agora || agora - emitidoEm >= 480 * 60 * 1000) return undefined;
  let email: string;
  try {
    email = atob(match[1]);
  } catch {
    return undefined;
  }
  return buscarUsuarioPorEmailMock(email);
}
