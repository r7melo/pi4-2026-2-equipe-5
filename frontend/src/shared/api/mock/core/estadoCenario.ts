import { cenarioSchema, type Cenario } from "./contratosCenario";
import { gerarDadosCenario } from "../dados/gerarCenario";
import { registrarEfeitoDemonstracao, registrarContextoDemonstracao } from "@/shared/lib/contextoDemonstracao";

export const CHAVE_CENARIO = "mock_demonstracao_v1";
export const EVENTO_CENARIO = "demonstracao:alterada";
const TRAVA = "zl-demonstracao-v1";
let transacao: Cenario | undefined;
let somenteLeitura = false;
let cache: { raw: string; estado: Cenario } | undefined;

export class FalhaCenario extends Error {
  constructor(mensagem: string) { super(mensagem); this.name = "FalhaCenario"; }
}
export function lerBaseCenario(): string | null {
  try { return localStorage.getItem(CHAVE_CENARIO); }
  catch { throw new FalhaCenario("O navegador não permitiu ler a demonstração. Libere o armazenamento e tente novamente."); }
}
export function lerCenario(): Cenario {
  const raw = lerBaseCenario();
  if (raw === null) throw new FalhaCenario(mensagemLegado() ?? "Restaure a demonstração para continuar.");
  try {
    if (cache?.raw === raw) return cache.estado;
    const estado = cenarioSchema.parse(JSON.parse(raw));
    Object.freeze(estado.dados); Object.freeze(estado);
    cache = { raw, estado }; return estado;
  }
  catch { throw new FalhaCenario("Os dados da demonstração são incompatíveis ou estão danificados. Restaure para continuar."); }
}
export function geracaoCenario(): string { return (transacao ?? lerCenario()).geracao; }
registrarContextoDemonstracao(() => {
  try { return lerCenario().geracao; } catch { return ""; }
});
function publicar(): void { window.dispatchEvent(new Event(EVENTO_CENARIO)); }
function confirmar(estado: Cenario): void {
  const raw = JSON.stringify(cenarioSchema.parse(estado));
  try { localStorage.setItem(CHAVE_CENARIO, raw); }
  catch { throw new FalhaCenario("Não foi possível salvar a demonstração. Verifique o espaço e a permissão de armazenamento e tente novamente."); }
  publicar();
}
async function coordenar<T>(tarefa: () => Promise<T> | T): Promise<T> {
  if (!navigator.locks) throw new FalhaCenario("Este navegador não permite coordenar a demonstração entre abas.");
  try { return await navigator.locks.request(TRAVA, { mode: "exclusive", signal: AbortSignal.timeout(15000) }, tarefa); }
  catch (erro) {
    if (erro instanceof DOMException && ["AbortError", "TimeoutError"].includes(erro.name)) throw new FalhaCenario("A demonstração está ocupada em outra aba. Tente novamente em instantes.");
    throw erro;
  }
}
function mensagemLegado(): string | undefined {
  // Outra aba antiga nao publica seu sessionStorage. Marcadores globais sao conservadores.
  const exclusivo = [sessionStorage, localStorage].some(storage => Object.keys(storage).some(chave =>
    /^mock_(obras|equipes|programacoes|materiais|historico|comentarios|usuarios|links_cronograma|seguranca_senhas|gestao_usuarios)/.test(chave)));
  if (exclusivo) return "Há dados de uma demonstração anterior neste navegador. Confirme a restauração para usar o novo cenário.";
  if (localStorage.getItem("auth-storage") !== null || localStorage.getItem("zl_clientes_cadastrados_novos") !== null) {
    return "Há dados anteriores nesta aplicação. Confirme a criação da demonstração; os dados reais serão preservados.";
  }
}
export function dataLocalCenario(): string {
  const hoje = new Date();
  return [hoje.getFullYear(), String(hoje.getMonth() + 1).padStart(2, "0"), String(hoje.getDate()).padStart(2, "0")].join("-");
}
function novoCenario(): Cenario {
  const dataBase = dataLocalCenario();
  return { versao: 1, massa: 1, geracao: crypto.randomUUID(), dataBase, revisao: 0, dados: gerarDadosCenario(dataBase) };
}
export async function iniciarCenario(): Promise<void> {
  await coordenar(() => {
    if (lerBaseCenario() !== null) { lerCenario(); return; }
    const legado = mensagemLegado();
    if (legado) throw new FalhaCenario(legado);
    confirmar(novoCenario());
  });
}
export async function restaurarCenario(baseConfirmada: string | null): Promise<void> {
  await coordenar(() => {
    if (lerBaseCenario() !== baseConfirmada) throw new FalhaCenario("A demonstração mudou. Confira o cenário atual e confirme novamente.");
    confirmar(novoCenario());
  });
}
/** Leituras e efeitos de um handler usam a mesma imagem, com commit unico. */
export async function executarTransacaoCenario<T>(origem: string, tarefa: () => Promise<T>, deveConfirmar: (resultado: T) => boolean): Promise<T> {
  return coordenar(async () => {
    const estado = lerCenario();
    if (estado.geracao !== origem) throw new FalhaCenario("A demonstração foi restaurada. Refaça a operação.");
    transacao = structuredClone(estado);
    try {
      const resultado = await tarefa();
      const proximo = transacao;
      if (deveConfirmar(resultado) && JSON.stringify(proximo.dados) !== JSON.stringify(estado.dados)) {
        proximo.revisao++;
        confirmar(proximo);
      }
      return resultado;
    } finally { transacao = undefined; }
  });
}
export const armazenamentoCenario = {
  getItem(chave: string): string | null { return (transacao ?? lerCenario()).dados[chave] ?? null; },
  setItem(chave: string, valor: string): void {
    if (!transacao || somenteLeitura) throw new FalhaCenario("Gravação fora da transação da demonstração.");
    transacao.dados[chave] = valor;
  },
};
export function lerDadosCenario<T>(chave: string): T {
  const raw = armazenamentoCenario.getItem(chave);
  if (raw === null) throw new FalhaCenario("Dados da demonstração ausentes.");
  return JSON.parse(raw) as T;
}
export function salvarDadosCenario(chave: string, dados: unknown): void { armazenamentoCenario.setItem(chave, JSON.stringify(dados)); }

// Clipboard nao e cancelavel: o reset espera o efeito ja iniciado terminar.
registrarEfeitoDemonstracao((origem, tarefa) => coordenar(async () => {
  if (lerCenario().geracao !== origem) throw new FalhaCenario("A demonstração foi restaurada.");
  await tarefa();
}));

/** Projecoes GET capturam os dados antes do primeiro await; binarios usam essa copia. */
export function executarLeituraCenario<T>(origem: string, tarefa: () => T): T {
  const anterior = transacao, flagAnterior = somenteLeitura;
  const atual = lerCenario();
  if (atual.geracao !== origem) throw new FalhaCenario("A demonstração foi restaurada. Refaça a consulta.");
  transacao = structuredClone(atual); somenteLeitura = true;
  try { return tarefa(); } finally { transacao = anterior; somenteLeitura = flagAnterior; }
}
