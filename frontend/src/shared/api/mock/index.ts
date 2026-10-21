import MockAdapter from "axios-mock-adapter";
import { api } from "@/shared/api/api";
import { COLUNAS_KANBAN, TRANSICOES_VALIDAS, type StatusObra } from "@/shared/constants/kanbanStatus";
import type {
  CriarProgramacaoPayload,
  CriarEquipePayload,
  RelatorioCusto,
  Material,
  EditarObraPayload,
  ObraCard,
} from "@/types";
import {
  MOCK_USUARIOS,
  obterObrasArmazenadas,
  salvarObrasArmazenadas,
  adicionarObraArmazenada,
  atualizarStatusObraArmazenada,
  obterProgramacoesArmazenadas,
  atualizarProgramacaoDataArmazenada,
  criarProgramacaoArmazenada,
  deletarProgramacaoArmazenada,
  obterEquipesArmazenadas,
  obterMateriaisArmazenados,
  adicionarMaterialArmazenado,
  obterRelatorioArmazenado,
  obterHistoricoArmazenado,
  adicionarHistoricoArmazenado,
  obterComentariosArmazenados,
  adicionarComentarioArmazenado,
  obterHomologacaoObraArmazenada,
  obterCronogramaCompartilhadoFixture,
  excluirObraArmazenada,
  MOCK_INSTALADORES_DISPONIVEIS,
  adicionarEquipeArmazenada,
} from "./fixtures";
import { gerarPdfRelatorio, gerarExcelRelatorio } from "./pdfGenerator";
import { verificarSobreposicaoPeriodos } from "@/features/cronograma/lib/ganttCalculos";
import {
  proximoDiaUtil,
  normalizarDataMeioDiaUTC,
  calcularUltimoDiaUtil,
  formatarDataISO,
  formatarDataBR,
  normalizarDataFimInclusiva,
} from "@/shared/lib/formatters";

/**
 * Função utilitária para extrair com segurança o corpo de requisições,
 * suportando tanto string JSON quanto objetos já serializados pelo Axios.
 */
function extrairDados<T = Record<string, unknown>>(data: unknown): T {
  if (!data) return {} as T;
  if (typeof data === "object") return data as T;
  if (typeof data === "string") {
    try {
      return JSON.parse(data) as T;
    } catch {
      return {} as T;
    }
  }
  return {} as T;
}

/**
 * Extrai parâmetros de consulta (query params) mesclando
 * config.params com eventuais query strings embutidas na URL.
 */
