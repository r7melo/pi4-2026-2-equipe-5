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
