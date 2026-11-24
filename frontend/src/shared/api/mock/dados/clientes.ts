import { geracaoCenario, salvarDadosCenario } from "../core/estadoCenario";
import { clientesCenario, obterDetalhesArmazenados } from "./detalhes";
import { obterObrasArmazenadas } from "./obras";
import { limparDocumento } from "@/shared/lib/validacoesDocumento";
import type {
  Cliente,
  CriarClientePayload,
  EditarClientePayload,
} from "@/shared/types/clientes";

interface ClienteMockRegistro extends Cliente {
  obrasBase?: number;
}

const STORAGE_PREFIX_CLIENTES = "mock_clientes_gestao_";
const memoriaClientes = new Map<string, ClienteMockRegistro[]>();

const CLIENTES_SEED_PADRAO: ClienteMockRegistro[] = [
  {
    id: 1,
    nome: "Rede Alfa Supermercados",
    cpfCnpj: "12345678000195",
    cidade: "Crateús",
    endereco: "Av. Sargento Hermínio, 1200 - Centro",
    telefone: "(88) 99911-2233",
    email: "engenharia@redealfa.com.br",
    dadosContrato: null,
    obrasBase: 2,
  },
  {
    id: 2,
    nome: "Fazenda Santa Luzia Agroenergia",
    cpfCnpj: "45723174000110",
    cidade: "Ipaporanga",
    endereco: "Rodovia CE-187, Km 18 - Zona Rural",
    telefone: "(88) 99822-3344",
    email: "contato@santaluzia.agr.br",
    dadosContrato: null,
    obrasBase: 1,
  },
  {
    id: 3,
    nome: "Padaria Bom Grão",
    cpfCnpj: "52998224725",
    cidade: "Crateús",
    endereco: "Rua XV de Novembro, 120 - Centro",
    telefone: "(88) 99744-5566",
    email: "padariabomgrao@email.com",
    dadosContrato: null,
    obrasBase: 0,
  },
];

function obterGeracaoSegura(): string {
  try {
    return geracaoCenario() || "padrao";
  } catch {
    return "padrao";
  }
}

function clonarClientes(lista: ClienteMockRegistro[]): ClienteMockRegistro[] {
  return structuredClone(lista);
}

function contarObrasDoCliente(cliente: ClienteMockRegistro): number {
  let contagemCenario = 0;
  try {
    const detalhes = Object.values(obterDetalhesArmazenados());
    const porDetalhe = detalhes.filter(
      (d) =>
        d.cliente?.id === cliente.id ||
        d.cliente?.nome.toLowerCase() === cliente.nome.toLowerCase()
    ).length;

    const obras = obterObrasArmazenadas();
    const porCard = obras.filter(
      (o) => o.clienteNome.toLowerCase() === cliente.nome.toLowerCase()
    ).length;

    contagemCenario = Math.max(porDetalhe, porCard);
  } catch {
    // Em testes unitários sem cenário de obras inicializado, usa obrasBase
  }
  return Math.max(contagemCenario, cliente.obrasBase ?? 0);
}

function enriquecerCliente(registro: ClienteMockRegistro): Cliente {
  const { obrasBase: _base, ...publico } = registro;
  return {
    ...publico,
    quantidadeObras: contarObrasDoCliente(registro),
  };
}

function sincronizarCenarioLegado(lista: ClienteMockRegistro[]): void {
  try {
    salvarDadosCenario(
      "mock_clientes_v1",
      lista.map((c) => ({
        id: c.id,
        nome: c.nome,
        cidade: c.cidade ?? "",
        endereco: c.endereco ?? "",
        cpfCnpj: c.cpfCnpj,
        telefone: c.telefone ?? undefined,
        email: c.email ?? undefined,
      }))
    );
  } catch {
    // Fora de transação de cenário (ex: testes isolados), persiste apenas em memória/sessionStorage
  }
}

function salvarPorGeracao(geracao: string, lista: ClienteMockRegistro[]): void {
  const clone = clonarClientes(lista);
  memoriaClientes.set(geracao, clone);
  if (typeof sessionStorage !== "undefined") {
    try {
      sessionStorage.setItem(`${STORAGE_PREFIX_CLIENTES}${geracao}`, JSON.stringify(clone));
    } catch {
      // Ignora erro de quota
    }
  }
  sincronizarCenarioLegado(clone);
}

