import type { LinkCronogramaValidado, PeriodoCompartilhado, ProgramacaoCompartilhada } from "@/types";
import { instanteISOValido, periodoCivilValido } from "@/shared/lib/datasCivis";
import { formatarDataISO } from "@/shared/lib/formatters";
import { statusHttp } from "@/shared/lib/sessaoOperacao";

export function periodoMesAtual(agora = new Date()): PeriodoCompartilhado {
  return {
    dataInicio: formatarDataISO(new Date(agora.getFullYear(), agora.getMonth(), 1)),
    dataFim: formatarDataISO(new Date(agora.getFullYear(), agora.getMonth() + 1, 0)),
  };
}

export function validarLinkRecebido(valor: unknown, origem: string): LinkCronogramaValidado {
  const falhar = () => new Error("Não foi possível confirmar o link recebido. Tente gerar novamente.");
  if (valor === null || typeof valor !== "object") throw falhar();
  const r = valor as Record<string, unknown>;
  if (typeof r.token !== "string" || !/^[A-Za-z0-9_-]{1,128}$/.test(r.token) ||
      typeof r.url !== "string" || !instanteISOValido(r.expiraEm)) throw falhar();
  let url: URL;
  try { url = new URL(r.url, origem); } catch { throw falhar(); }
  if (url.origin !== origem || !["http:", "https:"].includes(url.protocol) ||
      url.username || url.password || url.search || url.hash ||
      url.pathname !== "/cronograma/compartilhado/" + encodeURIComponent(r.token)) throw falhar();
  return { token: r.token, url: url.href, expiraEm: r.expiraEm, recebidoEm: Date.now() };
}

export function mensagemFalhaGeracao(erro: unknown): string {
  if (statusHttp(erro) === 400) return "Confira as datas do período e tente novamente.";
  if (erro instanceof Error && erro.message.startsWith("Não foi possível confirmar o link recebido.")) return erro.message;
  return "Não foi possível confirmar a geração. Uma nova tentativa pode criar outro link.";
}

const CAMPOS_PUBLICOS = new Set(["id", "obraId", "equipeId", "dataInicio", "dataFim", "prioridade", "duracaoEstimadaDias"]);
function programacaoPublicaValida(valor: unknown): valor is ProgramacaoCompartilhada {
  if (valor === null || typeof valor !== "object") return false;
  const p = valor as Record<string, unknown>;
  return Object.keys(p).every(campo => CAMPOS_PUBLICOS.has(campo)) &&
    [p.id, p.obraId, p.equipeId].every(id => typeof id === "number" && Number.isSafeInteger(id) && id > 0) &&
    typeof p.prioridade === "number" && Number.isFinite(p.prioridade) &&
    periodoCivilValido(p.dataInicio, p.dataFim) &&
    (p.duracaoEstimadaDias === undefined || (typeof p.duracaoEstimadaDias === "number" && Number.isFinite(p.duracaoEstimadaDias) && p.duracaoEstimadaDias > 0));
}

/** Defesa da apresentação; não substitui a proteção do payload no servidor. */
export function programacoesPublicasValidas(valor: unknown): valor is ProgramacaoCompartilhada[] {
  return Array.isArray(valor) && valor.every(programacaoPublicaValida);
}

/** Adaptador público: Date local evita o parser que converte anos 0–99 em 1900–1999. */
export function dataCivilParaGanttPublico(valor: string, dias = 0): Date {
  const [ano, mes, dia] = valor.split("-").map(Number);
  const data = new Date(0);
  data.setFullYear(ano, mes - 1, dia + dias);
  data.setHours(0, 0, 0, 0);
  return data;
}
