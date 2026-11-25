import {
  limparDocumento,
  validarCpfCnpj,
} from "@/shared/lib/validacoesDocumento";
import type { CriarClientePayload } from "@/shared/types/clientes";

export type CampoValidacaoCliente =
  | "nome"
  | "cpfCnpj"
  | "cidade"
  | "endereco"
  | "telefone"
  | "email";

export interface FalhaValidacaoCliente {
  campo: CampoValidacaoCliente;
  mensagem: string;
}

export interface EntradaValidacaoCliente {
  nome: string;
  cpfCnpj: string;
  cidade?: string;
  endereco?: string;
  telefone?: string;
  email?: string;
  dadosContrato?: string;
}

export type ResultadoValidacaoCliente =
  | { ok: true; dados: CriarClientePayload }
  | { ok: false; falha: FalhaValidacaoCliente };

export const MENSAGENS_VALIDACAO_CLIENTE = {
  nomeObrigatorio: "Informe o nome completo ou razão social do cliente.",
  nomeMuitoLongo: "O nome do cliente não pode exceder 200 caracteres.",
  cpfCnpjObrigatorio: "Informe o CPF ou CNPJ do cliente.",
  cpfCnpjInvalido: "CPF ou CNPJ inválido. Verifique os dígitos informados.",
  cidadeMuitoLonga: "A cidade não pode exceder 100 caracteres.",
  enderecoMuitoLongo: "O endereço não pode exceder 255 caracteres.",
  telefoneMuitoLongo: "O telefone não pode exceder 30 caracteres.",
  emailMuitoLongo: "O e-mail não pode exceder 200 caracteres.",
  emailInvalido: "Informe um endereço de e-mail válido.",
} as const;

const REGEX_EMAIL_SIMPLES = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validarFormularioCliente(
  entrada: EntradaValidacaoCliente
): ResultadoValidacaoCliente {
  const nome = entrada.nome.trim();
  if (!nome) {
    return {
      ok: false,
      falha: { campo: "nome", mensagem: MENSAGENS_VALIDACAO_CLIENTE.nomeObrigatorio },
    };
  }
  if (nome.length > 200) {
    return {
      ok: false,
      falha: { campo: "nome", mensagem: MENSAGENS_VALIDACAO_CLIENTE.nomeMuitoLongo },
    };
  }

  const cpfCnpjLimpo = limparDocumento(entrada.cpfCnpj);
  if (!cpfCnpjLimpo) {
    return {
      ok: false,
      falha: { campo: "cpfCnpj", mensagem: MENSAGENS_VALIDACAO_CLIENTE.cpfCnpjObrigatorio },
    };
  }
  if (!validarCpfCnpj(cpfCnpjLimpo)) {
    return {
      ok: false,
      falha: { campo: "cpfCnpj", mensagem: MENSAGENS_VALIDACAO_CLIENTE.cpfCnpjInvalido },
    };
  }

  const cidade = entrada.cidade?.trim() || null;
  if (cidade && cidade.length > 100) {
    return {
      ok: false,
      falha: { campo: "cidade", mensagem: MENSAGENS_VALIDACAO_CLIENTE.cidadeMuitoLonga },
    };
  }

  const endereco = entrada.endereco?.trim() || null;
  if (endereco && endereco.length > 255) {
    return {
      ok: false,
      falha: { campo: "endereco", mensagem: MENSAGENS_VALIDACAO_CLIENTE.enderecoMuitoLongo },
    };
  }

  const telefone = entrada.telefone?.trim() || null;
  if (telefone && telefone.length > 30) {
    return {
      ok: false,
      falha: { campo: "telefone", mensagem: MENSAGENS_VALIDACAO_CLIENTE.telefoneMuitoLongo },
    };
  }

  const email = entrada.email?.trim() || null;
  if (email) {
    if (email.length > 200) {
      return {
        ok: false,
        falha: { campo: "email", mensagem: MENSAGENS_VALIDACAO_CLIENTE.emailMuitoLongo },
      };
    }
    if (!REGEX_EMAIL_SIMPLES.test(email)) {
      return {
        ok: false,
        falha: { campo: "email", mensagem: MENSAGENS_VALIDACAO_CLIENTE.emailInvalido },
      };
    }
  }

  const dadosContrato = entrada.dadosContrato?.trim() || null;

  return {
    ok: true,
    dados: {
      nome,
      cpfCnpj: cpfCnpjLimpo,
      cidade,
      endereco,
      telefone,
      email,
      dadosContrato,
    },
  };
}
