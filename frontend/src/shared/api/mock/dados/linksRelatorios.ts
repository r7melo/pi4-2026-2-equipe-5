import type { FiltrosRelatorioDemonstracao } from "@/shared/types/demonstracao";
import { lerDadosCenario, salvarDadosCenario } from "../core/estadoCenario";
import { periodoCivilValido } from "@/shared/lib/datasCivis";
type Registro = FiltrosRelatorioDemonstracao & { usuarioId: number };
export function criarLinkRelatorio(filtros: FiltrosRelatorioDemonstracao, usuarioId: number): string {
  if (!periodoCivilValido(filtros.periodoInicio, filtros.periodoFim) || typeof filtros.clienteFiltro !== "string") throw new Error("Confira os filtros do relatório.");
  const registros = lerDadosCenario<Record<string, Registro>>("mock_links_relatorios_v1");
  const token = "r92_" + crypto.randomUUID();
  registros[token] = { ...filtros, usuarioId };
  salvarDadosCenario("mock_links_relatorios_v1", registros);
  return token;
}
export function buscarLinkRelatorio(token: string): Registro | undefined {
  if (!/^r92_[0-9a-f-]{36}$/.test(token)) return undefined;
  const registros = lerDadosCenario<Record<string, Registro>>("mock_links_relatorios_v1");
  return Object.hasOwn(registros, token) ? registros[token] : undefined;
}
