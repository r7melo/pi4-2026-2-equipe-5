import MockAdapter from "axios-mock-adapter";
import { api } from "@/services/api";
import type { StatusObra } from "@/constants/kanbanStatus";
import type { CriarProgramacaoPayload } from "@/types";
import {
  MOCK_USUARIOS,
  obterObrasArmazenadas,
  adicionarObraArmazenada,
  atualizarStatusObraArmazenada,
  obterProgramacoesArmazenadas,
  atualizarProgramacaoDataArmazenada,
  criarProgramacaoArmazenada,
  deletarProgramacaoArmazenada,
  obterEquipesArmazenadas,
  obterHomologacaoObraArmazenada,
  obterCronogramaCompartilhadoFixture,
} from "./fixtures";

/**
 * Função utilitária para extrair com segurança o corpo de requisições,
 * suportando tanto string JSON quanto objetos já serializados pelo Axios.
 */
function extrairDados<T = Record<string, any>>(data: any): T {
  if (!data) return {} as T;
  if (typeof data === "object") return data as T;
  try {
    return JSON.parse(data) as T;
  } catch {
    return {} as T;
  }
}

/**
 * Extrai parâmetros de consulta (query params) mesclando
 * config.params com eventuais query strings embutidas na URL.
 */
function extrairQueryParams(config: { url?: string; params?: Record<string, any> }): Record<string, string> {
  const params: Record<string, string> = {};

  if (config.params) {
    for (const [k, v] of Object.entries(config.params)) {
      if (v !== undefined && v !== null) params[k] = String(v);
    }
  }

  if (config.url && config.url.includes("?")) {
    const search = config.url.split("?")[1];
    const searchParams = new URLSearchParams(search);
    searchParams.forEach((val, key) => {
      if (!params[key]) params[key] = val;
    });
  }

  return params;
}

/**
 * Mock Engine para simulação autônoma do backend ASP.NET Core.
 * Intercepta chamadas na instância Singleton 'api'.
 */
const mock = new MockAdapter(api, { delayResponse: 0 });

console.log("🚧 [MOCK MODE] Backend simulado ativo com axios-mock-adapter (delay: 0ms)");

// --- ROTAS DE AUTENTICAÇÃO ---

// POST /auth/login (suporta com/sem prefixo e com/sem barra)
mock.onPost(/\/auth\/login\/?(\?.*)?$/).reply((config) => {
  try {
    const body = extrairDados<{ email?: string; senha?: string }>(config.data);
    const email = body.email?.toLowerCase().trim();
    const usuarioMock =
      (email && MOCK_USUARIOS[email]) || MOCK_USUARIOS["engenharia@zlengenharia.com"];

    const resposta = {
      token: `mock_jwt_token_${btoa(usuarioMock.email)}_${Date.now()}`,
      expiresAt: new Date(Date.now() + 86400000).toISOString(),
      usuario: {
        id: usuarioMock.id,
        nome: usuarioMock.nome,
        email: usuarioMock.email,
        perfil: usuarioMock.perfil.nomePerfil,
        equipeId: usuarioMock.equipeId,
      },
    };

    return [200, resposta];
  } catch {
    return [400, { error: { code: "INVALID_BODY", message: "Corpo da requisição de login inválido" } }];
  }
});

// GET /auth/me (identifica o usuário autenticado através do token)
mock.onGet(/\/auth\/me\/?(\?.*)?$/).reply((config) => {
  const authHeader = config.headers?.Authorization || "";
  let usuario = MOCK_USUARIOS["engenharia@zlengenharia.com"];

  try {
    if (authHeader.includes("mock_jwt_token_")) {
      const match = authHeader.match(/mock_jwt_token_([A-Za-z0-9+/=]+)_/);
      if (match && match[1]) {
        const emailDecodificado = atob(match[1]);
        if (MOCK_USUARIOS[emailDecodificado]) {
          usuario = MOCK_USUARIOS[emailDecodificado];
        }
      }
    } else if (authHeader.includes("admin")) {
      usuario = MOCK_USUARIOS["admin@zl.com.br"];
    } else if (authHeader.includes("instalador")) {
      usuario = MOCK_USUARIOS["instalador@zl.com.br"];
    }
  } catch {
    // Mantém fallback seguro
  }

  return [200, usuario];
});

