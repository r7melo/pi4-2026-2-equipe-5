import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import MockAdapter from "axios-mock-adapter";
import { formatarCpfCnpj, formatarTelefone } from "@/shared/lib/validacoesDocumento";
import { api } from "@/shared/api/api";
import { registrarObras } from "@/shared/api/mock/handlers/obras";
import { coordenarTransporteMock } from "@/shared/api/mock/core/coordenacao";
import { geracaoCenario, iniciarCenario } from "@/shared/api/mock/core/estadoCenario";
import { clientesCenario, detalheCenario } from "@/shared/api/mock/dados/detalhes";
import { useAuthStore } from "@/shared/stores/useAuthStore";
import { novaObraSchema } from "@/shared/types/obrasCadastro";
import { novaObraSchema as novaObraSchemaFeature } from "@/features/obras/types/obrasCadastro";
import { editarObraFormSchema, mapearValoresFormularioObra } from "@/features/obras/lib/editarObraFormulario";
import { atualizarObra, criarObra } from "@/features/obras/services/obras";
import { listarClientes } from "@/features/obras/services/clientes";
import { isRotaAutorizadaParaPerfil, obterELimparRotaRetorno } from "@/shared/lib/rotasSessao";
import { capturarSessaoOperacional } from "@/shared/lib/sessaoOperacao";
import type { ObraDetalhe } from "@/features/obras/types/obras";
import type { Usuario } from "@/shared/types/autorizacao";

function criarStorageMemoria(): Storage {
  const mapa = new Map<string, string>();
  return {
    get length() {
      return mapa.size;
    },
    clear() {
      mapa.clear();
    },
    getItem(chave: string) {
      return mapa.get(chave) ?? null;
    },
    key(indice: number) {
      return Array.from(mapa.keys())[indice] ?? null;
    },
    removeItem(chave: string) {
      mapa.delete(chave);
    },
    setItem(chave: string, valor: string) {
      mapa.set(chave, String(valor));
    },
  };
}

const usuarioAdminTeste: Usuario = {
  id: 1,
  nome: "Carlos Administrador",
  email: "admin@zl.com.br",
  perfil: { id: 1, nomePerfil: "Administrador", permissoes: ["*"] },
  equipeId: null,
};

describe("Validação e Criação de Obras (Frente Obras - 02 Railton)", () => {
  it("deve formatar corretamente CPF (11 dígitos) e CNPJ (14 dígitos)", () => {
    expect(formatarCpfCnpj("12345678901")).toBe("123.456.789-01");
    expect(formatarCpfCnpj("12345678000195")).toBe("12.345.678/0001-95");
    expect(formatarCpfCnpj("")).toBe("");
  });

  it("deve formatar corretamente Telefone (10 e 11 dígitos)", () => {
    expect(formatarTelefone("88999998888")).toBe("(88) 99999-8888");
    expect(formatarTelefone("8833334444")).toBe("(88) 3333-4444");
    expect(formatarTelefone("")).toBe("");
  });
});

describe("novaObraSchema e validação padronizada de e-mail", () => {
  const baseExistente = {
    tipoCliente: "existente" as const,
    clienteId: "1",
    quantidadePaineis: "16",
    quantidadeInversores: "2",
    dataInicioEstimada: "2026-11-10",
    dataFimEstimada: "2026-11-25",
    categoria: "Residencial" as const,
    pagamento: { prazoContratualDias: "30" },
  };

  const baseNovo = {
    tipoCliente: "novo" as const,
    clienteNome: "Solar Norte Ltda",
    cpfCnpj: "52998224725",
    cidade: "Campinas",
    endereco: "Av. Brasil, 1000",
    telefone: "(19) 99999-8888",
    email: "contato@solarnorte.com.br",
    categoria: "Comercial" as const,
    quantidadePaineis: 24,
    quantidadeInversores: 1,
    dataInicioEstimada: "2026-11-10",
    dataFimEstimada: "2026-11-25",
    pagamento: { prazoContratualDias: 45 },
  };

  it("mantém referência única com a feature e valida cliente existente com coerção numérica", () => {
    expect(novaObraSchema).toBe(novaObraSchemaFeature);

    const valido = novaObraSchema.parse(baseExistente);
    expect(valido.clienteId).toBe(1);
    expect(valido.quantidadePaineis).toBe(16);
    expect(valido.quantidadeInversores).toBe(2);
    expect(valido.pagamento.prazoContratualDias).toBe(30);

    const semCliente = novaObraSchema.safeParse({ ...baseExistente, clienteId: undefined });
    expect(semCliente.success).toBe(false);
  });

  it("valida CPF/CNPJ e aplica EMAIL_USUARIO rejeitando sintaxes inválidas e aceitando válido ou vazio", () => {
    expect(novaObraSchema.safeParse(baseNovo).success).toBe(true);
    expect(novaObraSchema.safeParse({ ...baseNovo, cpfCnpj: "11222333000181" }).success).toBe(true);
    expect(novaObraSchema.safeParse({ ...baseNovo, cpfCnpj: "11111111111" }).success).toBe(false);
    expect(novaObraSchema.safeParse({ ...baseNovo, cpfCnpj: "52998224720" }).success).toBe(false);

    for (const emailValido of ["contato@cliente.com.br", "user+tag@sub.dominio.com", "", "   ", undefined]) {
      expect(novaObraSchema.safeParse({ ...baseNovo, email: emailValido }).success, String(emailValido)).toBe(true);
    }

    for (const emailInvalido of ["a@b..c", "contato@-dominio.com", "sem-tld@localhost", "usuario@dominio..com.br"]) {
      const resultado = novaObraSchema.safeParse({ ...baseNovo, email: emailInvalido });
      expect(resultado.success, emailInvalido).toBe(false);
      if (!resultado.success) {
        expect(resultado.error.issues.some((i) => i.path.includes("email") && i.message === "E-mail com formato inválido")).toBe(true);
      }
    }

    const datasInvertidas = novaObraSchema.safeParse({ ...baseNovo, dataFimEstimada: "2026-11-01" });
    expect(datasInvertidas.success).toBe(false);
    if (!datasInvertidas.success) {
      expect(datasInvertidas.error.issues.some((i) => i.message === "Data Final menor que Data Inicial")).toBe(true);
    }
  });
});

