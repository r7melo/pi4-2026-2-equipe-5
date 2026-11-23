import type MockAdapter from "axios-mock-adapter";
import { z } from "zod";
import { resolverUsuarioAutenticadoMock } from "../core/auth";
import { extrairDados } from "../core/http";
import {
  adicionarProdutoArmazenado,
  atualizarProdutoArmazenado,
  obterProdutosArmazenados,
  serializarProdutoPorPerfil,
} from "../dados/produtos";

function erroJson(
  status: number,
  code: string,
  message: string
): [number, { error: { code: string; message: string } }] {
  return [status, { error: { code, message } }];
}

const schemaCriarProduto = z
  .object({
    nome: z.string().trim().min(1).max(200),
    tipo: z.string().trim().min(1).max(200),
    unidade: z.string().trim().min(1).max(30),
    precoUnitario: z.number().finite().min(0).lt(10_000_000_000),
    ativo: z.boolean().optional(),
  })
  .strict();

const schemaEditarProduto = schemaCriarProduto
  .partial()
  .strict()
  .refine((dados) => Object.keys(dados).length > 0);

function perfilPodeGerenciarCatalogo(nomePerfil?: string): boolean {
  return nomePerfil === "Administrador" || nomePerfil === "Financeiro";
}

function extrairFiltrosConsulta(configUrl?: string, configParams?: Record<string, unknown>) {
  const paramsUrl = configUrl?.includes("?")
    ? new URLSearchParams(configUrl.split("?")[1] ?? "")
    : new URLSearchParams();

  const nomeRaw = configParams?.nome ?? paramsUrl.get("nome");
  const tipoRaw = configParams?.tipo ?? paramsUrl.get("tipo");
  const incluirInativosRaw = configParams?.incluirInativos ?? paramsUrl.get("incluirInativos");

  const incluirInativos =
    incluirInativosRaw === true ||
    incluirInativosRaw === "true" ||
    incluirInativosRaw === "1";

  return {
    nome: typeof nomeRaw === "string" ? nomeRaw.trim().toLowerCase() : "",
    tipo: typeof tipoRaw === "string" ? tipoRaw.trim().toLowerCase() : "",
    incluirInativos,
  };
}

const mockRegistrado = new WeakSet<MockAdapter>();

export function registrarProdutos(mock: MockAdapter): void {
  if (mockRegistrado.has(mock)) return;
  mockRegistrado.add(mock);

  // GET /api/produtos — Rota #20a (Catálogo de Produtos)
  mock.onGet(/\/produtos\/?(\?.*)?$/).reply((config) => {
    const usuario = resolverUsuarioAutenticadoMock(config.headers?.Authorization);
    if (!usuario) return erroJson(401, "UNAUTHORIZED", "Sessão ausente ou expirada.");

    const { nome, tipo, incluirInativos } = extrairFiltrosConsulta(
      config.url,
      config.params as Record<string, unknown> | undefined
    );

    const perfil = usuario.perfil.nomePerfil;
    if (incluirInativos && !perfilPodeGerenciarCatalogo(perfil)) {
      return erroJson(403, "ACCESS_DENIED", "Apenas Administrador ou Financeiro podem consultar produtos inativos.");
    }

    const produtos = obterProdutosArmazenados()
      .filter((item) => (incluirInativos ? true : item.ativo))
      .filter((item) => (!nome ? true : item.nome.toLowerCase().includes(nome) || item.tipo.toLowerCase().includes(nome)))
      .filter((item) => (!tipo ? true : item.tipo.toLowerCase().includes(tipo)))
      .map((item) => serializarProdutoPorPerfil(item, perfil));

    return [200, produtos];
  });

  // POST /api/produtos — Rota #20b (Cadastro de Produto)
  mock.onPost(/\/produtos\/?$/).reply((config) => {
    const usuario = resolverUsuarioAutenticadoMock(config.headers?.Authorization);
    if (!usuario) return erroJson(401, "UNAUTHORIZED", "Sessão ausente ou expirada.");
    if (!perfilPodeGerenciarCatalogo(usuario.perfil.nomePerfil)) {
      return erroJson(403, "ACCESS_DENIED", "Operação permitida apenas para Administrador e Financeiro.");
    }

    try {
      const validacao = schemaCriarProduto.safeParse(extrairDados<unknown>(config.data));
      if (!validacao.success) {
        return erroJson(400, "VALIDATION_ERROR", "Dados do produto inválidos.");
      }
      const novo = adicionarProdutoArmazenado(validacao.data);
      return [201, serializarProdutoPorPerfil(novo, usuario.perfil.nomePerfil)];
    } catch {
      return erroJson(400, "VALIDATION_ERROR", "Erro ao cadastrar produto.");
    }
  });

  // PUT /api/produtos/:id — Rota #20c (Edição / Ativação / Desativação de Produto)
  mock.onPut(/\/produtos\/\d+\/?$/).reply((config) => {
    const usuario = resolverUsuarioAutenticadoMock(config.headers?.Authorization);
    if (!usuario) return erroJson(401, "UNAUTHORIZED", "Sessão ausente ou expirada.");
    if (!perfilPodeGerenciarCatalogo(usuario.perfil.nomePerfil)) {
      return erroJson(403, "ACCESS_DENIED", "Operação permitida apenas para Administrador e Financeiro.");
    }

    const match = config.url?.match(/\/produtos\/(\d+)/);
    const id = match ? Number(match[1]) : 0;
    try {
      const validacao = schemaEditarProduto.safeParse(extrairDados<unknown>(config.data));
      if (!validacao.success) {
        return erroJson(400, "VALIDATION_ERROR", "Dados de atualização do produto inválidos.");
      }
      const atualizado = atualizarProdutoArmazenado(id, validacao.data);
      if (!atualizado) {
        return erroJson(404, "PRODUTO_NOT_FOUND", "Produto não encontrado no catálogo.");
      }
      return [200, serializarProdutoPorPerfil(atualizado, usuario.perfil.nomePerfil)];
    } catch {
      return erroJson(400, "VALIDATION_ERROR", "Erro ao atualizar produto.");
    }
  });
}
