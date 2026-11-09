import type { DREObra } from "@/types";

export interface EntradaCalculoDRE {
  valorObra?: number | null;
  custoMaoObra?: number | null;
  custoInsumos?: number | null;
  custoMateriais?: number | null;
}

/**
 * Calcula o DRE oficial da obra respeitando estritamente os requisitos canônicos
 * da ZL Engenharia (RF-20, RN-03) e o backend ASP.NET Core (BancoDados.Custos.cs).
 * Fórmula oficial: Resultado = Valor da Obra - Custo Total (Mão de Obra + Insumos).
 */
export function calcularDRE(
  obraId: number,
  entrada: EntradaCalculoDRE,
  statusObra: string,
  precificacaoCompleta: boolean
): DREObra {
  const obraConcluida = statusObra === "Concluido";

  // Trunca valores para evitar números negativos inconsistentes na contabilidade
  const valorObra = Math.max(0, entrada.valorObra ?? 0);
  const custoMaoObra = Math.max(0, entrada.custoMaoObra ?? 0);
  const custoInsumos = Math.max(0, entrada.custoInsumos ?? 0);
  const custoMateriais = Math.max(0, entrada.custoMateriais ?? custoInsumos);

  const custoTotal = Number((custoMaoObra + custoInsumos).toFixed(2));
  const resultado = Number((valorObra - custoTotal).toFixed(2));

  const margemPercentual =
    valorObra > 0 ? Number(((resultado / valorObra) * 100).toFixed(2)) : 0;

  let observacoes: string | undefined;
  if (!obraConcluida) {
    observacoes = "A apuração consolidada do DRE exige a conclusão da obra (regra de negócio da plataforma).";
  } else if (!precificacaoCompleta) {
    observacoes = "A precificação da obra está incompleta (valores ou custos pendentes de lançamento).";
  } else {
    observacoes = "DRE apurado e validado conforme lançamento contábil.";
  }

  return {
    obraId,
    receitaBruta: valorObra,
    valorObra,
    custoMateriais,
    custoMaoObra,
    custoInsumos,
    custoTotal,
    resultado,
    margemPercentual,
    obraConcluida,
    precificacaoCompleta,
    observacoes,
  };
}