describe("mapearValoresFormularioObra e editarObraFormSchema", () => {
  it("mapeia os 9 campos iniciais com datas normalizadas e preserva quantidadeInversores=0", () => {
    const obra: ObraDetalhe = {
      id: 301,
      status: "MaterialComprado",
      dataInicioEstimada: "2026-11-10T00:00:00Z",
      dataFimEstimada: "2026-11-25T12:30:00Z",
      cliente: { id: 1, nome: "Cliente Alfa", cidade: "Campinas" },
      pagamento: { id: 1301, prazoContratualDias: 45, dataConfirmacao: "2026-11-01" },
      categoria: "Comercial",
      endereco: "Rua das Flores, 50",
      descricao: "Acesso pela portaria B",
      quantidadePaineis: 32,
      quantidadeInversores: 0,
    };

    expect(mapearValoresFormularioObra(obra)).toEqual({
      cidade: "Campinas",
      endereco: "Rua das Flores, 50",
      categoria: "Comercial",
      quantidadePaineis: 32,
      quantidadeInversores: 0,
      prazoContratualDias: 45,
      dataInicioEstimada: "2026-11-10",
      dataFimEstimada: "2026-11-25",
      descricao: "Acesso pela portaria B",
    });
  });

  it("aplica fallbacks para campos ausentes ou categoria fora do par permitido e valida schema", () => {
    const obraParcial: ObraDetalhe = {
      id: 302,
      status: "NoDeposito",
      dataInicioEstimada: "",
      dataFimEstimada: "",
      cliente: { id: 2, nome: "Cliente Beta", cidade: null },
      pagamento: { id: 1302, prazoContratualDias: 30 },
      categoria: "Industrial",
      descricao: null,
    };

    const valores = mapearValoresFormularioObra(obraParcial);
    expect(valores).toEqual({
      cidade: "",
      endereco: "",
      categoria: "Residencial",
      quantidadePaineis: 1,
      quantidadeInversores: 1,
      prazoContratualDias: 30,
      dataInicioEstimada: "",
      dataFimEstimada: "",
      descricao: "",
    });

    expect(editarObraFormSchema.safeParse({ ...valores, cidade: "Itu", endereco: "Rua 10, 200" }).success).toBe(true);
    expect(editarObraFormSchema.safeParse({ ...valores, cidade: "A", endereco: "Rua 10, 200" }).success).toBe(false);
    expect(editarObraFormSchema.safeParse({ ...valores, cidade: "Itu", endereco: "Rua 10, 200", quantidadePaineis: 0 }).success).toBe(false);
    expect(editarObraFormSchema.safeParse({ ...valores, cidade: "Itu", endereco: "Rua 10, 200", quantidadePaineis: 2.5 }).success).toBe(false);
    expect(editarObraFormSchema.safeParse({ ...valores, cidade: "Itu", endereco: "Rua 10, 200", prazoContratualDias: 0 }).success).toBe(false);
  });
});

