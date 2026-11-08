import type { Programacao } from "@/shared/types/programacoes";
import { periodoCivilValido } from "@/shared/lib/datasCivis";

/** ISO da régua: anos 0/10000 são internos aos buffers, nunca datas de alocação. */
export interface JanelaDatasGantt {
  inicio: string;
  fim: string;
}

export function calcularJanelaProgramacoes(
  programacoes: readonly Programacao[]
): JanelaDatasGantt | null {
  if (!programacoes || programacoes.length === 0) {
    return null;
  }

  let menorInicio = programacoes[0].dataInicio;
  let maiorFim = programacoes[0].dataFim;

  for (let i = 0; i < programacoes.length; i++) {
    const p = programacoes[i];
    if (!periodoCivilValido(p.dataInicio, p.dataFim)) {
      throw new RangeError(
        `Período civil inválido na programação ${p.id}: ${String(p.dataInicio)} a ${String(p.dataFim)}`
      );
    }
    if (p.dataInicio < menorInicio) menorInicio = p.dataInicio;
    if (p.dataFim > maiorFim) maiorFim = p.dataFim;
  }

  const [aIniStr, mIniStr] = menorInicio.split("-");
  const aIni = Number(aIniStr);
  const mIni = Number(mIniStr);
  const totalMesesIni = aIni * 12 + (mIni - 1) - 3;
  const anoJanelaInicio = Math.floor(totalMesesIni / 12);
  const mesJanelaInicio = ((totalMesesIni % 12) + 12) % 12 + 1;

  const anoInicioISO = anoJanelaInicio > 9999 ? `+${String(anoJanelaInicio).padStart(6, "0")}` : String(anoJanelaInicio).padStart(4, "0");
  const inicio = `${anoInicioISO}-${String(mesJanelaInicio).padStart(2, "0")}-01`;

  const [aFimStr, mFimStr] = maiorFim.split("-");
  const aFim = Number(aFimStr);
  const mFim = Number(mFimStr);
  const totalMesesFim = aFim * 12 + (mFim - 1) + 12;
  const anoJanelaFim = Math.floor(totalMesesFim / 12);
  const mesJanelaFim = ((totalMesesFim % 12) + 12) % 12 + 1;

  const dataUltimoDia = new Date(0);
  dataUltimoDia.setUTCFullYear(anoJanelaFim, mesJanelaFim, 0);
  const ultimoDia = dataUltimoDia.getUTCDate();
  const anoFimISO = anoJanelaFim > 9999 ? `+${String(anoJanelaFim).padStart(6, "0")}` : String(anoJanelaFim).padStart(4, "0");
  const fim = `${anoFimISO}-${String(mesJanelaFim).padStart(2, "0")}-${String(ultimoDia).padStart(2, "0")}`;

  return { inicio, fim };
}
