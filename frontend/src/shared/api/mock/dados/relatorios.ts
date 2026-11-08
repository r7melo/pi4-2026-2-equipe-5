import type { RelatorioCusto, CustosObra, DREObra, AtualizarCustosPayload } from "@/types";
import { obterObrasArmazenadas } from "./obras";
import { obterMateriaisArmazenados } from "./materiais";
import { lerDadosCenario, salvarDadosCenario } from "../core/estadoCenario";
import { calcularDRE } from "@/features/financeiro/lib/dreCalculos";

interface CustosArmazenadosObra {
  custoMaoObra: number | null;
  custoInsumos: number | null;
  valorObra: number | null;
}

const CHAVE_CUSTOS_MOCK = "mock_custos_obras_v1";

function lerCustosSeguro(): Record<number, CustosArmazenadosObra> | null {
  try {
    return lerDadosCenario<Record<number, CustosArmazenadosObra>>(CHAVE_CUSTOS_MOCK);
  } catch {
    return null;
  }
}

function lerRelatoriosSeguro(): Record<number, { receita?: number; custoTotal?: number }> {
  try {
    return lerDadosCenario<Record<number, { receita?: number; custoTotal?: number }>>("mock_relatorios_v1") || {};
  } catch {
    return {};
  }
}

function obterMapaCustos(): Record<number, CustosArmazenadosObra> {
  const dados = lerCustosSeguro();
  if (dados && Object.keys(dados).length > 0) return dados;

  // Popula com base nos relatórios de teste existentes
  const relatorios = lerRelatoriosSeguro();

  const inicial: Record<number, CustosArmazenadosObra> = {};
  for (const [idStr, r] of Object.entries(relatorios)) {
    const id = Number(idStr);
    const custoTot = r.custoTotal ?? 0;
    inicial[id] = {
      valorObra: r.receita ?? null,
      custoMaoObra: Math.round(custoTot * 0.4),
      custoInsumos: Math.round(custoTot * 0.6),
    };
  }

  // Tenta persistir no cenário apenas se estivermos em uma transação com escrita permitida
  try {
    salvarDadosCenario(CHAVE_CUSTOS_MOCK, inicial);
  } catch {
    // Ignora quando estiver em leitura pura (evita quebrar a consulta GET)
  }

  return inicial;
}

export function buscarCustosArmazenados(obraId: number): CustosObra | null {
  const obra = obterObrasArmazenadas().find(o => o.id === obraId);
  if (!obra) return null;

  const mapa = obterMapaCustos();
  const reg = mapa[obraId];

  // Se não houver lançamento customizado manual, deriva valores padrão a partir dos dados da obra
  const valorPadrao = obra.valorTotal ?? ((obra.quantidadePaineis || 0) * 1300);
  const custoMaoObra = reg?.custoMaoObra ?? (valorPadrao > 0 ? Math.round(valorPadrao * 0.25) : null);
  const custoInsumos = reg?.custoInsumos ?? (valorPadrao > 0 ? Math.round(valorPadrao * 0.45) : null);
  const valorObra = reg?.valorObra ?? (valorPadrao > 0 ? valorPadrao : null);
  const precificacaoCompleta = custoMaoObra !== null && custoInsumos !== null && valorObra !== null;

  return {
    obraId,
    custoMaoObra,
    custoInsumos,
    valorObra,
    precificacaoCompleta,
  };
}

export function atualizarCustosArmazenados(obraId: number, payload: AtualizarCustosPayload): CustosObra | null {
  const obra = obterObrasArmazenadas().find(o => o.id === obraId);
  if (!obra) return null;

  const mapa = obterMapaCustos();
  const anterior = mapa[obraId] || { custoMaoObra: null, custoInsumos: null, valorObra: null };

  const atualizado: CustosArmazenadosObra = {
    custoMaoObra: payload.custoMaoObra !== undefined ? payload.custoMaoObra : anterior.custoMaoObra,
    custoInsumos: payload.custoInsumos !== undefined ? payload.custoInsumos : anterior.custoInsumos,
    valorObra: payload.valorObra !== undefined ? payload.valorObra : anterior.valorObra,
  };

  mapa[obraId] = atualizado;
  salvarDadosCenario(CHAVE_CUSTOS_MOCK, mapa);

  // Também sincroniza a visualização do relatório de custo legado
  const relatorios = lerDadosCenario<Record<number, RelatorioCusto>>("mock_relatorios_v1") || {};
  const cTot = (atualizado.custoMaoObra ?? 0) + (atualizado.custoInsumos ?? 0);
  const rec = atualizado.valorObra ?? 0;
  relatorios[obraId] = {
    obraId,
    custoTotal: cTot,
    receita: rec,
    lucro: rec - cTot,
    itens: [
      { descricao: "Mão de Obra e Equipes", valor: atualizado.custoMaoObra ?? 0 },
      { descricao: "Insumos e Materiais de Instalação", valor: atualizado.custoInsumos ?? 0 },
    ],
  };
  salvarDadosCenario("mock_relatorios_v1", relatorios);

  return buscarCustosArmazenados(obraId);
}

export function apurarDreArmazenado(obraId: number): { status: number; corpo: DREObra | { error: { code: string; message: string } } } {
  const obra = obterObrasArmazenadas().find(o => o.id === obraId);
  if (!obra) {
    return { status: 404, corpo: { error: { code: "OBRA_NOT_FOUND", message: `Obra ${obraId} não encontrada.` } } };
  }

  const custos = buscarCustosArmazenados(obraId);
  if (obra.status !== "Concluido") {
    return {
      status: 400,
      corpo: { error: { code: "VALIDATION_ERROR", message: "A apuração consolidada do DRE exige obra concluída." } },
    };
  }

  if (!custos?.precificacaoCompleta) {
    return {
      status: 400,
      corpo: { error: { code: "VALIDATION_ERROR", message: "A precificação da obra está incompleta." } },
    };
  }

  const dre = calcularDRE(
    obraId,
    {
      valorObra: custos.valorObra,
      custoMaoObra: custos.custoMaoObra,
      custoInsumos: custos.custoInsumos,
    },
    obra.status,
    custos.precificacaoCompleta
  );

  return { status: 200, corpo: dre };
}

/**
 * Obtém o relatório de custos da obra ou calcula dinamicamente se for uma nova obra.
 */
export function obterRelatorioArmazenado(obraId: number): RelatorioCusto | null {
  const obra = obterObrasArmazenadas().find(o => o.id === obraId);
  const relatorio = lerDadosCenario<Record<number, RelatorioCusto>>("mock_relatorios_v1")[obraId];
  if (!obra || obra.status !== "Concluido" || !relatorio) return null;
  return { ...relatorio, balancoMateriais: obterMateriaisArmazenados().filter(m => m.obraId === obraId).map(m => ({
    tipo: m.descricao ?? m.tipo ?? "", unidade: m.unidade ?? "", quantidadeComprada: m.quantidade,
    quantidadeUtilizada: m.statusLogistico === "Utilizado" ? m.quantidade : 0,
  })) };
}
