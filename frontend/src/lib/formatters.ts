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

/** 
 * Calcula a data de término exclusiva do cronograma (DHTMLX Gantt e PostgreSQL).
 * A data exclusiva é o dia de calendário imediatamente seguinte ao último dia trabalhado.
 * Exemplo: 3 dias úteis a partir de Quarta-feira (07/10):
 * - Dias trabalhados: Quarta (07), Quinta (08), Sexta (09).
 * - Último dia trabalhado: Sexta (09).
 * - Data fim exclusiva retornada: Sábado (10/10 00:00:00).
 * No Gantt, a barra ocupa quarta, quinta e sexta, terminando na divisa de sábado,
 * sem invadir nem colorir o final de semana.
 */
export function adicionarDiasUteis(dataInicio: Date, duracaoDias: number): Date {
  const ultimoDia = calcularUltimoDiaUtil(dataInicio, duracaoDias);
  const dataFimExclusiva = new Date(ultimoDia);
  dataFimExclusiva.setDate(dataFimExclusiva.getDate() + 1);
  return dataFimExclusiva;
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

/**
 * Converte a data do último dia trabalhado (inclusiva, selecionada pelo usuário)
 * para a data de término exclusiva esperada pelo DHTMLX Gantt e PostgreSQL.
 * Caso o usuário selecione um fim de semana (Sábado ou Domingo), recua para a Sexta-feira
 * imediatamente anterior antes de somar +1 dia, garantindo término exclusivo sempre no Sábado imediato.
 * Exemplo: Sexta-feira 09/10/2026 -> Sábado 10/10/2026.
 */
export function ultimoDiaUtilParaDataFimExclusiva(dataFimInclusiva: string | Date): string {
  const data = normalizarDataMeioDiaUTC(dataFimInclusiva);
  while (data.getDay() === 0 || data.getDay() === 6) {
    data.setDate(data.getDate() - 1);
  }
  data.setDate(data.getDate() + 1);
  return formatarDataISO(data);
}

/**
 * Converte a data de término exclusiva do banco/Gantt para o último dia útil trabalhado (inclusivo),
 * ideal para exibição legível e edição em campos <input type="date">.
 * Exemplo: Sábado 10/10/2026 -> Sexta-feira 09/10/2026.
 */
export function dataFimExclusivaParaUltimoDiaUtil(dataFimExclusiva: string | Date): string {
  const data = normalizarDataMeioDiaUTC(dataFimExclusiva);
  data.setDate(data.getDate() - 1);
  while (data.getDay() === 0 || data.getDay() === 6) {
    data.setDate(data.getDate() - 1);
  }
  return formatarDataISO(data);
}

/**
 * Calcula a quantidade de dias úteis trabalhados entre dataInicio (inclusiva) e dataFimExclusiva (exclusiva).
 * Retorna 0 se a data de fim for menor ou igual à data de início, permitindo validação de integridade.
 */
export function calcularDiasUteisEntre(
  dataInicio: string | Date,
  dataFimExclusiva: string | Date
): number {
  const ini = normalizarDataMeioDiaUTC(dataInicio);
  const fim = normalizarDataMeioDiaUTC(dataFimExclusiva);

  if (fim <= ini) return 0;

  let cursor = proximoDiaUtil(ini);
  let dias = 0;

  while (cursor.getTime() < fim.getTime()) {
    const diaSemana = cursor.getDay();
    if (diaSemana !== 0 && diaSemana !== 6) {
      dias++;
    }
    const proxima = new Date(cursor);
    proxima.setDate(proxima.getDate() + 1);
    cursor = proxima;
  }

  return dias;
}
