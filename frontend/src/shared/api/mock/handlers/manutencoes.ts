import type MockAdapter from "axios-mock-adapter";
import { resolverUsuarioAutenticadoMock } from "../core/auth";
import { extrairDados } from "../core/http";
import { obterEquipesArmazenadas } from "../dados/equipes";
import {
  buscarManutencaoPorIdMock,
  concluirManutencaoArmazenada,
  criarComentarioManutencaoArmazenado,
  obterManutencoesArmazenadas,
} from "../dados/manutencoes";

function erroJson(
  status: number,
  code: string,
  message: string
): [number, { error: { code: string; message: string } }] {
  return [status, { error: { code, message } }];
}

function resolverEquipeIdInstalador(usuario: { id?: number; equipeId?: number | null }): number {
  try {
    const equipes = obterEquipesArmazenadas();
    const encontrada = equipes.find(
      (e) => e.id === usuario.equipeId || e.membros?.some((m) => m.id === usuario.id)
    );
    if (encontrada) return Number(encontrada.id);
  } catch {
    // Fallback para testes unitários isolados sem cenário de gestão
  }
  return Number(usuario.equipeId ?? 0);
}

const mockRegistrado = new WeakSet<MockAdapter>();

export function registrarManutencoes(mock: MockAdapter): void {
  if (mockRegistrado.has(mock)) return;
  mockRegistrado.add(mock);

  // GET /api/instalador/manutencoes — Rota #39
  mock.onGet(/\/instalador\/manutencoes\/?(\?.*)?$/).reply((config) => {
    const usuario = resolverUsuarioAutenticadoMock(config.headers?.Authorization);
    if (!usuario) return erroJson(401, "UNAUTHORIZED", "Sessão ausente ou expirada.");
    if (usuario.perfil.nomePerfil !== "InstaladorCampo") {
      return erroJson(403, "ACCESS_DENIED", "Acesso restrito ao instalador de campo.");
    }

    const paramsUrl = config.url?.includes("?")
      ? new URLSearchParams(config.url.split("?")[1] ?? "")
      : new URLSearchParams();
    const statusParam = (config.params as Record<string, unknown> | undefined)?.status ?? paramsUrl.get("status");
    const statusTexto = typeof statusParam === "string" ? statusParam.trim() : "";

    if (statusTexto && statusTexto !== "Pendente" && statusTexto !== "Concluida") {
      return erroJson(400, "INVALID_PARAMETER", "status deve ser Pendente ou Concluida.");
    }

    const equipeId = resolverEquipeIdInstalador(usuario);
    if (!equipeId) return [200, []];

    const itens = obterManutencoesArmazenadas()
      .filter((m) => m.equipeId === equipeId)
      .filter((m) => (!statusTexto ? true : m.status === statusTexto))
      .map(({ equipeId: _eq, servicoExecutado: _srv, ...publico }) => publico);

    return [200, itens];
  });

  // PATCH /api/manutencoes/:id/concluir — Rota #40
  mock.onPatch(/\/manutencoes\/\d+\/concluir\/?$/).reply((config) => {
    const usuario = resolverUsuarioAutenticadoMock(config.headers?.Authorization);
    if (!usuario) return erroJson(401, "UNAUTHORIZED", "Sessão ausente ou expirada.");
    if (usuario.perfil.nomePerfil !== "InstaladorCampo") {
      return erroJson(403, "ACCESS_DENIED", "Apenas o instalador de campo pode concluir manutenções.");
    }

    const match = config.url?.match(/\/manutencoes\/(\d+)\/concluir/);
    const id = match ? Number(match[1]) : 0;
    const manutencao = buscarManutencaoPorIdMock(id);
    if (!manutencao) {
      return erroJson(404, "MANUTENCAO_NOT_FOUND", "Manutenção não encontrada.");
    }

    const equipeId = resolverEquipeIdInstalador(usuario);
    if (manutencao.equipeId !== equipeId) {
      return erroJson(403, "ACCESS_DENIED", "Manutenção não pertence à equipe do instalador.");
    }

    const body = extrairDados<{ servicoExecutado?: unknown }>(config.data);
    const servico = typeof body?.servicoExecutado === "string" ? body.servicoExecutado : "";
    if (!servico.trim() || servico.includes("\0")) {
      return erroJson(400, "VALIDATION_ERROR", "Descreva o serviço executado para concluir a manutenção.");
    }

    if (manutencao.status === "Concluida") {
      return erroJson(400, "VALIDATION_ERROR", "A manutenção já está concluída.");
    }

    const concluida = concluirManutencaoArmazenada(id, servico);
    if (!concluida) {
      return erroJson(404, "MANUTENCAO_NOT_FOUND", "Manutenção não encontrada.");
    }
    return [200, concluida];
  });

  // POST /api/manutencoes/:id/comentarios — Rota #41
  mock.onPost(/\/manutencoes\/\d+\/comentarios\/?$/).reply((config) => {
    const usuario = resolverUsuarioAutenticadoMock(config.headers?.Authorization);
    if (!usuario) return erroJson(401, "UNAUTHORIZED", "Sessão ausente ou expirada.");
    if (usuario.perfil.nomePerfil !== "InstaladorCampo") {
      return erroJson(403, "ACCESS_DENIED", "Acesso restrito ao instalador de campo.");
    }

    const match = config.url?.match(/\/manutencoes\/(\d+)\/comentarios/);
    const id = match ? Number(match[1]) : 0;
    const manutencao = buscarManutencaoPorIdMock(id);
    if (!manutencao) {
      return erroJson(404, "MANUTENCAO_NOT_FOUND", "Manutenção não encontrada.");
    }

    const equipeId = resolverEquipeIdInstalador(usuario);
    if (manutencao.equipeId !== equipeId) {
      return erroJson(403, "ACCESS_DENIED", "Manutenção não pertence à equipe do instalador.");
    }

    const body = extrairDados<{ descricao?: unknown }>(config.data);
    const descricao = typeof body?.descricao === "string" ? body.descricao : "";
    if (!descricao.trim() || descricao.includes("\0")) {
      return erroJson(400, "VALIDATION_ERROR", "Informe a descrição do comentário.");
    }

    const comentario = criarComentarioManutencaoArmazenado(id, descricao, usuario.nome);
    if (!comentario) {
      return erroJson(404, "MANUTENCAO_NOT_FOUND", "Manutenção não encontrada.");
    }
    return [201, comentario];
  });
}
