import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useAuthStore } from "@/shared/stores/useAuthStore";
import {
  salvarRotaRetorno,
  TOAST_ID_SESSAO_EXPIRADA,
  TOAST_ID_SESSAO_AVISO,
} from "@/shared/lib/rotasSessao";

export const TRES_MINUTOS_MS = 3 * 60 * 1000;
export const INTERVALO_CHECAGEM_MS = 15 * 1000;
const FALLBACK_SESSAO_MS = 480 * 60 * 1000;

export interface OpcoesMonitoramentoExpiracao {
  expiresAt: string | null;
  agoraMs?: () => number;
  obterRotaAtual?: () => string | null;
  salvarRotaRetorno: (rota: string) => void;
  onLogout: () => void;
  onExpirada: () => void;
  onAvisoProximo: () => void;
  avisoDisparadoInicial?: boolean;
  focusTarget?: EventTarget;
  visibilityTarget?: EventTarget;
  agendarIntervalo?: (callback: () => void, ms: number) => ReturnType<typeof globalThis.setInterval>;
  limparIntervalo?: (id: ReturnType<typeof globalThis.setInterval>) => void;
}

export function iniciarMonitoramentoExpiracao(opcoes: OpcoesMonitoramentoExpiracao): () => void {
  const agoraFn = opcoes.agoraMs ?? (() => Date.now());
  const expiracaoEfetiva =
    opcoes.expiresAt && !Number.isNaN(new Date(opcoes.expiresAt).getTime())
      ? opcoes.expiresAt
      : new Date(agoraFn() + FALLBACK_SESSAO_MS).toISOString();

  const expTime = new Date(expiracaoEfetiva).getTime();
  let avisoDisparado = Boolean(opcoes.avisoDisparadoInicial);
  let encerrada = false;
  let intervalId: ReturnType<typeof globalThis.setInterval> | undefined;

  const controlador = new AbortController();
  const limpar =
    opcoes.limparIntervalo ??
    ((id) => globalThis.clearInterval(id));

  const parar = () => {
    encerrada = true;
    if (!controlador.signal.aborted) {
      controlador.abort();
    }
    if (intervalId !== undefined) {
      limpar(intervalId);
      intervalId = undefined;
    }
  };

  const checarExpiracao = () => {
    if (encerrada) return;
    const deltaT = expTime - agoraFn();

    // 1. Sessão Expirada (deltaT <= 0): encerra monitoramento e listeners imediatamente
    if (deltaT <= 0) {
      parar();
      const rota = opcoes.obterRotaAtual?.();
      if (rota) {
        opcoes.salvarRotaRetorno(rota);
      }
      opcoes.onLogout();
      opcoes.onExpirada();
      return;
    }

    // 2. Aviso Prévio de 3 Minutos (0 < deltaT <= 180.000ms)
    if (deltaT <= TRES_MINUTOS_MS && !avisoDisparado) {
      avisoDisparado = true;
      opcoes.onAvisoProximo();
    }
  };

  // Executa a primeira checagem imediatamente ao montar antes de alocar listeners/intervalo
  checarExpiracao();
  if (encerrada) {
    return () => {};
  }

  const focusTarget = opcoes.focusTarget ?? (typeof window !== "undefined" ? window : undefined);
  const visibilityTarget =
    opcoes.visibilityTarget ?? (typeof document !== "undefined" ? document : undefined);

  focusTarget?.addEventListener("focus", checarExpiracao, { signal: controlador.signal });
  visibilityTarget?.addEventListener("visibilitychange", checarExpiracao, {
    signal: controlador.signal,
  });

  const agendar =
    opcoes.agendarIntervalo ??
    ((cb, ms) => globalThis.setInterval(cb, ms));

  intervalId = agendar(checarExpiracao, INTERVALO_CHECAGEM_MS);

  return parar;
}

export function useSessionExpiry(): void {
  const token = useAuthStore((s) => s.token);
  const expiresAt = useAuthStore((s) => s.expiresAt);
  const navigate = useNavigate();
  const avisoDisparadoRef = useRef(false);

  // Reinicia a flag de aviso sempre que o token for renovado ou alterado
  useEffect(() => {
    if (token) {
      avisoDisparadoRef.current = false;
    }
  }, [token]);

  useEffect(() => {
    // Early return estrito quando o usuário estiver desautenticado
    if (!token) {
      return;
    }

    return iniciarMonitoramentoExpiracao({
      expiresAt,
      avisoDisparadoInicial: avisoDisparadoRef.current,
      obterRotaAtual: () =>
        typeof window !== "undefined" ? window.location.pathname + window.location.search : null,
      salvarRotaRetorno,
      onLogout: () => useAuthStore.getState().logout(),
      onExpirada: () => {
        toast.error("Sua sessão expirou por inatividade. Faça login novamente para continuar.", {
          id: TOAST_ID_SESSAO_EXPIRADA,
        });
        void navigate("/login", { replace: true });
      },
      onAvisoProximo: () => {
        avisoDisparadoRef.current = true;
        toast.warning("Sua sessão expira em menos de 3 minutos. Salve suas alterações.", {
          id: TOAST_ID_SESSAO_AVISO,
        });
      },
    });
  }, [token, expiresAt, navigate]);
}
