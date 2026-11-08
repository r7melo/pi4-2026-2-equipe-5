import type { FiltrosRelatorioDemonstracao } from "@/shared/types/demonstracao";
import { periodoCivilValido } from "./datasCivis";
/** O periodo do relatorio considera termino real, ou o estimado enquanto nao concluida. */
export function filtrarPeriodo<T extends { clienteNome: string; dataFimReal?: string; dataFimEstimada: string }>(obras: T[], filtros: FiltrosRelatorioDemonstracao): T[] {
  if (!periodoCivilValido(filtros.periodoInicio, filtros.periodoFim)) return [];
  return obras.filter(o => {
    const data = o.dataFimReal || o.dataFimEstimada;
    return data >= filtros.periodoInicio && data <= filtros.periodoFim && (filtros.clienteFiltro === "todos" || o.clienteNome === filtros.clienteFiltro);
  });
}