// POST /auth/logout
mock.onPost(/\/auth\/logout\/?(\?.*)?$/).reply(() => {
  return [200, { mensagem: "Logout realizado com sucesso" }];
});

// --- ROTAS DE OBRAS ---

// GET /obras (com suporte a filtros por status, clienteNome e paginação)
mock.onGet(/\/obras\/?(\?.*)?$/).reply((config) => {
  const params = extrairQueryParams(config);
  let itens = obterObrasArmazenadas();

  if (params.status) {
    itens = itens.filter((o) => o.status === params.status);
  }

  if (params.clienteNome) {
    const termo = params.clienteNome.toLowerCase().trim();
    itens = itens.filter((o) => o.clienteNome.toLowerCase().includes(termo));
  }

  const page = Number(params.page) || 1;
  const pageSize = Number(params.pageSize) || 200;

  return [
    200,
    {
      page,
      pageSize,
      total: itens.length,
      itens,
    },
  ];
});

// POST /obras (cadastra e persiste no sessionStorage)
mock.onPost(/\/obras\/?(\?.*)?$/).reply((config) => {
  try {
    const payload = extrairDados<{
      clienteNome: string;
      cidade?: string;
      quantidadePaineis: number;
      dataInicioEstimada: string;
      dataFimEstimada: string;
      clienteId?: number;
    }>(config.data);

    const novaObra = adicionarObraArmazenada(payload);

    return [
      201,
      {
        id: novaObra.id,
        status: novaObra.status,
        clienteId: payload.clienteId || 45,
        dataInicioEstimada: payload.dataInicioEstimada,
        dataFimEstimada: payload.dataFimEstimada,
        dataInicioReal: null,
        dataFimReal: null,
        criadoEm: new Date().toISOString(),
      },
    ];
  } catch {
    return [400, { error: { code: "INVALID_PAYLOAD", message: "Erro ao cadastrar obra mockada" } }];
  }
});

// PATCH /obras/:id/status (atualiza status e persiste no sessionStorage)
mock.onPatch(/\/obras\/\d+\/status\/?(\?.*)?$/).reply((config) => {
  try {
    const match = config.url?.match(/\/obras\/(\d+)\/status/);
    const id = match ? Number(match[1]) : 0;
    const { statusNovo } = extrairDados<{ statusNovo?: StatusObra }>(config.data);

    if (!statusNovo) {
      return [400, { error: { code: "MISSING_STATUS", message: "Novo status não informado" } }];
    }

    const obraAtualizada = atualizarStatusObraArmazenada(id, statusNovo);

    if (!obraAtualizada) {
      return [404, { error: { code: "OBRA_NOT_FOUND", message: `Obra ${id} não encontrada` } }];
    }

    return [
      200,
      {
        id,
        statusAnterior: "",
        statusNovo,
        dataAlteracao: new Date().toISOString(),
        emailNotificacaoEnviado: statusNovo === "Concluido",
      },
    ];
  } catch {
    return [400, { error: { code: "INVALID_BODY", message: "Erro ao processar movimentação de status" } }];
  }
});

// GET /obras/:id (detalhe de obra específica)
mock.onGet(/\/obras\/\d+\/?(\?.*)?$/).reply((config) => {
  const match = config.url?.match(/\/obras\/(\d+)/);
  const id = match ? Number(match[1]) : 0;
  const obras = obterObrasArmazenadas();
  const obra = obras.find((o) => Number(o.id) === id);

  if (!obra) {
    return [404, { error: { code: "OBRA_NOT_FOUND", message: `Obra ${id} não encontrada` } }];
  }

  return [
    200,
    {
      id: obra.id,
      status: obra.status,
      dataInicioEstimada: "2026-10-01",
      dataFimEstimada: obra.dataFimEstimada,
      dataInicioReal: null,
      dataFimReal: null,
      cliente: {
        id: 45,
        nome: obra.clienteNome,
        cidade: "Campinas",
      },
      pagamento: {
        id: 88,
        dataConfirmacao: "2026-09-15",
        prazoContratualDias: 45,
      },
    },
  ];
});

