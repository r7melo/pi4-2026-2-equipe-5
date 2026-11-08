import { dataCivilValida, somarDiasCivisUTC } from "@/shared/lib/datasCivis";

export function dataCivilParaGantt(iso: string): Date {
  if (!dataCivilValida(iso)) {
    throw new RangeError(`Data civil inválida: ${String(iso)}`);
  }
  const [anoStr, mesStr, diaStr] = iso.split("-");
  const ano = Number(anoStr);
  const mes = Number(mesStr);
  const dia = Number(diaStr);
  const data = new Date(ano, mes - 1, dia, 0, 0, 0, 0);
  if (ano < 100) {
    data.setFullYear(ano);
  }
  return data;
}

export function dataGanttParaCivil(data: Date): string {
  if (!(data instanceof Date) || !Number.isFinite(data.getTime())) {
    throw new RangeError(`Data do Gantt inválida: ${String(data)}`);
  }
  const ano = data.getFullYear();
  const mes = data.getMonth() + 1;
  const dia = data.getDate();
  if (ano < 1 || ano > 9999) {
    throw new RangeError(`Ano fora do intervalo civil de 0001 a 9999: ${ano}`);
  }
  const iso = `${String(ano).padStart(4, "0")}-${String(mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
  if (!dataCivilValida(iso)) {
    throw new RangeError(`Data civil calculada inválida: ${String(iso)}`);
  }
  return iso;
}

export function fimCivilParaGanttExclusivo(iso: string): Date {
  if (!dataCivilValida(iso)) {
    throw new RangeError(`Data civil final inválida: ${String(iso)}`);
  }
  if (iso === "9999-12-31") {
    return new Date(10000, 0, 1, 0, 0, 0, 0);
  }
  let proximoDia: string;
  try {
    proximoDia = somarDiasCivisUTC(iso, 1);
  } catch {
    throw new RangeError(`Data final exclusiva excede intervalo civil de 0001 a 9999: ${iso}`);
  }
  if (!dataCivilValida(proximoDia)) {
    throw new RangeError(`Data final exclusiva fora do intervalo civil de 0001 a 9999: ${String(proximoDia)}`);
  }
  return dataCivilParaGantt(proximoDia);
}

export function fimGanttParaCivilInclusivo(data: Date): string {
  if (!(data instanceof Date) || !Number.isFinite(data.getTime())) {
    throw new RangeError(`Data do Gantt inválida: ${String(data)}`);
  }
  const ano = data.getFullYear();
  const mes = data.getMonth() + 1;
  const dia = data.getDate();
  if (ano === 10000 && mes === 1 && dia === 1) {
    return "9999-12-31";
  }
  const exclusivoISO = dataGanttParaCivil(data);
  let inclusivoISO: string;
  try {
    inclusivoISO = somarDiasCivisUTC(exclusivoISO, -1);
  } catch {
    throw new RangeError(`Data civil inclusiva excede intervalo civil de 0001 a 9999: ${exclusivoISO}`);
  }
  if (!dataCivilValida(inclusivoISO)) {
    throw new RangeError(`Data civil inclusiva fora do intervalo civil de 0001 a 9999: ${String(inclusivoISO)}`);
  }
  return inclusivoISO;
}

export function arredondarDataGanttCivil(data: Date): string {
  if (!(data instanceof Date) || !Number.isFinite(data.getTime())) {
    throw new RangeError(`Data do Gantt inválida: ${String(data)}`);
  }
  const diaAtualISO = dataGanttParaCivil(data);
  const inicioDiaAtual = dataCivilParaGantt(diaAtualISO);

  let proximoDiaISO: string;
  try {
    proximoDiaISO = somarDiasCivisUTC(diaAtualISO, 1);
  } catch {
    throw new RangeError(`Arredondamento excede intervalo civil de 0001 a 9999: ${diaAtualISO}`);
  }

  if (!dataCivilValida(proximoDiaISO)) {
    const inicioProximoMs = new Date(data.getFullYear(), data.getMonth(), data.getDate() + 1, 0, 0, 0, 0).getTime();
    const distAtual = Math.abs(data.getTime() - inicioDiaAtual.getTime());
    const distProximo = Math.abs(inicioProximoMs - data.getTime());
    if (distProximo <= distAtual) {
      throw new RangeError("Arredondamento excede intervalo civil de 0001 a 9999");
    }
    return diaAtualISO;
  }

  const inicioProximoDia = dataCivilParaGantt(proximoDiaISO);
  const distAtual = Math.abs(data.getTime() - inicioDiaAtual.getTime());
  const distProximo = Math.abs(inicioProximoDia.getTime() - data.getTime());

  return distProximo <= distAtual ? proximoDiaISO : diaAtualISO;
}

/** Datas da régua podem exceder DateOnly pelos buffers; nunca usar em payloads. */
export function dataJanelaParaGantt(iso: string): Date {
  const partes = /^(\d{4}|\+\d{6})-(\d{2})-(\d{2})$/.exec(iso);
  if (!partes) throw new RangeError(`Data da janela inválida: ${iso}`);
  const ano = Number(partes[1]);
  const mes = Number(partes[2]);
  const dia = Number(partes[3]);
  if (ano < 0 || ano > 10001 || mes < 1 || mes > 12 || dia < 1 || dia > 31) {
    throw new RangeError(`Data da janela fora do intervalo interno: ${iso}`);
  }
  const data = new Date(2000, 0, 1, 0, 0, 0, 0);
  data.setFullYear(ano, mes - 1, dia);
  if (dataGanttParaJanela(data) !== iso) {
    throw new RangeError(`Data da janela inexistente ou não canônica: ${iso}`);
  }
  return data;
}

export function dataGanttParaJanela(data: Date): string {
  if (!(data instanceof Date) || !Number.isFinite(data.getTime())) {
    throw new RangeError("Data da régua inválida.");
  }
  const ano = data.getFullYear();
  if (ano < 0 || ano > 10001) throw new RangeError(`Ano da régua inválido: ${ano}`);
  const anoISO = ano > 9999 ? `+${String(ano).padStart(6, "0")}` : String(ano).padStart(4, "0");
  return `${anoISO}-${String(data.getMonth() + 1).padStart(2, "0")}-${String(data.getDate()).padStart(2, "0")}`;
}

export function fimJanelaParaGanttExclusivo(iso: string): Date {
  const data = dataJanelaParaGantt(iso);
  data.setDate(data.getDate() + 1);
  // Validar também o avanço sem relaxar o domínio de datas de programação.
  dataGanttParaJanela(data);
  return data;
}
