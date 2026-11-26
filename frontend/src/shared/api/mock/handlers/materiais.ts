import type MockAdapter from "axios-mock-adapter";
import {
  obterMateriaisArmazenados,
  adicionarMaterialArmazenado,
  atualizarMaterialArmazenado,
  removerMaterialArmazenado,
} from "../dados/materiais";
import { buscarProdutoPorIdMock } from "../dados/produtos";
import { registrarManutencoes } from "./manutencoes";
import { registrarProdutos } from "./produtos";
import { extrairDados } from "../core/http";
import { z } from "zod";
import { resolverUsuarioAutenticadoMock } from "../core/auth";
import type { Material } from "@/shared/types/materiais";

const campos = {
  produtoId: z.number().int().positive().refine(Number.isSafeInteger).optional(),
  tipo: z.string().trim().min(1).max(200),
  quantidade: z.number().int().nonnegative().refine(Number.isSafeInteger),
  quantidadeUtilizada: z.number().int().nonnegative().refine(Number.isSafeInteger).nullable().optional(),
  statusLogistico: z.enum(["EmSolicitacao", "Comprado", "EmTransito", "Disponivel", "Utilizado"]).nullable().optional(),
  custoUnitario: z.number().nonnegative().nullable().optional(),
};
// Preservar POST legado de MateriaisObra, suportar vínculo via produtoId e ignorar identidade enviada pelo cliente.
const criar = z
  .object({
    ...campos,
    tipo: campos.tipo.optional(),
    descricao: z.string().optional(),
    unidade: z.string().optional(),
  })
  .refine((d) => Boolean(d.produtoId || d.tipo || d.descricao));
const alterar = z
  .object({ ...campos, statusLogistico: campos.statusLogistico.unwrap().unwrap().optional() })
  .partial()
  .strict()
  .refine((d) => Object.keys(d).length > 0);
const erroValidacao: [number, unknown] = [400, { error: { code: "VALIDATION_ERROR", message: "Dados do material inválidos." } }];
const erroPermissao: [number, unknown] = [403, { error: { code: "ACCESS_DENIED", message: "Operação não permitida para este perfil." } }];
const erroNaoAutenticado: [number, unknown] = [401, { error: { code: "UNAUTHORIZED", message: "Sessão ausente ou expirada." } }];

const podeCriar = (authorization: unknown) => {
  const perfil = resolverUsuarioAutenticadoMock(authorization)?.perfil.nomePerfil;
  return perfil === "Administrador" || perfil === "Engenharia";
};

const podeAtualizarStatus = (authorization: unknown) => {
  const perfil = resolverUsuarioAutenticadoMock(authorization)?.perfil.nomePerfil;
  return perfil === "Administrador" || perfil === "Financeiro";
};

function serializarMaterialPorPerfil(material: Material, nomePerfil?: string): Material {
  if (nomePerfil === "Engenharia" || nomePerfil === "InstaladorCampo") {
    const { custoUnitario: _oculto, ...semValores } = material;
    return semValores;
  }
  return { ...material };
}

