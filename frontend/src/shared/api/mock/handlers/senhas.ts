import { EMAIL_USUARIO } from "@/shared/constants/emailUsuario";
import type MockAdapter from "axios-mock-adapter";
import { z } from "zod";
import { extrairDados } from "../core/http";
import { erroUsuarioMock, resolverUsuarioAutenticadoMock } from "../core/auth";
import { buscarUsuarioPorEmailMock, gerarHashSenhaMock, obterUsuariosCriados } from "../dados/usuarios";
import { alterarCredencialSenhaMock, consumirLinkSenhaMock, criarLinkSenhaMock, consultarLinkSenhaMock, credencialSenhaMock, revisaoSenhaMock } from "../dados/segurancaSenha";

const mensagem = "Se o e-mail informado estiver cadastrado, você receberá as instruções de redefinição";
const solicitarSchema = z.object({ email: z.string().trim().toLowerCase().regex(EMAIL_USUARIO) });
const redefinirSchema = z.object({ token: z.string(), novaSenha: z.string() });
const alterarSchema = z.object({ senhaAtual: z.string().min(1), novaSenha: z.string() });
function forte(senha: string): boolean {
  return Array.from(senha).length >= 8 && /[A-Z]/.test(senha) && /[a-z]/.test(senha) && /[0-9]/.test(senha);
}
const linkInvalido = () => erroUsuarioMock(400, "VALIDATION_ERROR", "Link inválido ou expirado");
const armazenamento = () => erroUsuarioMock(500, "INTERNAL_ERROR", "Não foi possível concluir a operação.");

export function registrarSenhas(mock: MockAdapter): void {
  mock.onPost(/\/auth\/esqueci-senha\/?(\?.*)?$/).reply(config => {
    try {
      const body = solicitarSchema.safeParse(extrairDados(config.data));
      if (!body.success) return erroUsuarioMock(400, "INVALID_BODY", "Informe um e-mail válido.");
      const existente = Boolean(buscarUsuarioPorEmailMock(body.data.email));
      const token = criarLinkSenhaMock(body.data.email, existente);
      if (token && import.meta.env.DEV) console.info(`[Mock Auth] Link de redefinição: /redefinir-senha?token=${token}`);
      return [200, { mensagem }];
    } catch { return armazenamento(); }
  });
  mock.onPost(/\/auth\/redefinir-senha\/?(\?.*)?$/).reply(async config => {
    try {
      const body = redefinirSchema.safeParse(extrairDados(config.data));
      if (!body.success) return erroUsuarioMock(400, "INVALID_BODY", "Informe token e nova senha.");
      const link = consultarLinkSenhaMock(body.data.token);
      if (!link || !buscarUsuarioPorEmailMock(link.email)) return linkInvalido();
      if (!forte(body.data.novaSenha)) return erroUsuarioMock(400, "VALIDATION_ERROR", "A senha não atende aos requisitos mínimos de segurança");
      const hash = await gerarHashSenhaMock(body.data.novaSenha);
      if (!buscarUsuarioPorEmailMock(link.email) || !consumirLinkSenhaMock(body.data.token, hash)) return linkInvalido();
      return [200, { sucesso: true, mensagem: "Senha atualizada com sucesso" }];
    } catch { return armazenamento(); }
  });
  mock.onPut(/\/auth\/alterar-senha\/?(\?.*)?$/).reply(async config => {
    try {
      const usuario = resolverUsuarioAutenticadoMock(config.headers?.Authorization);
      if (!usuario) return erroUsuarioMock(401, "UNAUTHORIZED", "Sessão ausente ou expirada.");
      const body = alterarSchema.safeParse(extrairDados(config.data));
      if (!body.success) return erroUsuarioMock(400, "INVALID_BODY", "Informe senha atual e nova senha.");
      const email = usuario.email.trim().toLowerCase();
      const revisao = revisaoSenhaMock(email);
      const atualHash = await gerarHashSenhaMock(body.data.senhaAtual);
      const criado = obterUsuariosCriados().find(item => item.email === email);
      const hashEsperado = credencialSenhaMock(email)?.hash ?? criado?.senhaHash;
      const correta = hashEsperado ? atualHash === hashEsperado : body.data.senhaAtual === "Senha123!";
      if (!resolverUsuarioAutenticadoMock(config.headers?.Authorization) || revisaoSenhaMock(email) !== revisao) return erroUsuarioMock(401, "UNAUTHORIZED", "Sessão revogada.");
      if (!correta) return erroUsuarioMock(400, "VALIDATION_ERROR", "Senha atual incorreta");
      if (!forte(body.data.novaSenha) || body.data.novaSenha === body.data.senhaAtual) return erroUsuarioMock(400, "VALIDATION_ERROR", "A nova senha não atende aos requisitos mínimos ou é igual à atual");
      const novaHash = await gerarHashSenhaMock(body.data.novaSenha);
      if (!resolverUsuarioAutenticadoMock(config.headers?.Authorization) || !alterarCredencialSenhaMock(email, revisao, novaHash)) return erroUsuarioMock(401, "UNAUTHORIZED", "Sessão revogada.");
      return [200, { sucesso: true, mensagem: "Senha alterada com sucesso" }];
    } catch { return armazenamento(); }
  });
}