// --- ROTAS DO GANTT ---

// GET /equipes
mock.onGet(/\/equipes\/?(\?.*)?$/).reply(() => [200, obterEquipesArmazenadas()]);

// GET /programacoes
mock.onGet(/\/programacoes\/?(\?.*)?$/).reply(() => [200, obterProgramacoesArmazenadas()]);

// PUT /programacoes/:id/reordenar (Contrato Rota #16 — com programacoesAfetadas)
mock.onPut(/\/programacoes\/\d+\/reordenar\/?(\?.*)?$/).reply((config) => {
  try {
    const match = config.url?.match(/\/programacoes\/(\d+)\/reordenar/);
    const id = match ? Number(match[1]) : 0;
    const body = extrairDados<{ novaDataInicio?: string; novaDataFim?: string }>(config.data);
    if (!body.novaDataInicio && !body.novaDataFim)
      return [400, { error: { message: "Nenhuma data informada para reordenação" } }];

    const resultado = atualizarProgramacaoDataArmazenada(id, body.novaDataInicio, body.novaDataFim);
    if (!resultado) return [404, { error: { message: "Não encontrada" } }];

    // Resposta espelhando fielmente o contrato da API (Rota #16)
    return [
      200,
      {
        id,
        novaDataInicio: resultado.principal.dataInicio,
        novaDataFim: resultado.principal.dataFim,
        programacoesAfetadas: resultado.afetadas,
      },
    ];
  } catch {
    return [400, { error: { message: "Erro na reordenação" } }];
  }
});

// POST /programacoes (Rota #15)
mock.onPost(/\/programacoes\/?(\?.*)?$/).reply((config) => {
  try {
    const body = extrairDados<CriarProgramacaoPayload>(config.data);
    const criada = criarProgramacaoArmazenada(body);
    return [201, criada];
  } catch {
    return [400, { error: { code: "BAD_REQUEST", message: "Erro ao criar alocação mockada" } }];
  }
});

// DELETE /programacoes/:id (Rota #22 — Desalocação)
mock.onDelete(/\/programacoes\/\d+\/?(\?.*)?$/).reply((config) => {
  const match = config.url?.match(/\/programacoes\/(\d+)/);
  if (!match) return [400, { error: { code: "BAD_REQUEST", message: "ID inválido" } }];
  const id = Number(match[1]);
  const sucesso = deletarProgramacaoArmazenada(id);
  if (!sucesso) return [404, { error: { code: "NOT_FOUND", message: "Alocação não encontrada" } }];
  return [204];
});

// GET /obras/:id/homologacao (Rota #17)
mock.onGet(/\/obras\/\d+\/homologacao\/?(\?.*)?$/).reply((config) => {
  const match = config.url?.match(/\/obras\/(\d+)\/homologacao/);
  const id = match ? Number(match[1]) : 0;
  const homologacao = obterHomologacaoObraArmazenada(id);
  return [200, homologacao];
});

// GET /cronograma/compartilhado/:token (Rota #21 do contrato — RF-16)
mock.onGet(/\/cronograma\/compartilhado\/[^/]+/).reply((config) => {
  const match = config.url?.match(/\/cronograma\/compartilhado\/([^/?]+)/);
  const token = match ? match[1] : "";
  if (!token || token === "invalido") {
    return [
      401,
      { error: { code: "UNAUTHORIZED", message: "Token de cronograma inválido ou expirado." } },
    ];
  }
  const params = config.params as { dataInicio?: string; dataFim?: string } | undefined;
  const dados = obterCronogramaCompartilhadoFixture(token, params);
  return [200, dados];
});

// ATENÇÃO: PassThrough obrigatório para requisições não mockadas passarem livremente
mock.onAny().passThrough();

export default mock;