function carregarRegistrosInternos(): ClienteMockRegistro[] {
  const geracao = obterGeracaoSegura();
  const emMemoria = memoriaClientes.get(geracao);
  if (emMemoria) return clonarClientes(emMemoria);

  if (typeof sessionStorage !== "undefined") {
    try {
      const bruto = sessionStorage.getItem(`${STORAGE_PREFIX_CLIENTES}${geracao}`);
      if (bruto) {
        const parsed = JSON.parse(bruto) as ClienteMockRegistro[];
        if (Array.isArray(parsed)) {
          memoriaClientes.set(geracao, clonarClientes(parsed));
          return clonarClientes(parsed);
        }
      }
    } catch {
      // Continua para seed
    }
  }

  let inicial: ClienteMockRegistro[] = [];
  try {
    const doCenario = clientesCenario();
    if (Array.isArray(doCenario) && doCenario.length > 0) {
      const cpfsPadrao = ["12345678000195", "45723174000110", "52998224725"];
      inicial = doCenario.map((c, idx) => ({
        id: c.id,
        nome: c.nome,
        cpfCnpj: limparDocumento(c.cpfCnpj || cpfsPadrao[idx % cpfsPadrao.length]),
        cidade: c.cidade || null,
        endereco: c.endereco || null,
        telefone: c.telefone || null,
        email: c.email || null,
        dadosContrato: null,
        obrasBase: 0,
      }));
    }
  } catch {
    // Fallback para seed padrão em testes unitários
  }

  if (inicial.length === 0) {
    inicial = clonarClientes(CLIENTES_SEED_PADRAO);
  }

  salvarPorGeracao(geracao, inicial);
  return clonarClientes(inicial);
}

export function obterClientesArmazenados(): Cliente[] {
  return carregarRegistrosInternos().map(enriquecerCliente);
}

export function buscarClientePorIdMock(id: number): Cliente | undefined {
  const encontrado = carregarRegistrosInternos().find((c) => c.id === id);
  return encontrado ? enriquecerCliente(encontrado) : undefined;
}

export function existeCpfCnpjDuplicadoMock(cpfCnpj: string, ignorarId?: number): boolean {
  const doc = limparDocumento(cpfCnpj);
  return carregarRegistrosInternos().some(
    (c) => limparDocumento(c.cpfCnpj) === doc && c.id !== ignorarId
  );
}

export function adicionarClienteArmazenado(payload: CriarClientePayload): Cliente {
  const registros = carregarRegistrosInternos();
  const novoId = registros.reduce((acc, item) => Math.max(acc, item.id), 0) + 1;
  const novo: ClienteMockRegistro = {
    id: novoId,
    nome: payload.nome.trim(),
    cpfCnpj: limparDocumento(payload.cpfCnpj),
    cidade: payload.cidade?.trim() || null,
    endereco: payload.endereco?.trim() || null,
    telefone: payload.telefone?.trim() || null,
    email: payload.email?.trim() || null,
    dadosContrato: payload.dadosContrato?.trim() || null,
    obrasBase: 0,
  };
  salvarPorGeracao(obterGeracaoSegura(), [...registros, novo]);
  return enriquecerCliente(novo);
}

export function atualizarClienteArmazenado(
  id: number,
  payload: EditarClientePayload
): Cliente | undefined {
  const registros = carregarRegistrosInternos();
  const idx = registros.findIndex((c) => c.id === id);
  if (idx === -1) return undefined;

  const atual = registros[idx];
  const atualizado: ClienteMockRegistro = {
    ...atual,
    ...(payload.nome !== undefined ? { nome: payload.nome.trim() } : {}),
    ...(payload.cpfCnpj !== undefined ? { cpfCnpj: limparDocumento(payload.cpfCnpj) } : {}),
    ...(payload.cidade !== undefined ? { cidade: payload.cidade?.trim() || null } : {}),
    ...(payload.endereco !== undefined ? { endereco: payload.endereco?.trim() || null } : {}),
    ...(payload.telefone !== undefined ? { telefone: payload.telefone?.trim() || null } : {}),
    ...(payload.email !== undefined ? { email: payload.email?.trim() || null } : {}),
    ...(payload.dadosContrato !== undefined
      ? { dadosContrato: payload.dadosContrato?.trim() || null }
      : {}),
    id: atual.id,
  };
  registros[idx] = atualizado;
  salvarPorGeracao(obterGeracaoSegura(), registros);
  return enriquecerCliente(atualizado);
}

export function removerClienteArmazenado(
  id: number
): "ok" | "not_found" | "has_obras" {
  const registros = carregarRegistrosInternos();
  const alvo = registros.find((c) => c.id === id);
  if (!alvo) return "not_found";

  if (contarObrasDoCliente(alvo) > 0) {
    return "has_obras";
  }

  const restantes = registros.filter((c) => c.id !== id);
  salvarPorGeracao(obterGeracaoSegura(), restantes);
  return "ok";
}

export function resetarClientesMock(): void {
  const geracao = obterGeracaoSegura();
  memoriaClientes.delete(geracao);
  if (typeof sessionStorage !== "undefined") {
    try {
      sessionStorage.removeItem(`${STORAGE_PREFIX_CLIENTES}${geracao}`);
    } catch {
      // Ignora em ambiente sem storage
    }
  }
}
