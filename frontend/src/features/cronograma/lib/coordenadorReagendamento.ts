import type { QueryCacheNotifyEvent, QueryClient } from "@tanstack/react-query";

export type FaseReagendamento = "livre" | "salvando" | "sincronizando" | "recuperacao";

export interface IdentidadeOperacao {
  readonly sessao: number;
  readonly operacao: number;
}

export interface EstadoCoordenador {
  readonly sessao: number;
  readonly operacao: number | null;
  readonly fase: FaseReagendamento;
  readonly aviso: string | null;
}

export interface AmbienteSessao {
  readonly capturarSessao: () => number;
  readonly sessaoVigente: (sessao: number) => boolean;
}

export interface CoordenadorReagendamento {
  readonly lerEstado: () => EstadoCoordenador;
  readonly assinar: (ouvinte: () => void) => () => void;
  readonly reservar: (sessao?: number) => IdentidadeOperacao | undefined;
  readonly vigente: (origem: IdentidadeOperacao) => boolean;
  readonly pertenceAoContexto: (origem: IdentidadeOperacao) => boolean;
  readonly mudarFase: (origem: IdentidadeOperacao, fase: FaseReagendamento, aviso?: string | null) => boolean;
  readonly liberar: (origem: IdentidadeOperacao, manterAviso: boolean) => boolean;
  readonly versaoConfirmada: (id: number) => number;
  readonly confirmar: (origem: IdentidadeOperacao, ids: readonly number[]) => boolean;
  readonly chaveAtual: () => readonly ["programacoes", number];
  readonly sincronizarSessao: () => void;
  readonly descartar: () => void;
}

function extrairIds(dados: unknown): number[] {
  if (!Array.isArray(dados)) {
    return [];
  }
  const colecao: readonly unknown[] = dados;
  const ids: number[] = [];
  for (const item of colecao) {
    if (typeof item === "object" && item !== null && "id" in item) {
      const id: unknown = item.id;
      if (typeof id === "number" && Number.isFinite(id)) {
        ids.push(id);
      }
    }
  }
  return ids;
}

function ehChaveSessao(chave: unknown, sessao: number): boolean {
  if (!Array.isArray(chave)) {
    return false;
  }
  const partes: readonly unknown[] = chave;
  return partes.length === 2 && partes[0] === "programacoes" && partes[1] === sessao;
}