describe("criarObra e atualizarObra integrados ao handler real registrarObras", () => {
  let adapterOriginal: typeof api.defaults.adapter;
  let mock: MockAdapter | undefined;

  beforeEach(async () => {
    const localStorageMem = criarStorageMemoria();
    const sessionStorageMem = criarStorageMemoria();
    vi.stubGlobal("localStorage", localStorageMem);
    vi.stubGlobal("sessionStorage", sessionStorageMem);
    vi.stubGlobal("navigator", {
      locks: {
        request: (_nome: string, _opcoes: unknown, tarefa: () => Promise<unknown> | unknown) => Promise.resolve(tarefa()),
      },
    });
    vi.stubGlobal("window", {
      localStorage: localStorageMem,
      sessionStorage: sessionStorageMem,
      dispatchEvent: vi.fn(),
    });

    adapterOriginal = api.defaults.adapter;
    mock = new MockAdapter(api);
    registrarObras(mock);
    coordenarTransporteMock();
    await iniciarCenario();
  });

  afterEach(() => {
    useAuthStore.getState().logout();
    mock?.restore();
    api.defaults.adapter = adapterOriginal;
    vi.unstubAllGlobals();
  });

  function autenticarSessao(): void {
    const token = `mock_jwt_token_${btoa(usuarioAdminTeste.email)}_${Date.now()}_v0_a0_g${geracaoCenario()}`;
    useAuthStore.getState().login(token, usuarioAdminTeste, "2099-01-01T00:00:00Z");
  }

  it("rejeita POST /obras com 401 quando não há token autenticado e descarta sessão anterior", async () => {
    await expect(
      criarObra({
        clienteId: 1,
        clienteNome: "Mercado Horizonte",
        endereco: "Rua 1, 100",
        cidade: "Campinas",
        categoria: "Residencial",
        quantidadePaineis: 12,
        quantidadeInversores: 1,
        dataInicioEstimada: "2026-12-01",
        dataFimEstimada: "2026-12-10",
        pagamento: { prazoContratualDias: 30 },
      }),
    ).rejects.toMatchObject({ response: { status: 401 } });
  });

  it("cria obra com cliente existente e cliente novo em 201 repassando sessao403 e persistindo no cenário", async () => {
    autenticarSessao();
    const sessao = capturarSessaoOperacional();

    await expect(
      criarObra(
        {
          clienteId: 1,
          clienteNome: "Mercado Horizonte",
          endereco: "Rua do Cenário 1, 100",
          cidade: "Campinas",
          categoria: "Comercial",
          quantidadePaineis: 18,
          quantidadeInversores: 2,
          dataInicioEstimada: "2026-12-01",
          dataFimEstimada: "2026-12-12",
          pagamento: { prazoContratualDias: 30, dataConfirmacao: "2026-12-01" },
        },
        sessao - 1,
      ),
    ).rejects.toThrow("Operação de uma sessão encerrada.");

    const criadaExistente = await criarObra(
      {
        clienteId: 1,
        clienteNome: "Mercado Horizonte",
        endereco: "Rua do Cenário 1, 100",
        cidade: "Campinas",
        categoria: "Comercial",
        quantidadePaineis: 18,
        quantidadeInversores: 2,
        dataInicioEstimada: "2026-12-01",
        dataFimEstimada: "2026-12-12",
        pagamento: { prazoContratualDias: 30, dataConfirmacao: "2026-12-01" },
      },
      sessao,
    );

    expect(criadaExistente.id).toBeGreaterThan(300);
    expect(criadaExistente.clienteId).toBe(1);
    expect(criadaExistente.status).toBe("MaterialComprado");
    expect(criadaExistente.quantidadePaineis).toBe(18);
    expect(criadaExistente.dataFimEstimada).toBe("2026-12-12");
    expect(detalheCenario(criadaExistente.id)?.quantidadeInversores).toBe(2);
    expect(mock?.history.post[0]).toMatchObject({
      url: "/obras",
      sessao403: sessao,
      suprimirToast403: true,
    });

    const totalClientesAntes = clientesCenario().length;
    const criadaNovo = await criarObra(
      {
        cliente: {
          nome: "Cliente Novo Teste",
          cpfCnpj: "52998224725",
          cidade: "Jundiaí",
          endereco: "Av. Jundiaí, 500",
          email: "novo@cliente.com.br",
        },
        endereco: "Av. Jundiaí, 500",
        categoria: "Residencial",
        quantidadePaineis: 10,
        quantidadeInversores: 1,
        dataInicioEstimada: "2026-12-05",
        dataFimEstimada: "2026-12-15",
        pagamento: { prazoContratualDias: 25, dataConfirmacao: "2026-12-05" },
      },
      sessao,
    );

    expect(clientesCenario().length).toBe(totalClientesAntes + 1);
    expect(criadaNovo.clienteNome).toBe("Cliente Novo Teste");
    expect(detalheCenario(criadaNovo.id)?.cliente.nome).toBe("Cliente Novo Teste");
  });

  it("atualiza obra existente com PUT /obras/301 (200) e retorna 404 para obra inexistente", async () => {
    autenticarSessao();

    const atualizada = await atualizarObra(301, {
      cidade: "Valinhos",
      endereco: "Rua Atualizada, 321",
      categoria: "Comercial",
      quantidadePaineis: 27,
      quantidadeInversores: 2,
      dataInicioEstimada: "2026-12-02",
      dataFimEstimada: "2026-12-20",
      descricao: "Descrição atualizada",
      pagamento: { prazoContratualDias: 60 },
    });

    expect(atualizada.id).toBe(301);
    expect(atualizada.cliente.cidade).toBe("Valinhos");
    expect(atualizada.quantidadePaineis).toBe(27);
    expect(detalheCenario(301)?.endereco).toBe("Rua Atualizada, 321");

    await expect(atualizarObra(99999, { cidade: "Valinhos" })).rejects.toMatchObject({
      response: { status: 404, data: { error: { code: "OBRA_NOT_FOUND" } } },
    });
  });
});

