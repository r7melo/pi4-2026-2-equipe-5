import { MOCK_ATIVO } from "./modoApi";
let registrado = false;
let ler: () => string = () => "";
export function registrarContextoDemonstracao(fonte: () => string): void { ler = fonte; registrado = true; }
export function contextoDemonstracao(): string { return MOCK_ATIVO ? ler() : "real"; }
export function contextoDemonstracaoVigente(origem: string): boolean { return origem === contextoDemonstracao(); }
export function tokenDemonstracaoVigente(token: string): boolean {
  return !MOCK_ATIVO || !registrado || (contextoDemonstracao() !== "" && token.endsWith("_g" + contextoDemonstracao()));
}

let efeito: (origem: string, tarefa: () => Promise<void>) => Promise<void> = async (_origem, tarefa) => { await tarefa(); };
export function registrarEfeitoDemonstracao(executar: typeof efeito): void { efeito = executar; }
export async function executarEfeitoDemonstracao(origem: string, tarefa: () => Promise<void>): Promise<void> { await efeito(origem, tarefa); }
