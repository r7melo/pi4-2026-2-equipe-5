/** Datas civis do contrato, sem conversão pelo fuso do navegador. */
export function dataCivilValida(valor: unknown): valor is string {
  if (typeof valor !== "string" || !/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(valor) || valor.startsWith("0000-")) return false;
  const data = new Date(valor + "T12:00:00Z");
  return Number.isFinite(data.getTime()) && data.toISOString().slice(0, 10) === valor;
}

export function periodoCivilValido(inicio: unknown, fim: unknown): inicio is string {
  return dataCivilValida(inicio) && dataCivilValida(fim) && inicio <= fim;
}

export function somarDiasCivisUTC(valor: string, dias: number): string {
  const data = new Date(valor + "T12:00:00Z");
  data.setUTCDate(data.getUTCDate() + dias);
  return data.toISOString().split("T")[0];
}

export function diaUtilCivil(valor: string): boolean {
  const dia = new Date(valor + "T12:00:00Z").getUTCDay();
  return dia !== 0 && dia !== 6;
}

/** Contagem limitada a seis iterações mesmo para intervalos extensos. */
export function diasUteisCivis(inicio: string, fim: string): number {
  if (!periodoCivilValido(inicio, fim)) return 0;
  const primeiro = new Date(inicio + "T12:00:00Z");
  const ultimo = new Date(fim + "T12:00:00Z");
  const total = Math.floor((ultimo.getTime() - primeiro.getTime()) / 86400000) + 1;
  let uteis = Math.floor(total / 7) * 5;
  for (let i = 0; i < total % 7; i++) {
    const dia = (primeiro.getUTCDay() + i) % 7;
    if (dia !== 0 && dia !== 6) uteis++;
  }
  return uteis;
}

export function instanteISOValido(valor: unknown): valor is string {
  return typeof valor === "string" &&
    /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}(?:\.[0-9]{1,7})?(?:Z|[+-][0-9]{2}:[0-9]{2})$/.test(valor) &&
    dataCivilValida(valor.slice(0, 10)) && Number(valor.slice(11, 13)) < 24 &&
    Number(valor.slice(14, 16)) < 60 && Number(valor.slice(17, 19)) < 60 &&
    Number.isFinite(Date.parse(valor));
}

function validarDataCivilOuErro(valor: unknown, rotulo: string): string {
  if (!dataCivilValida(valor)) {
    throw new RangeError(`${rotulo} civil inválida: ${String(valor)}`);
  }
  return valor;
}

function somarDiasCivisSeguroUTC(valor: string, dias: number): string {
  try {
    const resultado = somarDiasCivisUTC(valor, dias);
    if (!dataCivilValida(resultado)) {
      throw new RangeError(`Resultado fora do intervalo civil de 0001-01-01 a 9999-12-31: ${String(resultado)}`);
    }
    return resultado;
  } catch (erro) {
    if (erro instanceof RangeError) throw erro;
    throw new RangeError("Resultado fora do intervalo civil de 0001-01-01 a 9999-12-31", { cause: erro });
  }
}

/**
 * Normaliza uma data civil ISO para o próprio dia útil ou, caso coincida com sábado ou domingo,
 * avança para a segunda-feira útil imediatamente seguinte.
 */
export function proximoDiaUtilCivil(valor: string): string {
  validarDataCivilOuErro(valor, "Data");
  const data = new Date(valor + "T12:00:00Z");
  const diaSemana = data.getUTCDay();
  const incremento = diaSemana === 6 ? 2 : diaSemana === 0 ? 1 : 0;
  if (incremento === 0) return valor;
  return somarDiasCivisSeguroUTC(valor, incremento);
}

/**
 * Calcula o deslocamento assinado em dias úteis entre duas datas civis.
 * A data de origem ('de') é normalizada para o próximo dia útil.
 * A data de destino ('ate') deve ser um dia útil civil válido, lançando RangeError caso contrário.
 * A contagem exclui a origem e inclui o destino útil, compatível com C# (Gantt.DeslocamentoEmDiasUteis).
 */
export function deslocamentoDiasUteisCivil(de: string, ate: string): number {
  const deNormalizado = proximoDiaUtilCivil(de);
  if (!dataCivilValida(ate) || !diaUtilCivil(ate)) {
    throw new RangeError(`Data final deve ser dia útil civil válido: ${String(ate)}`);
  }
  if (deNormalizado === ate) return 0;
  if (deNormalizado < ate) {
    return diasUteisCivis(deNormalizado, ate) - 1;
  }
  return -(diasUteisCivis(ate, deNormalizado) - 1);
}

/**
 * Desloca uma data civil por uma quantidade assinada de dias úteis.
 * A data informada é normalizada para o próximo dia útil antes do deslocamento.
 * Deslocamento zero (delta zero) retorna a própria data normalizada.
 * O cálculo decompõe semanas inteiras e limita as iterações do resto a no máximo seis passos.
 */
export function deslocarDiasUteisCivil(valor: string, dias: number): string {
  if (typeof dias !== "number" || !Number.isFinite(dias) || !Number.isInteger(dias)) {
    throw new RangeError(`Deslocamento em dias deve ser número inteiro finito: ${String(dias)}`);
  }
  const valorNormalizado = proximoDiaUtilCivil(valor);
  if (dias === 0) return valorNormalizado;

  if (Math.abs(dias) > 3_000_000) {
    throw new RangeError(`Deslocamento excede o intervalo civil de 0001-01-01 a 9999-12-31: ${dias}`);
  }

  const semanas = Math.trunc(dias / 5);
  const resto = dias - semanas * 5;

  let atual = somarDiasCivisSeguroUTC(valorNormalizado, semanas * 7);

  if (resto !== 0) {
    const sinal = Math.sign(resto);
    let restantes = Math.abs(resto);
    while (restantes > 0) {
      atual = somarDiasCivisSeguroUTC(atual, sinal);
      if (diaUtilCivil(atual)) {
        restantes--;
      }
    }
  }

  return atual;
}

/**
 * Calcula a data de término de uma alocação a partir da data inicial e da duração em dias úteis.
 * A duração deve ser um número inteiro estritamente positivo (>= 1).
 * O dia inicial (normalizado para o próximo dia útil se coincidir com fim de semana) conta como o primeiro dia útil.
 * Preserva compatibilidade estrita com C# (Gantt.DataFim).
 */
export function dataFimDiasUteisCivil(inicio: string, dias: number): string {
  if (typeof dias !== "number" || !Number.isFinite(dias) || !Number.isInteger(dias) || dias <= 0) {
    throw new RangeError(`Duração em dias úteis deve ser número inteiro positivo: ${String(dias)}`);
  }
  return deslocarDiasUteisCivil(inicio, dias - 1);
}
