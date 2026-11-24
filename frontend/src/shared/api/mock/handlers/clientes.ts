import type MockAdapter from "axios-mock-adapter";
import { resolverUsuarioAutenticadoMock } from "../core/auth";
import { extrairDados } from "../core/http";
import { limparDocumento, validarCpfCnpj } from "@/shared/lib/validacoesDocumento";
import {
  adicionarClienteArmazenado,
  atualizarClienteArmazenado,
  buscarClientePorIdMock,
  existeCpfCnpjDuplicadoMock,
  obterClientesArmazenados,
  removerClienteArmazenado,
} from "../dados/clientes";

function erroJson(
  status: number,
  code: string,
  message: string
): [number, { error: { code: string; message: string } }] {
  return [status, { error: { code, message } }];
}

function perfilPodeGerenciarClientes(nomePerfil?: string): boolean {
  return nomePerfil === "Administrador" || nomePerfil === "Engenharia";
}

const REGEX_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validarCorpoCliente(
  corpo: Record<string, unknown>,
  parcial: boolean
): { ok: true } | { ok: false; mensagem: string } {
  if (!parcial || corpo.nome !== undefined) {
    if (typeof corpo.nome !== "string" || !corpo.nome.trim() || corpo.nome.trim().length > 200) {
      return { ok: false, mensagem: "O nome do cliente é obrigatório (máx. 200 caracteres)." };
    }
  }

  if (!parcial || corpo.cpfCnpj !== undefined) {
    if (typeof corpo.cpfCnpj !== "string") {
      return { ok: false, mensagem: "O CPF/CNPJ do cliente é obrigatório." };
    }
    const doc = limparDocumento(corpo.cpfCnpj);
    if (!validarCpfCnpj(doc)) {
      return { ok: false, mensagem: "CPF/CNPJ inválido: os dígitos verificadores não conferem." };
    }
  }

  if (typeof corpo.cidade === "string" && corpo.cidade.trim().length > 100) {
    return { ok: false, mensagem: "A cidade deve ter no máximo 100 caracteres." };
  }
  if (typeof corpo.endereco === "string" && corpo.endereco.trim().length > 255) {
    return { ok: false, mensagem: "O endereço deve ter no máximo 255 caracteres." };
  }
  if (typeof corpo.telefone === "string" && corpo.telefone.trim().length > 30) {
    return { ok: false, mensagem: "O telefone deve ter no máximo 30 caracteres." };
  }
  if (typeof corpo.email === "string" && corpo.email.trim()) {
    if (corpo.email.trim().length > 200 || !REGEX_EMAIL.test(corpo.email.trim())) {
      return { ok: false, mensagem: "Informe um e-mail válido com no máximo 200 caracteres." };
    }
  }

  return { ok: true };
}