describe("isRotaAutorizadaParaPerfil e obterELimparRotaRetorno", () => {
  beforeEach(() => {
    const sessionStorageMem = criarStorageMemoria();
    vi.stubGlobal("sessionStorage", sessionStorageMem);
    vi.stubGlobal("window", { sessionStorage: sessionStorageMem });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("aplica a matriz de autorização para /cadastrarobra e /obras/301 nos 4 perfis e sem perfil", () => {
    expect(isRotaAutorizadaParaPerfil("/cadastrarobra", "Administrador")).toBe(true);
    expect(isRotaAutorizadaParaPerfil("/cadastrarobra", "Engenharia")).toBe(true);
    expect(isRotaAutorizadaParaPerfil("/cadastrarobra", "Financeiro")).toBe(false);
    expect(isRotaAutorizadaParaPerfil("/cadastrarobra", "InstaladorCampo")).toBe(false);
    expect(isRotaAutorizadaParaPerfil("/cadastrarobra", undefined)).toBe(false);

    expect(isRotaAutorizadaParaPerfil("/obras/301", "Administrador")).toBe(true);
    expect(isRotaAutorizadaParaPerfil("/obras/301", "Engenharia")).toBe(true);
    expect(isRotaAutorizadaParaPerfil("/obras/301", "Financeiro")).toBe(true);
    expect(isRotaAutorizadaParaPerfil("/obras/301", "InstaladorCampo")).toBe(false);
    expect(isRotaAutorizadaParaPerfil("/obras/301", undefined)).toBe(false);
  });

  it("limpa auth_return_url e redireciona para fallback seguro quando perfil não tem permissão", () => {
    expect(obterELimparRotaRetorno("Administrador", "/cadastrarobra")).toBe("/cadastrarobra");
    expect(obterELimparRotaRetorno("Engenharia", "/cadastrarobra")).toBe("/cadastrarobra");
    expect(obterELimparRotaRetorno("Financeiro", "/obras/301")).toBe("/obras/301");
    expect(obterELimparRotaRetorno("Financeiro", "/cadastrarobra")).toBe("/kanban");
    expect(obterELimparRotaRetorno("InstaladorCampo", "/cadastrarobra")).toBe("/linkparainstaladores");
    expect(obterELimparRotaRetorno("InstaladorCampo", "/obras/301")).toBe("/linkparainstaladores");

    sessionStorage.setItem("auth_return_url", "/cadastrarobra");
    expect(obterELimparRotaRetorno("Financeiro")).toBe("/kanban");
    expect(sessionStorage.getItem("auth_return_url")).toBeNull();
  });

  it("solicita pageSize=100 ao listar clientes para seleção de obra", async () => {
    const mock = new MockAdapter(api);
    let paramsCapturados: Record<string, unknown> | undefined;
    mock.onGet("/clientes").reply((config) => {
      paramsCapturados = config.params as Record<string, unknown> | undefined;
      return [
        200,
        {
          itens: [{ id: 10, nome: "Cliente Sem Endereço", cidade: "", endereco: "" }],
        },
      ];
    });
    try {
      const itens = await listarClientes();
      expect(paramsCapturados).toEqual({ pageSize: 100 });
      expect(itens).toHaveLength(1);
      expect(itens[0].nome).toBe("Cliente Sem Endereço");
    } finally {
      mock.restore();
    }
  });
});

