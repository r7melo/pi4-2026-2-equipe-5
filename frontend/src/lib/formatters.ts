// frontend/src/lib/formatters.ts
// Formatadores de UI e utilitários de calendário do sistema ZL Engenharia

/** Formata número de dias úteis com singular/plural correto */
export function formatarDiasUteis(dias?: number): string {
  if (!dias && dias !== 0) return "—";
  return `${dias} ${dias === 1 ? "dia útil" : "dias úteis"}`;
}

/** 
 * Formata data ISO ou SQL timestamp (AAAA-MM-DD, AAAA-MM-DDTHH:mm:ss ou AAAA-MM-DD HH:mm:ss)
 * para o padrão brasileiro (DD/MM/AAAA). Suporta separadores T e espaço com segurança.
 */
export function formatarDataBR(dataIso?: string | null): string {
  if (!dataIso) return "—";
  const dataLimpa = dataIso.split(/[T ]/)[0];
  const [ano, mes, dia] = dataLimpa.split("-");
  if (!ano || !mes || !dia) return dataIso;
  return `${dia}/${mes}/${ano}`;
}

/** Formata objeto Date para string YYYY-MM-DD */
export function formatarDataISO(data: Date): string {
  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, "0");
  const dia = String(data.getDate()).padStart(2, "0");
  return `${ano}-${mes}-${dia}`;
}

/** Retorna a própria data se for dia útil, senão avança para a próxima segunda-feira */
export function proximoDiaUtil(data: Date): Date {
  const resultado = new Date(data);
  while (resultado.getDay() === 0 || resultado.getDay() === 6) {
    resultado.setDate(resultado.getDate() + 1);
  }
  return resultado;
}

/**
 * Retorna o último dia útil trabalhado de uma alocação,
 * começando em dataInicio e durando duracaoDias úteis.
 */
export function calcularUltimoDiaUtil(dataInicio: Date, duracaoDias: number): Date {
  const atual = proximoDiaUtil(dataInicio);
  let diasTrabalhados = 1;
  const totalDias = Math.max(1, Math.ceil(duracaoDias));

  while (diasTrabalhados < totalDias) {
    atual.setDate(atual.getDate() + 1);
    const diaSemana = atual.getDay();
    if (diaSemana !== 0 && diaSemana !== 6) {
      diasTrabalhados++;
    }
  }
  return atual;
}
/** Soma N dias civis de calendário (sem pular fins de semana) e retorna string ISO local. */
export function adicionarDiasCivis(dataInput: string | Date, dias: number): string {
  const data = normalizarDataMeioDiaUTC(dataInput);
  data.setDate(data.getDate() + dias);
  return formatarDataISO(data);
}

/** Normaliza a data final inclusiva (string ISO ou Date — superset do item #3 da spec): sábado/domingo recuam para a sexta-feira imediatamente anterior. */
export function normalizarDataFimInclusiva(dataFim: string | Date): string {
  const data = normalizarDataMeioDiaUTC(dataFim);
  while (data.getDay() === 0 || data.getDay() === 6) {
    data.setDate(data.getDate() - 1);
  }
  return formatarDataISO(data);
}


/** Retorna a data de hoje ajustada para dia útil em formato YYYY-MM-DD */
export function obterProximoDiaUtilISO(dataBase: Date = new Date()): string {
  const dataUtil = proximoDiaUtil(dataBase);
  return formatarDataISO(dataUtil);
}

/**
 * Sanitiza uma entrada de data (string ISO, SQL timestamp ou Date) para
 * um objeto Date UTC ao meio-dia, evitando distorções de fuso e Invalid Date por duplo "T".
 */
export function normalizarDataMeioDiaUTC(dataEntrada: string | Date): Date {
  if (dataEntrada instanceof Date) {
    const ano = dataEntrada.getFullYear();
    const mes = String(dataEntrada.getMonth() + 1).padStart(2, "0");
    const dia = String(dataEntrada.getDate()).padStart(2, "0");
    return new Date(`${ano}-${mes}-${dia}T12:00:00Z`);
  }
  const dataLimpa = String(dataEntrada).split(/[T ]/)[0];
  return new Date(`${dataLimpa}T12:00:00Z`);
}
/** Boundary Adapter de entrada: fim inclusivo civil → ponteiro exclusivo do DHTMLX (+1 dia civil). */
export function dataFimInclusivaParaDhtmlx(dataIso: string): string {
  const data = normalizarDataMeioDiaUTC(dataIso);
  data.setDate(data.getDate() + 1);
  return formatarDataISO(data);
}

/** Boundary Adapter de saída: ponteiro de término do DHTMLX → fim inclusivo civil (−1 dia civil). */
export function dhtmlxFimParaDataInclusiva(dateInput: string | Date): string {
  const data = normalizarDataMeioDiaUTC(dateInput);
  data.setDate(data.getDate() - 1);
  return formatarDataISO(data);
}

/** Contagem inclusiva de dias úteis em [ini, fim]: 0 se fim < ini; 1 se fim === ini (dia útil). */
export function calcularDiasUteisInclusivos(ini: string | Date, fim: string | Date): number {
  const inicioISO = formatarDataISO(proximoDiaUtil(normalizarDataMeioDiaUTC(ini)));
  const fimISO = normalizarDataFimInclusiva(fim);
  if (fimISO < inicioISO) return 0;

  const cursor = normalizarDataMeioDiaUTC(inicioISO);
  const limite = normalizarDataMeioDiaUTC(fimISO);
  let dias = 0;
  while (cursor.getTime() <= limite.getTime()) {
    const diaSemana = cursor.getDay();
    if (diaSemana !== 0 && diaSemana !== 6) dias++;
    cursor.setDate(cursor.getDate() + 1);
  }
  return dias;
}


/**
 * Formata um valor numérico para o padrão de moeda brasileiro (BRL).
 * Sanitizado contra valores nulos, indefinidos, NaN ou infinitos.
 */
export function formatarMoeda(
  valor?: number | null,
  opcoes?: { semCentavos?: boolean }
): string {
  const valorSeguro = typeof valor === "number" && Number.isFinite(valor) ? valor : 0;
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: opcoes?.semCentavos ? 0 : 2,
    minimumFractionDigits: opcoes?.semCentavos ? 0 : 2,
  }).format(valorSeguro);
}