export function registrarMateriais(mock: MockAdapter): void {
  // Registra rotas de catálogo de produtos (/api/produtos) e manutenções mantendo zero overlap em mock/index.ts e handlers/instalador.ts.
  registrarProdutos(mock);
  registrarManutencoes(mock);

  // ─── MATERIAIS ───
  // GET /obras/:id/materiais — Rota #18
  mock.onGet(/\/obras\/\d+\/materiais\/?(\?.*)?$/).reply((config) => {
    const usuario = resolverUsuarioAutenticadoMock(config.headers?.Authorization);
    if (!usuario) return erroNaoAutenticado;
    const match = config.url?.match(/\/obras\/(\d+)\/materiais/);
    const obraId = match ? Number(match[1]) : 0;
    const itens = obterMateriaisArmazenados()
      .filter((m) => m.obraId === obraId)
      .map((m) => serializarMaterialPorPerfil(m, usuario.perfil.nomePerfil));
    return [200, itens];
  });

  // POST /obras/:id/materiais — Rota #19 (Fixado status inicial em EmSolicitacao e snapshot Q13 do catálogo)
  mock.onPost(/\/obras\/\d+\/materiais\/?$/).reply((config) => {
    const usuario = resolverUsuarioAutenticadoMock(config.headers?.Authorization);
    if (!usuario) return erroNaoAutenticado;
    if (!podeCriar(config.headers?.Authorization)) return erroPermissao;
    const match = config.url?.match(/\/obras\/(\d+)\/materiais/);
    const obraId = match ? Number(match[1]) : 0;
    try {
      const validacao = criar.safeParse(extrairDados<unknown>(config.data));
      if (!validacao.success) return erroValidacao;
      const dados = validacao.data;

      let produtoCatalogo = undefined;
      if (dados.produtoId !== undefined) {
        produtoCatalogo = buscarProdutoPorIdMock(dados.produtoId);
        if (!produtoCatalogo || !produtoCatalogo.ativo) {
          return [
            400,
            {
              error: {
                code: "PRODUTO_INATIVO",
                message: "O produto selecionado não está ativo no catálogo.",
              },
            },
          ];
        }
      }

      const body: Omit<Material, "id" | "obraId"> = {
        ...dados,
        ...(produtoCatalogo
          ? {
              produtoId: produtoCatalogo.id,
              produtoNome: produtoCatalogo.nome,
              tipo: dados.tipo?.trim() || produtoCatalogo.nome,
              unidade: produtoCatalogo.unidade,
              custoUnitario: produtoCatalogo.precoUnitario ?? dados.custoUnitario ?? 0,
            }
          : {}),
        statusLogistico: "EmSolicitacao", // Regra canônica: todo material nasce em EmSolicitacao
      };
      const novo = adicionarMaterialArmazenado(obraId, body);
      if (!novo) return [404, { error: { code: "OBRA_NOT_FOUND", message: "Obra não encontrada." } }];
      return [201, serializarMaterialPorPerfil(novo, usuario.perfil.nomePerfil)];
    } catch {
      return [400, { error: { code: "VALIDATION_ERROR", message: "Erro ao adicionar material." } }];
    }
  });

  // PATCH /materiais/:id — Rota #20 (Restrito a Administrador e Financeiro)
  mock.onPatch(/\/materiais\/\d+\/?$/).reply((config) => {
    const usuario = resolverUsuarioAutenticadoMock(config.headers?.Authorization);
    if (!usuario) return erroNaoAutenticado;
    if (!podeAtualizarStatus(config.headers?.Authorization)) return erroPermissao;
    const match = config.url?.match(/\/materiais\/(\d+)/);
    const id = match ? Number(match[1]) : 0;
    try {
      const validacao = alterar.safeParse(extrairDados<unknown>(config.data));
      if (!validacao.success) return erroValidacao;
      const payload = validacao.data;
      if (
        usuario.perfil.nomePerfil === "Financeiro" &&
        Object.keys(payload).some((campo) => campo !== "statusLogistico" && campo !== "quantidadeUtilizada")
      ) {
        return erroPermissao;
      }

      if (
        payload.quantidadeUtilizada !== undefined &&
        payload.quantidadeUtilizada !== null
      ) {
        const existente = obterMateriaisArmazenados().find((m) => m.id === id);
        if (!existente) {
          return [404, { error: { code: "MATERIAL_NOT_FOUND", message: "Material não encontrado." } }];
        }
        const quantidadeLimite = payload.quantidade ?? existente.quantidade;
        if (payload.quantidadeUtilizada > quantidadeLimite) {
          return [
            400,
            {
              error: {
                code: "VALIDATION_ERROR",
                message: "A quantidade utilizada não pode ser maior que a quantidade do material.",
              },
            },
          ];
        }
      }

      let payloadAtualizado: Partial<Material> = { ...payload };
      if (payload.produtoId !== undefined) {
        const produtoCatalogo = buscarProdutoPorIdMock(payload.produtoId);
        if (!produtoCatalogo || !produtoCatalogo.ativo) {
          return [
            400,
            {
              error: {
                code: "PRODUTO_INATIVO",
                message: "O produto selecionado não está ativo no catálogo.",
              },
            },
          ];
        }
        payloadAtualizado = {
          ...payloadAtualizado,
          produtoId: produtoCatalogo.id,
          produtoNome: produtoCatalogo.nome,
          tipo: payload.tipo?.trim() || produtoCatalogo.nome,
          unidade: produtoCatalogo.unidade,
          ...(produtoCatalogo.precoUnitario !== undefined
            ? { custoUnitario: produtoCatalogo.precoUnitario }
            : {}),
        };
      }

      const atualizado = atualizarMaterialArmazenado(id, payloadAtualizado);
      if (!atualizado) {
        return [404, { error: { code: "MATERIAL_NOT_FOUND", message: "Material não encontrado." } }];
      }
      return [200, serializarMaterialPorPerfil(atualizado, usuario.perfil.nomePerfil)];
    } catch {
      return [400, { error: { code: "VALIDATION_ERROR", message: "Erro ao atualizar material." } }];
    }
  });

  // DELETE /materiais/:id — Rota restrita a Administrador e Engenharia
  mock.onDelete(/\/materiais\/\d+\/?$/).reply((config) => {
    const match = config.url?.match(/\/materiais\/(\d+)/);
    const id = match ? Number(match[1]) : 0;
    if (!podeCriar(config.headers?.Authorization)) return erroPermissao;
    const removido = removerMaterialArmazenado(id);
    if (!removido) {
      return [404, { error: { code: "MATERIAL_NOT_FOUND", message: "Material não encontrado." } }];
    }
    return [204, undefined];
  });
}
