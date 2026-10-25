import type { PeriodoCompartilhado, LinkCronogramaCompartilhado, FiltrosCronogramaCompartilhado, ProgramacaoCompartilhada } from "@/shared/types/compartilhamentoCronograma";
import { dataCivilValida, periodoCivilValido, instanteISOValido, diasUteisCivis, diaUtilCivil, somarDiasCivisUTC } from "@/shared/lib/datasCivis";
import { obterProgramacoesArmazenadas } from "./programacoes";

export const STORAGE_LINKS_CRONOGRAMA = "mock_links_cronograma_v1";
const VALIDADE_MS = 7 * 24 * 60 * 60 * 1000;
const TOKEN = /^g86_[0-9a-f]{32}$/;

interface RegistroLink extends PeriodoCompartilhado {
  token: string;
  expiraEm: string;
  criadoEm: number;
  usuarioId: number;
}

function registroValido(valor: unknown): valor is RegistroLink {
  if (valor === null || typeof valor !== "object") return false;
  const r = valor as Partial<RegistroLink>;
  return typeof r.token === "string" && TOKEN.test(r.token) &&
    periodoCivilValido(r.dataInicio, r.dataFim) && instanteISOValido(r.expiraEm) &&
    typeof r.criadoEm === "number" && Number.isFinite(r.criadoEm) && r.criadoEm > 0 &&
    Date.parse(r.expiraEm) === r.criadoEm + VALIDADE_MS &&
    typeof r.usuarioId === "number" && Number.isSafeInteger(r.usuarioId) && r.usuarioId > 0;
}

function lerRegistros(): RegistroLink[] {
  const raw = sessionStorage.getItem(STORAGE_LINKS_CRONOGRAMA);
  if (raw === null) return [];
  const parsed: unknown = JSON.parse(raw);
  if (!Array.isArray(parsed) || !parsed.every(registroValido)) throw new Error("Cadastro de links inválido.");
  const registros = parsed;
  if (new Set(registros.map(r => r.token)).size !== registros.length) throw new Error("Tokens duplicados.");
  return registros;
}

export function criarLinkCronograma(periodo: PeriodoCompartilhado, usuarioId: number): LinkCronogramaCompartilhado {
  const registros = lerRegistros();
  let token = "";
  for (let tentativa = 0; tentativa < 3; tentativa++) {
    const bytes = crypto.getRandomValues(new Uint8Array(16));
    const candidato = "g86_" + Array.from(bytes, n => n.toString(16).padStart(2, "0")).join("");
    if (!registros.some(r => r.token === candidato)) { token = candidato; break; }
  }
  if (!token) throw new Error("Não foi possível gerar um token único.");
  const criadoEm = Date.now();
  const expiraEm = new Date(criadoEm + VALIDADE_MS).toISOString();
  const registro = { ...periodo, token, expiraEm, criadoEm, usuarioId };
  sessionStorage.setItem(STORAGE_LINKS_CRONOGRAMA, JSON.stringify([...registros, registro]));
  return { token, expiraEm, url: "/cronograma/compartilhado/" + token };
}

export function buscarLinkCronograma(token: string): RegistroLink | undefined {
  if (!TOKEN.test(token)) return undefined;
  return lerRegistros().find(r => r.token === token && Date.now() < Date.parse(r.expiraEm));
}

export function filtrosPublicosValidos(filtros: FiltrosCronogramaCompartilhado): boolean {
  return (filtros.dataInicio === undefined || dataCivilValida(filtros.dataInicio)) &&
    (filtros.dataFim === undefined || dataCivilValida(filtros.dataFim)) &&
    (filtros.dataInicio === undefined || filtros.dataFim === undefined || filtros.dataInicio <= filtros.dataFim);
}

export function consultarLinkCronograma(registro: PeriodoCompartilhado, filtros: FiltrosCronogramaCompartilhado): ProgramacaoCompartilhada[] {
  const inicio = filtros.dataInicio && filtros.dataInicio > registro.dataInicio ? filtros.dataInicio : registro.dataInicio;
  const fim = filtros.dataFim && filtros.dataFim < registro.dataFim ? filtros.dataFim : registro.dataFim;
  if (inicio > fim) return [];
  return obterProgramacoesArmazenadas().flatMap(p => {
    if (!periodoCivilValido(p.dataInicio, p.dataFim)) return [];
    let dataInicio = p.dataInicio > inicio ? p.dataInicio : inicio;
    let dataFim = p.dataFim < fim ? p.dataFim : fim;
    const duracaoEstimadaDias = diasUteisCivis(dataInicio, dataFim);
    if (duracaoEstimadaDias === 0) return [];
    while (!diaUtilCivil(dataInicio)) dataInicio = somarDiasCivisUTC(dataInicio, 1);
    while (!diaUtilCivil(dataFim)) dataFim = somarDiasCivisUTC(dataFim, -1);
    return [{
      id: p.id, obraId: p.obraId, equipeId: p.equipeId,
      dataInicio, dataFim, prioridade: p.prioridade, duracaoEstimadaDias,
    }];
  });
}
