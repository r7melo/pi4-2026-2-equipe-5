import { calcularDRE } from "./dreCalculos.ts";

function assert(condicao: boolean, mensagem: string) {
  if (!condicao) throw new Error(`[FALHA DE TESTE DRE]: ${mensagem}`);
}

export function executarTestesUnitariosDRE(): { total: number; aprovados: number } {
  let aprovados = 0;
  let total = 0;

  // Teste 1: Cálculo oficial (RF-20, Romário Melo): Resultado = Valor da Obra (30.000) - Custo Total (14.500) = 15.500
  total++;
  const dre1 = calcularDRE(
    101,
    {
      valorObra: 30000,
      custoMaoObra: 4500,
      custoInsumos: 10000,
    },
    "Concluido",
    true
  );

  assert(dre1.valorObra === 30000, "Valor da obra deve ser 30.000");
  assert(dre1.custoTotal === 14500, "Custo total deve ser mão de obra (4.500) + insumos (10.000) = 14.500");
  assert(dre1.resultado === 15500, "Resultado deve ser 30.000 - 14.500 = 15.500 (critério de aceite exato do RF-20)");
  assert(dre1.margemPercentual === 51.67, "Margem percentual deve ser (15.500 / 30.000) * 100 = 51.67%");
  assert(dre1.obraConcluida === true, "Obra concluída deve ser true");
  assert(dre1.precificacaoCompleta === true, "Precificação completa deve ser true");
  aprovados++;

  // Teste 2: Obra concluída com custos superiores ao valor da obra (Prejuízo)
  total++;
  const dre2 = calcularDRE(
    102,
    {
      valorObra: 20000,
      custoMaoObra: 12000,
      custoInsumos: 15000,
    },
    "Concluido",
    true
  );

  assert(dre2.custoTotal === 27000, "Custo total deve ser 27.000");
  assert(dre2.resultado === -7000, "Resultado deve ser negativo (-7.000)");
  assert(dre2.margemPercentual === -35.0, "Margem deve ser negativa (-35%)");
  aprovados++;

  // Teste 3: Restrição RN-03 — Obra não concluída (Em Andamento)
  total++;
  const dre3 = calcularDRE(
    103,
    {
      valorObra: 40000,
      custoMaoObra: 5000,
      custoInsumos: 10000,
    },
    "EmAndamento",
    true
  );

  assert(dre3.obraConcluida === false, "Obra em andamento não pode constar como concluída");
  assert(
    typeof dre3.observacoes === "string" && dre3.observacoes.includes("exige a conclusão"),
    "Deve conter aviso explícito de restrição da regra de negócio"
  );
  aprovados++;

  // Teste 4: Restrição RN-03 — Obra concluída porém com precificação incompleta
  total++;
  const dre4 = calcularDRE(
    104,
    {
      valorObra: null,
      custoMaoObra: 5000,
      custoInsumos: null,
    },
    "Concluido",
    false
  );

  assert(dre4.precificacaoCompleta === false, "Precificação completa deve ser false");
  assert(
    typeof dre4.observacoes === "string" && dre4.observacoes.includes("incompleta"),
    "Deve conter aviso de precificação incompleta"
  );
  aprovados++;

  // Teste 5: Robustez contra valores negativos e nulos
  total++;
  const dre5 = calcularDRE(
    105,
    {
      valorObra: -500,
      custoMaoObra: -200,
      custoInsumos: 0,
    },
    "Concluido",
    true
  );

  assert(dre5.receitaBruta === 0, "Valores negativos de receita devem ser truncados para zero");
  assert(dre5.custoMaoObra === 0, "Valores negativos de custo devem ser truncados para zero");
  assert(dre5.margemPercentual === 0, "Divisão por receita zero não pode gerar NaN ou Infinity");
  aprovados++;

  return { total, aprovados };
}

// Execução autônoma direta no runtime
declare const process: { argv: string[] } | undefined;
if (typeof process !== "undefined" && import.meta.url.endsWith("dreCalculos.test.ts")) {
  const resultado = executarTestesUnitariosDRE();
  console.log(`[TESTES DRE]: ${resultado.aprovados}/${resultado.total} cenários aprovados com sucesso.`);
}