export function criarCoordenadorReagendamento(
  cliente: QueryClient,
  ambiente: AmbienteSessao
): CoordenadorReagendamento {
  let contadorOperacao = 0;
  let contadorVersao = 0;
  let idsConhecidos = new Set<number>();
  const versoesPorId = new Map<number, number>();
  const assinantes = new Set<() => void>();

  const sessaoInicial = ambiente.capturarSessao();
  let estadoAtual: EstadoCoordenador = Object.freeze({
    sessao: sessaoInicial,
    operacao: null,
    fase: "livre",
    aviso: null,
  });

  function notificar(): void {
    for (const ouvinte of assinantes) {
      ouvinte();
    }
  }

  function redefinirSessao(novaSessao: number, deveNotificar: boolean): void {
    estadoAtual = Object.freeze({
      sessao: novaSessao,
      operacao: null,
      fase: "livre",
      aviso: null,
    });
    versoesPorId.clear();
    idsConhecidos.clear();
    if (deveNotificar) {
      notificar();
    }
  }

  function obterSessaoSincronizada(deveNotificar = false): number {
    const sessaoReal = ambiente.capturarSessao();
    if (sessaoReal !== estadoAtual.sessao) {
      redefinirSessao(sessaoReal, deveNotificar);
    }
    return estadoAtual.sessao;
  }

  function lerEstado(): EstadoCoordenador {
    obterSessaoSincronizada(false);
    return estadoAtual;
  }

  function assinar(ouvinte: () => void): () => void {
    assinantes.add(ouvinte);
    return () => {
      assinantes.delete(ouvinte);
    };
  }

  function reservar(sessao?: number): IdentidadeOperacao | undefined {
    const sessaoAtiva = obterSessaoSincronizada(true);
    if (!ambiente.sessaoVigente(sessaoAtiva)) {
      return undefined;
    }
    if (sessao !== undefined && sessao !== sessaoAtiva) {
      return undefined;
    }
    if (estadoAtual.fase !== "livre") {
      return undefined;
    }

    contadorOperacao += 1;
    const operacao = contadorOperacao;
    estadoAtual = Object.freeze({
      sessao: sessaoAtiva,
      operacao,
      fase: "salvando",
      aviso: estadoAtual.aviso,
    });
    notificar();
    return Object.freeze({ sessao: sessaoAtiva, operacao });
  }

  function vigente(origem: IdentidadeOperacao): boolean {
    const sessaoReal = ambiente.capturarSessao();
    if (!ambiente.sessaoVigente(sessaoReal)) {
      return false;
    }
    if (sessaoReal !== origem.sessao || estadoAtual.sessao !== origem.sessao) {
      return false;
    }
    if (estadoAtual.operacao !== origem.operacao) {
      return false;
    }
    return estadoAtual.fase !== "livre";
  }

  function pertenceAoContexto(origem: IdentidadeOperacao): boolean {
    return (
      ambiente.sessaoVigente(origem.sessao) &&
      ambiente.capturarSessao() === origem.sessao &&
      estadoAtual.sessao === origem.sessao &&
      contadorOperacao === origem.operacao
    );
  }

  function mudarFase(
    origem: IdentidadeOperacao,
    fase: FaseReagendamento,
    aviso?: string | null
  ): boolean {
    if (!vigente(origem)) {
      return false;
    }
    const proximoAviso = aviso === undefined ? estadoAtual.aviso : aviso;
    if (estadoAtual.fase === fase && estadoAtual.aviso === proximoAviso) {
      return true;
    }
    estadoAtual = Object.freeze({
      sessao: estadoAtual.sessao,
      operacao: estadoAtual.operacao,
      fase,
      aviso: proximoAviso,
    });
    notificar();
    return true;
  }

  function liberar(origem: IdentidadeOperacao, manterAviso: boolean): boolean {
    if (!vigente(origem)) {
      return false;
    }
    const proximoAviso = manterAviso ? estadoAtual.aviso : null;
    estadoAtual = Object.freeze({
      sessao: estadoAtual.sessao,
      operacao: null,
      fase: "livre",
      aviso: proximoAviso,
    });
    notificar();
    return true;
  }

  function versaoConfirmada(id: number): number {
    return versoesPorId.get(id) ?? 0;
  }

  function confirmar(origem: IdentidadeOperacao, ids: readonly number[]): boolean {
    if (!vigente(origem)) {
      return false;
    }
    if (ids.length === 0) {
      return true;
    }
    contadorVersao += 1;
    const versao = contadorVersao;
    for (const id of ids) {
      versoesPorId.set(id, versao);
      idsConhecidos.add(id);
    }
    return true;
  }

  function chaveAtual(): readonly ["programacoes", number] {
    const sessao = obterSessaoSincronizada(false);
    return ["programacoes", sessao] as const;
  }

  function sincronizarSessao(): void {
    obterSessaoSincronizada(true);
  }

  function processarConfirmacaoQueryCache(dados: unknown): void {
    const idsRetornados = extrairIds(dados);
    const novosIds = new Set(idsRetornados);
    const afetados: number[] = [...novosIds];

    for (const anterior of idsConhecidos) {
      if (!novosIds.has(anterior)) {
        afetados.push(anterior);
      }
    }

    if (afetados.length === 0) {
      return;
    }

    contadorVersao += 1;
    const versao = contadorVersao;
    for (const id of afetados) {
      versoesPorId.set(id, versao);
    }
    idsConhecidos = novosIds;
  }

  const desinscreverQueryCache = cliente.getQueryCache().subscribe((evento: QueryCacheNotifyEvent) => {
    if (evento.type !== "updated") {
      return;
    }
    const acao = evento.action;
    if (acao.type !== "success" || acao.manual === true) {
      return;
    }
    const sessaoAtiva = obterSessaoSincronizada(true);
    if (!ambiente.sessaoVigente(sessaoAtiva)) {
      return;
    }
    if (!ehChaveSessao(evento.query.queryKey, sessaoAtiva)) {
      return;
    }
    const dados: unknown = acao.data ?? evento.query.state.data;
    processarConfirmacaoQueryCache(dados);
  });

  function descartar(): void {
    desinscreverQueryCache();
    assinantes.clear();
  }

  return Object.freeze({
    lerEstado,
    assinar,
    reservar,
    vigente,
    pertenceAoContexto,
    mudarFase,
    liberar,
    versaoConfirmada,
    confirmar,
    chaveAtual,
    sincronizarSessao,
    descartar,
  });
}
