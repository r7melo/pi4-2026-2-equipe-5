import { geracaoCenario } from "../core/estadoCenario";
import type { CriarProdutoPayload, EditarProdutoPayload, Produto } from "@/shared/types/produtos";

const STORAGE_PREFIX_PRODUTOS = "mock_produtos_catalogo_";
const memoriaPorGeracao = new Map<string, Produto[]>();

const CATALOGO_INICIAL: Produto[] = [
  {
    id: 1,
    nome: "Painel Solar Monocristalino 550W",
    tipo: "Módulo Fotovoltaico",
    unidade: "un",
    precoUnitario: 685.0,
    ativo: true,
  },
  {
    id: 2,
    nome: "Inversor Trifásico 15kW 380V",
    tipo: "Inversor",
    unidade: "un",
    precoUnitario: 8450.0,
    ativo: true,
  },
  {
    id: 3,
    nome: "Microinversor 2000W 4 Entradas",
    tipo: "Inversor",
    unidade: "un",
    precoUnitario: 1890.0,
    ativo: true,
  },
  {
    id: 4,
    nome: "Estrutura Alumínio Telhado Cerâmico 4 Placas",
    tipo: "Estrutura de Fixação",
    unidade: "kit",
    precoUnitario: 420.0,
    ativo: true,
  },
  {
    id: 5,
    nome: "Cabo Solar 6mm² Preto 1kV",
    tipo: "Cabeamento",
    unidade: "m",
    precoUnitario: 7.5,
    ativo: true,
  },
  {
    id: 6,
    nome: "String Box CC 2 Entradas 1000V c/ DPS",
    tipo: "Proteção Elétrica",
    unidade: "un",
    precoUnitario: 390.0,
    ativo: true,
  },
  {
    id: 7,
    nome: "Painel Solar Policristalino 340W (Descontinuado)",
    tipo: "Módulo Fotovoltaico",
    unidade: "un",
    precoUnitario: 490.0,
    ativo: false,
  },
];

function obterGeracaoSegura(): string {
  try {
    return geracaoCenario() || "padrao";
  } catch {
    return "padrao";
  }
}

function clonarLista(lista: Produto[]): Produto[] {
  return lista.map((item) => ({ ...item }));
}

function salvarPorGeracao(geracao: string, lista: Produto[]): void {
  const clone = clonarLista(lista);
  memoriaPorGeracao.set(geracao, clone);
  if (typeof sessionStorage !== "undefined") {
    try {
      sessionStorage.setItem(`${STORAGE_PREFIX_PRODUTOS}${geracao}`, JSON.stringify(clone));
    } catch {
      // Ignora falha de quota em ambientes de teste restritos
    }
  }
}

export function obterProdutosArmazenados(): Produto[] {
  const geracao = obterGeracaoSegura();
  const emMemoria = memoriaPorGeracao.get(geracao);
  if (emMemoria) return clonarLista(emMemoria);

  if (typeof sessionStorage !== "undefined") {
    try {
      const bruto = sessionStorage.getItem(`${STORAGE_PREFIX_PRODUTOS}${geracao}`);
      if (bruto) {
        const parsed = JSON.parse(bruto) as Produto[];
        if (Array.isArray(parsed)) {
          memoriaPorGeracao.set(geracao, clonarLista(parsed));
          return clonarLista(parsed);
        }
      }
    } catch {
      // Segue para inicialização padrão
    }
  }

  const inicial = clonarLista(CATALOGO_INICIAL);
  salvarPorGeracao(geracao, inicial);
  return clonarLista(inicial);
}

export function buscarProdutoPorIdMock(id: number): Produto | undefined {
  return obterProdutosArmazenados().find((p) => p.id === id);
}

export function adicionarProdutoArmazenado(payload: CriarProdutoPayload): Produto {
  const produtos = obterProdutosArmazenados();
  const novoId = produtos.reduce((acc, item) => Math.max(acc, item.id), 0) + 1;
  const novo: Produto = {
    id: novoId,
    nome: payload.nome.trim(),
    tipo: payload.tipo.trim(),
    unidade: payload.unidade.trim(),
    precoUnitario: payload.precoUnitario,
    ativo: payload.ativo ?? true,
  };
  salvarPorGeracao(obterGeracaoSegura(), [...produtos, novo]);
  return { ...novo };
}

export function atualizarProdutoArmazenado(id: number, payload: EditarProdutoPayload): Produto | undefined {
  const produtos = obterProdutosArmazenados();
  const indice = produtos.findIndex((p) => p.id === id);
  if (indice === -1) return undefined;

  const atual = produtos[indice];
  const atualizado: Produto = {
    ...atual,
    ...(payload.nome !== undefined ? { nome: payload.nome.trim() } : {}),
    ...(payload.tipo !== undefined ? { tipo: payload.tipo.trim() } : {}),
    ...(payload.unidade !== undefined ? { unidade: payload.unidade.trim() } : {}),
    ...(payload.precoUnitario !== undefined ? { precoUnitario: payload.precoUnitario } : {}),
    ...(payload.ativo !== undefined ? { ativo: payload.ativo } : {}),
    id: atual.id,
  };
  produtos[indice] = atualizado;
  salvarPorGeracao(obterGeracaoSegura(), produtos);
  return { ...atualizado };
}

export function serializarProdutoPorPerfil(produto: Produto, nomePerfil?: string): Produto {
  if (nomePerfil === "Engenharia" || nomePerfil === "InstaladorCampo") {
    const { precoUnitario: _oculto, ...semPreco } = produto;
    return semPreco;
  }
  return { ...produto };
}

export function resetarProdutosMock(): void {
  const geracao = obterGeracaoSegura();
  memoriaPorGeracao.delete(geracao);
  if (typeof sessionStorage !== "undefined") {
    try {
      sessionStorage.removeItem(`${STORAGE_PREFIX_PRODUTOS}${geracao}`);
    } catch {
      // Ignora em ambiente sem storage
    }
  }
}
