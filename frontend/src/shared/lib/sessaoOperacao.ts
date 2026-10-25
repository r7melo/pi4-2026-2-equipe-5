import axios from "axios";
import type { ContextoErro403, IdentidadeOperacional } from "@/shared/types/autorizacao";

let geracao = 0;
let assinatura = "";
let autenticada = false;
const erros = new WeakMap<object, ContextoErro403>();

export function invalidarSessaoOperacional(): void { geracao++; }

function assinaturaIdentidade(estado?: IdentidadeOperacional): string {
  return JSON.stringify([estado?.token, estado?.usuario?.id, estado?.usuario?.perfil?.nomePerfil, estado?.expiresAt]);
}

export function transicaoSessaoArmazenada(anterior: string | null, proxima: string | null): boolean {
  try {
    const antes = JSON.parse(anterior ?? "null") as { state?: IdentidadeOperacional } | null;
    const depois = JSON.parse(proxima ?? "null") as { state?: IdentidadeOperacional } | null;
    return assinaturaIdentidade(antes?.state) !== assinaturaIdentidade(depois?.state);
  } catch {
    return true;
  }
}

export function sincronizarSessaoOperacional(estado: IdentidadeOperacional): void {
  const proxima = assinaturaIdentidade(estado);
  if (proxima !== assinatura) { assinatura = proxima; invalidarSessaoOperacional(); }
  autenticada = Boolean(estado.token);
}

export function capturarSessaoOperacional(): number { return geracao; }
export function sessaoOperacionalVigente(origem: number): boolean { return autenticada && origem === geracao; }

class OperacaoDescartada extends Error {
  constructor() { super("Operação de uma sessão encerrada."); this.name = "OperacaoDescartada"; }
}

export function exigirSessaoOperacional(origem: number): void {
  if (!sessaoOperacionalVigente(origem)) throw new OperacaoDescartada();
}

export function registrarErro403(erro: object, contexto: ContextoErro403): void { erros.set(erro, contexto); }
export function herdarContexto403(origem: object, destino: object): void {
  const contexto = erros.get(origem);
  if (contexto) erros.set(destino, contexto);
}

export function statusHttp(erro: unknown): number | undefined {
  if (axios.isAxiosError(erro)) return erro.response?.status;
  if (erro instanceof Error && "status" in erro && typeof erro.status === "number") return erro.status;
}

export function erroDaSessaoAnterior(erro: unknown): boolean {
  if (erro instanceof OperacaoDescartada) return true;
  if (!(erro instanceof Error) || statusHttp(erro) !== 403) return false;
  const contexto = erros.get(erro);
  return contexto !== undefined && !sessaoOperacionalVigente(contexto.sessao);
}

export function deveExibirErroLocal(erro: unknown): boolean {
  if (erroDaSessaoAnterior(erro)) return false;
  return !(erro instanceof Error && statusHttp(erro) === 403 && erros.get(erro)?.avisoGlobal);
}