function extrairQueryParams(config: { url?: string; params?: Record<string, unknown> }): Record<string, string> {
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

// Contador volátil em memória de falhas de login por e-mail (RN-02 / UC-01 FA3)
const tentativasFalhas: Record<string, number> = {};

// POST /auth/login (suporta com/sem prefixo e com/sem barra)
mock.onPost(/\/auth\/login\/?(\?.*)?$/).reply((config) => {
  try {
    const body = extrairDados<{ email?: string; senha?: string }>(config.data);
    const email = body.email?.toLowerCase().trim() || "";
    const senha = body.senha || "";

    // 1. Verificação de bloqueio por força bruta (RN-02: 5 falhas consecutivas)
    if (tentativasFalhas[email] && tentativasFalhas[email] >= 5) {
      return [
        423,
        {
          error: {
            code: "ACCOUNT_LOCKED",
            message: "Conta bloqueada por excesso de tentativas de login",
          },
        },
      ];
    }

    const usuarioMock = MOCK_USUARIOS[email];

    // 2. Validação canônica de credenciais (Senha padrão: Senha123!)
    if (!usuarioMock || senha !== "Senha123!") {
      tentativasFalhas[email] = (tentativasFalhas[email] || 0) + 1;

      if (tentativasFalhas[email] >= 5) {
        return [
          423,
          {
            error: {
              code: "ACCOUNT_LOCKED",
              message: "Conta bloqueada por excesso de tentativas de login",
            },
          },
        ];
      }

      return [
        401,
        {
          error: {
            code: "INVALID_CREDENTIALS",
            message: "E-mail ou senha incorretos",
          },
        },
      ];
    }

    // 3. Sucesso: zera tentativas de falha
    tentativasFalhas[email] = 0;

    const resposta = {
      token: `mock_jwt_token_${btoa(usuarioMock.email)}_${Date.now()}`,
      expiresAt: new Date(Date.now() + 480 * 60 * 1000).toISOString(),
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
      clienteId?: number;
      cliente?: { nome: string; cidade?: string };
      clienteNome?: string;
      cidade?: string;
      quantidadePaineis: number;
      dataInicioEstimada: string;
      dataFimEstimada: string;
    }>(config.data);

    const nomeCliente =
      payload.cliente?.nome ||
      payload.clienteNome ||
      (payload.clienteId ? `Cliente #${payload.clienteId}` : "Cliente Cadastrado");

    const novaObra = adicionarObraArmazenada({
      ...payload,
      clienteNome: nomeCliente,
      cidade: payload.cliente?.cidade || payload.cidade,
    });

    return [
      201,
      {
        id: novaObra.id,
        status: novaObra.status,
        clienteId: payload.clienteId || 1,
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
    const { statusNovo, observacao } = extrairDados<{ statusNovo?: StatusObra; observacao?: string }>(config.data);

    if (!statusNovo) {
      return [400, { error: { code: "MISSING_STATUS", message: "Novo status não informado" } }];
    }

    const obrasAntes = obterObrasArmazenadas();
    const obraAntes = obrasAntes.find((o) => Number(o.id) === id);

    if (!obraAntes) {
      return [404, { error: { code: "OBRA_NOT_FOUND", message: `Obra ${id} não encontrada` } }];
    }

    const statusAnterior = obraAntes.status;

    // Validação canônica estrita das transições permitidas (04-regras-negocio.md / Seção 2)
    const permitidos = TRANSICOES_VALIDAS[statusAnterior] || [];
    if (!permitidos.includes(statusNovo)) {
      const getLabel = (s: StatusObra) => COLUNAS_KANBAN.find((c) => c.id === s)?.label || s;
      const permitidosLabels = permitidos.map(getLabel).join(", ") || "Nenhum";
      return [
        400,
        {
          error: {
            code: "INVALID_STATUS_TRANSITION",
            message: `Transição não permitida: de "${getLabel(statusAnterior)}" para "${getLabel(statusNovo)}". Próximos status válidos: ${permitidosLabels}.`,
          },
        },
      ];
    }

    const obraAtualizada = atualizarStatusObraArmazenada(id, statusNovo);

    if (!obraAtualizada) {
      return [404, { error: { code: "OBRA_NOT_FOUND", message: `Obra ${id} não encontrada` } }];
    }

    // Registra evento formal de histórico (paridade com Rota #7 / Rota #10)
    adicionarHistoricoArmazenado(
      id,
      statusAnterior,
      statusNovo,
      observacao || `Status alterado de ${statusAnterior} para ${statusNovo}.`,
      { id: 1, nome: "Carlos Administrador" }
    );

    return [
      200,
      {
        id,
        statusAnterior,
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
        id: 1,
        nome: obra.clienteNome,
        cidade: obra.cidade || "Campinas",
      },
      pagamento: {
        id: 88,
        dataConfirmacao: "2026-09-15",
        prazoContratualDias: 45,
      },
      categoria: obra.categoria || "Residencial",
      quantidadePaineis: obra.quantidadePaineis,
      endereco: obra.endereco ?? "",
      descricao: obra.observacoes ?? "",
    },
  ];
});

// PUT /obras/:id (edição de dados cadastrais da obra - UC-17 / Rota #9)
mock.onPut(/\/obras\/\d+\/?$/).reply((config) => {
  try {
    const match = config.url?.match(/\/obras\/(\d+)/);
    const id = match ? Number(match[1]) : 0;
    const payload = extrairDados<EditarObraPayload>(config.data);

    const obras = obterObrasArmazenadas();
    const index = obras.findIndex((o) => Number(o.id) === id);

    if (index === -1) {
      return [404, { error: { code: "OBRA_NOT_FOUND", message: `Obra ${id} não encontrada` } }];
    }

    const obraExistente = obras[index];

    const obraAtualizada: ObraCard = {
      ...obraExistente,
      endereco: payload.endereco ?? obraExistente.endereco,
      cidade: payload.cidade ?? obraExistente.cidade,
      categoria: payload.categoria ?? obraExistente.categoria,
      quantidadePaineis: payload.quantidadePaineis ?? obraExistente.quantidadePaineis,
      dataFimEstimada: payload.dataFimEstimada ?? obraExistente.dataFimEstimada,
      observacoes: payload.descricao ?? obraExistente.observacoes,
    };

    obras[index] = obraAtualizada;
    salvarObrasArmazenadas(obras);

    // Resposta compatível com ObraDetalhe (Contrato) e ObraCard
    const respostaDetalhe = {
      ...obraAtualizada,
      id: obraAtualizada.id,
      status: obraAtualizada.status,
      dataInicioEstimada: "2026-10-01",
      dataFimEstimada: obraAtualizada.dataFimEstimada,
      dataInicioReal: null,
      dataFimReal: null,
      cliente: {
        id: 1,
        nome: obraAtualizada.clienteNome,
        cidade: obraAtualizada.cidade || "Campinas",
      },
      pagamento: {
        id: 88,
        dataConfirmacao: "2026-09-15",
        prazoContratualDias: obraAtualizada.prazoContratualDias || 45,
      },
      categoria: obraAtualizada.categoria || "Residencial",
      quantidadePaineis: obraAtualizada.quantidadePaineis,
      endereco: obraAtualizada.endereco ?? "",
      descricao: payload.descricao ?? obraAtualizada.observacoes ?? "",
    };

    return [200, respostaDetalhe];
  } catch {
    return [400, { error: { code: "INVALID_BODY", message: "Erro ao atualizar dados da obra" } }];
  }
});

// --- ROTAS DO GANTT ---

// GET /equipes
mock.onGet(/\/equipes\/?(\?.*)?$/).reply(() => [200, obterEquipesArmazenadas()]);

// GET /programacoes
mock.onGet(/\/programacoes\/?(\?.*)?$/).reply(() => [200, obterProgramacoesArmazenadas()]);

// PUT /programacoes/:id/reordenar (Contrato Rota #24 — com programacoesAfetadas)
mock.onPut(/\/programacoes\/\d+\/reordenar\/?(\?.*)?$/).reply((config) => {
  try {
    const match = config.url?.match(/\/programacoes\/(\d+)\/reordenar/);
    const id = match ? Number(match[1]) : 0;
    const body = extrairDados<{ novaDataInicio?: string; novaDataFim?: string }>(config.data);
    if (!body.novaDataInicio && !body.novaDataFim)
      return [400, { error: { message: "Nenhuma data informada para reordenação" } }];

    const resultado = atualizarProgramacaoDataArmazenada(id, body.novaDataInicio, body.novaDataFim);
    if (!resultado) return [404, { error: { message: "Não encontrada" } }];

    // Resposta espelhando fielmente o contrato da API (Rota #24)
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

// ─── MATERIAIS ───
// GET /obras/:id/materiais
mock.onGet(/\/obras\/\d+\/materiais\/?(\?.*)?$/).reply((config) => {
  const match = config.url?.match(/\/obras\/(\d+)\/materiais/);
  const obraId = match ? Number(match[1]) : 0;
  const itens = obterMateriaisArmazenados().filter(m => m.obraId === obraId);
  return [200, itens];
});

// POST /obras/:id/materiais
mock.onPost(/\/obras\/\d+\/materiais\/?$/).reply((config) => {
  const match = config.url?.match(/\/obras\/(\d+)\/materiais/);
  const obraId = match ? Number(match[1]) : 0;
  try {
    const body = extrairDados<Omit<Material, "id" | "obraId">>(config.data);
    const novo = adicionarMaterialArmazenado(obraId, body);
    return [201, novo];
  } catch {
    return [400, { error: { message: "Erro ao adicionar material" } }];
  }
});

// ─── HISTÓRICO E COMENTÁRIOS ───
// GET /obras/:id/historico
mock.onGet(/\/obras\/\d+\/historico\/?(\?.*)?$/).reply((config) => {
  const match = config.url?.match(/\/obras\/(\d+)\/historico/);
  const obraId = match ? Number(match[1]) : 0;
  const itens = obterHistoricoArmazenado().filter(h => h.obraId === obraId);
  return [200, itens];
});

// GET /obras/:id/comentarios
mock.onGet(/\/obras\/\d+\/comentarios\/?(\?.*)?$/).reply((config) => {
  const match = config.url?.match(/\/obras\/(\d+)\/comentarios/);
  const obraId = match ? Number(match[1]) : 0;
  const itens = obterComentariosArmazenados().filter(c => c.obraId === obraId);
  return [200, itens];
});

// POST /obras/:id/comentarios
mock.onPost(/\/obras\/\d+\/comentarios\/?$/).reply((config) => {
  const match = config.url?.match(/\/obras\/(\d+)\/comentarios/);
  const obraId = match ? Number(match[1]) : 0;
  try {
    const body = extrairDados<{ descricao: string }>(config.data);
    
    // Obtém o usuário logado para atribuir ao comentário
    const authHeader = config.headers?.Authorization || "";
    let usuario = MOCK_USUARIOS["engenharia@zlengenharia.com"];
    if (authHeader.includes("admin")) usuario = MOCK_USUARIOS["admin@zl.com.br"];
    else if (authHeader.includes("mock_jwt_token_")) {
      const matchToken = authHeader.match(/mock_jwt_token_([A-Za-z0-9+/=]+)_/);
      if (matchToken && matchToken[1]) {
        const emailDecodificado = atob(matchToken[1]);
        if (MOCK_USUARIOS[emailDecodificado]) usuario = MOCK_USUARIOS[emailDecodificado];
      }
    }

    const novo = adicionarComentarioArmazenado(obraId, body.descricao, { id: usuario.id, nome: usuario.nome });
    return [201, novo];
  } catch {
    return [400, { error: { message: "Erro ao adicionar comentário" } }];
  }
});

// ─── RELATÓRIOS ───
// GET /obras/:id/relatorio-custo
mock.onGet(/\/obras\/\d+\/relatorio-custo\/?(\?.*)?$/).reply((config) => {
  const match = config.url?.match(/\/obras\/(\d+)\/relatorio-custo/);
  const obraId = match ? Number(match[1]) : 0;
  const relatorio = obterRelatorioArmazenado(obraId);
  if (!relatorio) {
    return [404, { error: { message: "Relatório não encontrado ou sem lançamentos." } }];
  }
  return [200, relatorio];
});

// GET /relatorios/export (Gera PDF ou Excel com base em todas as obras cadastradas)
mock.onGet(/\/relatorios\/export\/?(\?.*)?$/).reply((config) => {
  const params = extrairQueryParams(config);
  const formato = params.formato === "excel" ? "excel" : "pdf";
  const obraId = params.obraId ? Number(params.obraId) : null;

  const obras = obterObrasArmazenadas();
  // Garante que todas as obras possuam relatório calculado
  const relatorios: Record<number, RelatorioCusto> = {};
  for (const o of obras) {
    const rel = obterRelatorioArmazenado(o.id);
    if (rel) {
      relatorios[o.id] = rel;
    }
  }

  if (formato === "excel") {
    const blob = gerarExcelRelatorio(obras, relatorios, obraId);
    return [200, blob];
  }

  const blob = gerarPdfRelatorio(obras, relatorios, obraId);
  return [200, blob];
});

// POST /programacoes (Rota #23 do Contrato Canônico)
mock.onPost(/\/programacoes\/?(\?.*)?$/).reply((config) => {
  try {
    const body = extrairDados<CriarProgramacaoPayload>(config.data);
    if (!body.obraId || !body.equipeId || !body.dataInicio) {
      return [400, { error: { code: "VALIDATION_ERROR", message: "Campos obrigatórios ausentes" } }];
    }

    const progs = obterProgramacoesArmazenadas();
    const equipes = obterEquipesArmazenadas();

    // 1. Identificar se há colisão temporal para a mesma equipe
    const novaDataInicio = body.dataInicio;
    let novaDataFim = body.dataFim;

    if (!novaDataFim && body.obraId) {
      const obras = obterObrasArmazenadas();
      const obra = obras.find((o) => Number(o.id) === Number(body.obraId));
      const paineis = obra?.quantidadePaineis || 9;
      const duracaoDias = Math.max(1, Math.ceil(paineis / 9));
      const iniSanitizado = proximoDiaUtil(normalizarDataMeioDiaUTC(novaDataInicio));
      const fimCalculado = calcularUltimoDiaUtil(iniSanitizado, duracaoDias);
      novaDataFim = formatarDataISO(fimCalculado);
    }

    if (body.equipeId && novaDataInicio && novaDataFim) {
      const colidente = progs.find((p) => {
        if (Number(p.equipeId) !== Number(body.equipeId)) return false;
        return verificarSobreposicaoPeriodos(
          novaDataInicio,
          novaDataFim,
          p.dataInicio,
          p.dataFim
        );
      });

      if (colidente) {
        const equipe = equipes.find((e) => e.id === Number(body.equipeId));
        const nomeEquipe = equipe?.nome || `Equipe ${body.equipeId}`;
        const fimFormatado = formatarDataBR(normalizarDataFimInclusiva(colidente.dataFim));
        const iniFormatado = formatarDataBR(colidente.dataInicio);

        return [
          409,
          {
            error: {
              code: "SCHEDULE_CONFLICT",
              message: `A ${nomeEquipe} já possui a Obra #${colidente.obraId} agendada de ${iniFormatado} a ${fimFormatado} neste período.`,
            },
          },
        ];
      }
    }

    const criada = criarProgramacaoArmazenada(body);
    return [201, criada];
  } catch {
    return [400, { error: { code: "BAD_REQUEST", message: "Erro ao criar alocação mockada" } }];
  }
});

// DELETE /programacoes/:id (dívida restrita ao mock (sem rota no contrato canônico))
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

// GET /cronograma/compartilhado/{token} (RF-16: Cronograma/Relatório Público em modo leitura)
mock.onGet(/\/cronograma\/compartilhado\/[^/]+/).reply((config) => {
  const match = config.url?.match(/\/cronograma\/compartilhado\/([^/?]+)/);
  const token = match ? match[1] : "";
  if (!token || token === "invalido") {
    return [
      401,
      { error: { code: "UNAUTHORIZED", message: "Token de cronograma inválido ou expirado." } },
    ];
  }

  try {
    const decoded = atob(token);
    if (decoded.includes("|")) {
      const [periodoInicio, periodoFim, clienteFiltro] = decoded.split("|");
      const obrasArmazenadas = obterObrasArmazenadas();
      
      const obrasFiltradas = obrasArmazenadas.filter((o) => {
        const passaCliente = !clienteFiltro || clienteFiltro === "todos" || o.clienteNome.toLowerCase() === clienteFiltro.toLowerCase();
        return passaCliente;
      });

      const totalPaineis = obrasFiltradas.reduce((acc, o) => acc + (o.quantidadePaineis || 0), 0);

      return [
        200,
        {
          periodoInicio: periodoInicio || "",
          periodoFim: periodoFim || "",
          clienteFiltro: clienteFiltro || "todos",
          obras: obrasFiltradas,
          totalObras: obrasFiltradas.length,
          obrasConcluidas: obrasFiltradas.filter((o) => o.status === "Concluido").length,
          totalPaineis,
        },
      ];
    }
  } catch {
    // Continua para o Gantt fixture caso não seja token do relatório em base64
  }

  const params = config.params as { dataInicio?: string; dataFim?: string } | undefined;
  const dados = obterCronogramaCompartilhadoFixture(token, params);
  return [200, dados];
});

// DELETE /obras/:id — UC-11 / UC-16 com bloqueio severo UC-11 RN2 / FA2
mock.onDelete(/\/obras\/\d+\/?(\?.*)?$/).reply((config) => {
  const match = config.url?.match(/\/obras\/(\d+)/);
  const id = match ? Number(match[1]) : NaN;
  if (isNaN(id)) {
    return [400, { error: { code: "INVALID_PARAMETER", message: "ID de obra inválido" } }];
  }

  const obras = obterObrasArmazenadas();
  const obra = obras.find((o) => Number(o.id) === id);
  if (!obra) {
    return [404, { error: { code: "OBRA_NOT_FOUND", message: `Obra ${id} não encontrada` } }];
  }

  // Regra de Negócio: Obra em execução não pode ser apagada
  if (obra.status === "EmAndamento") {
    return [
      400,
      {
        error: {
          code: "OBRA_EM_EXECUCAO",
          message: "Obras com status Em Andamento não podem ser apagadas.",
        },
      },
    ];
  }

  // Regra de Negócio: Obra com alocação no Gantt não pode ser apagada
  const programacoes = obterProgramacoesArmazenadas();
  const temAlocacao = programacoes.some((p) => Number(p.obraId) === id);
  if (temAlocacao) {
    return [
      400,
      {
        error: {
          code: "OBRA_ALOCADA",
          message: "Esta obra possui equipe e cronograma agendado no Gantt. É necessário desalocá-la antes da exclusão.",
        },
      },
    ];
  }

  const sucesso = excluirObraArmazenada(id);
  if (!sucesso) {
    return [404, { error: { code: "OBRA_NOT_FOUND", message: "Erro ao excluir obra mockada" } }];
  }

  return [204];
});

// GET /api/instaladores — Instaladores para montagem de equipes
mock.onGet(/\/instaladores\/?(\?.*)?$/).reply(() => [200, MOCK_INSTALADORES_DISPONIVEIS]);

// GET /api/equipes — Listagem de equipes
mock.onGet(/\/equipes\/?(\?.*)?$/).reply(() => [200, obterEquipesArmazenadas()]);

// POST /api/equipes — Criação de equipe com validação
mock.onPost(/\/equipes\/?(\?.*)?$/).reply((config) => {
  const payload = extrairDados<CriarEquipePayload>(config.data);
  if (!payload.nome?.trim() || !payload.responsavelId || !payload.instaladorIds?.length) {
    return [
      400,
      {
        error: {
          code: "VALIDATION_ERROR",
          message: "Nome, ao menos um instalador e um responsável são obrigatórios.",
        },
      },
    ];
  }
  const equipe = adicionarEquipeArmazenada(payload);
  return [201, equipe];
});

// ATENÇÃO: PassThrough obrigatório para requisições não mockadas passarem livremente
mock.onAny().passThrough();

export default mock;