export function registrarClientes(mock: MockAdapter): void {
  // GET /api/clientes — Rota #10
  mock.onGet(/\/clientes\/?(?:\?.*)?$/).reply((config) => {
    const usuario = resolverUsuarioAutenticadoMock(config.headers?.Authorization);
    if (!usuario) return erroJson(401, "UNAUTHORIZED", "Sessão ausente ou expirada.");
    if (!perfilPodeGerenciarClientes(usuario.perfil.nomePerfil)) {
      return erroJson(403, "ACCESS_DENIED", "Acesso não permitido.");
    }

    const paramsUrl = config.url?.includes("?")
      ? new URLSearchParams(config.url.split("?")[1] ?? "")
      : new URLSearchParams();
    const paramsObj = (config.params as Record<string, unknown> | undefined) ?? {};

    const nomeRaw = paramsObj.nome ?? paramsUrl.get("nome");
    const pageRaw = Number(paramsObj.page ?? paramsUrl.get("page") ?? 1);
    const pageSizeRaw = Number(paramsObj.pageSize ?? paramsUrl.get("pageSize") ?? 50);

    if (!Number.isFinite(pageRaw) || pageRaw < 1 || !Number.isFinite(pageSizeRaw) || pageSizeRaw < 1) {
      return erroJson(400, "INVALID_PARAMETER", "page e pageSize devem ser maiores ou iguais a 1.");
    }

    const termo = typeof nomeRaw === "string" ? nomeRaw.trim().toLowerCase() : "";
    const termoDigitos = limparDocumento(termo);

    const filtrados = obterClientesArmazenados().filter((c) => {
      if (!termo) return true;
      const matchNome = c.nome.toLowerCase().includes(termo);
      const matchCidade = (c.cidade ?? "").toLowerCase().includes(termo);
      const matchDoc = termoDigitos.length > 0 && limparDocumento(c.cpfCnpj).includes(termoDigitos);
      return matchNome || matchCidade || matchDoc;
    });

    const total = filtrados.length;
    const inicio = (pageRaw - 1) * pageSizeRaw;
    const itens = filtrados.slice(inicio, inicio + pageSizeRaw);

    return [
      200,
      {
        page: pageRaw,
        pageSize: pageSizeRaw,
        total,
        itens,
      },
    ];
  });

  // POST /api/clientes — Rota #11
  mock.onPost(/\/clientes\/?$/).reply((config) => {
    const usuario = resolverUsuarioAutenticadoMock(config.headers?.Authorization);
    if (!usuario) return erroJson(401, "UNAUTHORIZED", "Sessão ausente ou expirada.");
    if (!perfilPodeGerenciarClientes(usuario.perfil.nomePerfil)) {
      return erroJson(403, "ACCESS_DENIED", "Acesso restrito a Administrador e Engenharia.");
    }

    const corpo = extrairDados<Record<string, unknown>>(config.data) ?? {};
    const validacao = validarCorpoCliente(corpo, false);
    if (!validacao.ok) {
      return erroJson(400, "VALIDATION_ERROR", validacao.mensagem);
    }

    const cpfCnpj = limparDocumento(String(corpo.cpfCnpj));
    if (existeCpfCnpjDuplicadoMock(cpfCnpj)) {
      return erroJson(
        409,
        "CPF_CNPJ_DUPLICADO",
        "Este CPF/CNPJ já está cadastrado para outro cliente."
      );
    }

    const novo = adicionarClienteArmazenado({
      nome: String(corpo.nome),
      cpfCnpj,
      cidade: typeof corpo.cidade === "string" ? corpo.cidade : null,
      endereco: typeof corpo.endereco === "string" ? corpo.endereco : null,
      telefone: typeof corpo.telefone === "string" ? corpo.telefone : null,
      email: typeof corpo.email === "string" ? corpo.email : null,
      dadosContrato: typeof corpo.dadosContrato === "string" ? corpo.dadosContrato : null,
    });

    return [201, novo];
  });

  // PUT /api/clientes/:id — Rota #10a
  mock.onPut(/\/clientes\/\d+\/?$/).reply((config) => {
    const usuario = resolverUsuarioAutenticadoMock(config.headers?.Authorization);
    if (!usuario) return erroJson(401, "UNAUTHORIZED", "Sessão ausente ou expirada.");
    if (!perfilPodeGerenciarClientes(usuario.perfil.nomePerfil)) {
      return erroJson(403, "ACCESS_DENIED", "Acesso restrito a Administrador e Engenharia.");
    }

    const match = config.url?.match(/\/clientes\/(\d+)/);
    const id = match ? Number(match[1]) : 0;
    const existente = buscarClientePorIdMock(id);
    if (!existente) {
      return erroJson(404, "CLIENTE_NOT_FOUND", "Cliente não encontrado.");
    }

    const corpo = extrairDados<Record<string, unknown>>(config.data) ?? {};
    if (Object.keys(corpo).length === 0) {
      return erroJson(400, "VALIDATION_ERROR", "Informe os dados para atualização do cliente.");
    }

    const validacao = validarCorpoCliente(corpo, true);
    if (!validacao.ok) {
      return erroJson(400, "VALIDATION_ERROR", validacao.mensagem);
    }

    if (typeof corpo.cpfCnpj === "string") {
      const cpfCnpj = limparDocumento(corpo.cpfCnpj);
      if (existeCpfCnpjDuplicadoMock(cpfCnpj, id)) {
        return erroJson(
          409,
          "CPF_CNPJ_DUPLICADO",
          "Este CPF/CNPJ já está cadastrado para outro cliente."
        );
      }
    }

    const atualizado = atualizarClienteArmazenado(id, {
      ...(typeof corpo.nome === "string" ? { nome: corpo.nome } : {}),
      ...(typeof corpo.cpfCnpj === "string" ? { cpfCnpj: corpo.cpfCnpj } : {}),
      ...(corpo.cidade !== undefined
        ? { cidade: typeof corpo.cidade === "string" ? corpo.cidade : null }
        : {}),
      ...(corpo.endereco !== undefined
        ? { endereco: typeof corpo.endereco === "string" ? corpo.endereco : null }
        : {}),
      ...(corpo.telefone !== undefined
        ? { telefone: typeof corpo.telefone === "string" ? corpo.telefone : null }
        : {}),
      ...(corpo.email !== undefined
        ? { email: typeof corpo.email === "string" ? corpo.email : null }
        : {}),
      ...(corpo.dadosContrato !== undefined
        ? {
            dadosContrato:
              typeof corpo.dadosContrato === "string" ? corpo.dadosContrato : null,
          }
        : {}),
    });

    if (!atualizado) {
      return erroJson(404, "CLIENTE_NOT_FOUND", "Cliente não encontrado.");
    }
    return [200, atualizado];
  });

  // DELETE /api/clientes/:id — Rota #10b
  mock.onDelete(/\/clientes\/\d+\/?$/).reply((config) => {
    const usuario = resolverUsuarioAutenticadoMock(config.headers?.Authorization);
    if (!usuario) return erroJson(401, "UNAUTHORIZED", "Sessão ausente ou expirada.");
    if (!perfilPodeGerenciarClientes(usuario.perfil.nomePerfil)) {
      return erroJson(403, "ACCESS_DENIED", "Acesso restrito a Administrador e Engenharia.");
    }

    const match = config.url?.match(/\/clientes\/(\d+)/);
    const id = match ? Number(match[1]) : 0;
    const resultado = removerClienteArmazenado(id);
    if (resultado === "not_found") {
      return erroJson(404, "CLIENTE_NOT_FOUND", "Cliente não encontrado.");
    }
    if (resultado === "has_obras") {
      return erroJson(
        409,
        "CLIENTE_COM_OBRAS",
        "Não é possível excluir um cliente que possui obras vinculadas."
      );
    }
    return [204, undefined];
  });
}
