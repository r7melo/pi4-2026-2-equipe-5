import { create } from "zustand";
import { isRotaAutorizadaParaPerfil } from "@/shared/lib/rotasSessao";
import type { NomePerfil } from "@/shared/types/autorizacao";

export interface EntradaHistorico {
  key: string;
  pathname: string;
  search: string;
  rota: string;
}

const LIMITE_PILHA = 30;

const ROTAS_NAO_RASTREAVEIS = new Set([
  "/",
  "/login",
  "/esqueci-senha",
  "/redefinir-senha",
  "/sem-permissao",
]);

function normalizarPathname(pathname: string): string {
  return pathname.length > 1 ? pathname.replace(/\/+$/, "") || "/" : pathname;
}

export function ehRotaRastreavel(pathname: string): boolean {
  const normalizado = normalizarPathname(pathname);
  if (ROTAS_NAO_RASTREAVEIS.has(normalizado)) return false;
  if (
    normalizado.startsWith("/cronograma/compartilhado") ||
    normalizado.startsWith("/relatorio-publico")
  ) {
    return false;
  }
  return true;
}

interface HistoricoNavegacaoState {
  pilha: EntradaHistorico[];
  registrar: (
    entrada: { key: string; pathname: string; search: string },
    tipo: "POP" | "PUSH" | "REPLACE",
  ) => void;
  obterAnteriorValida: (perfil?: NomePerfil) => EntradaHistorico | null;
  limpar: () => void;
}

export const useHistoricoNavegacaoStore = create<HistoricoNavegacaoState>((set, get) => ({
  pilha: [],
  registrar: (entrada, tipo) => {
    const pathname = normalizarPathname(entrada.pathname);
    if (!ehRotaRastreavel(pathname)) return;

    const item: EntradaHistorico = {
      key: entrada.key,
      pathname,
      search: entrada.search,
      rota: `${pathname}${entrada.search}`,
    };

    set((state) => {
      const atual = state.pilha;
      if (tipo === "POP") {
        let idx = -1;
        for (let i = atual.length - 1; i >= 0; i -= 1) {
          if (atual[i].key === item.key) {
            idx = i;
            break;
          }
        }
        if (idx === -1) {
          for (let i = atual.length - 1; i >= 0; i -= 1) {
            if (atual[i].rota === item.rota) {
              idx = i;
              break;
            }
          }
        }
        if (idx >= 0) {
          return {
            pilha: [...atual.slice(0, idx), item].slice(-LIMITE_PILHA),
          };
        }
        const topo = atual[atual.length - 1];
        if (topo?.rota === item.rota) {
          return {
            pilha: [...atual.slice(0, -1), item],
          };
        }
        return { pilha: [...atual, item].slice(-LIMITE_PILHA) };
      }

      if (tipo === "REPLACE") {
        if (atual.length === 0) return { pilha: [item] };
        return { pilha: [...atual.slice(0, -1), item].slice(-LIMITE_PILHA) };
      }

      // PUSH
      const topo = atual[atual.length - 1];
      if (topo?.rota === item.rota) {
        return { pilha: [...atual.slice(0, -1), item] };
      }
      return { pilha: [...atual, item].slice(-LIMITE_PILHA) };
    });
  },
  obterAnteriorValida: (perfil) => {
    const { pilha } = get();
    if (pilha.length < 2) return null;
    const topo = pilha[pilha.length - 1];
    for (let i = pilha.length - 2; i >= 0; i -= 1) {
      const candidata = pilha[i];
      if (candidata.rota === topo.rota) continue;
      if (isRotaAutorizadaParaPerfil(candidata.pathname, perfil)) {
        return candidata;
      }
    }
    return null;
  },
  limpar: () => set({ pilha: [] }),
}));
