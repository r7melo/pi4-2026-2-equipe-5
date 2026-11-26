import { useCallback, useEffect } from "react";
import { useLocation, useNavigate, useNavigationType } from "react-router-dom";
import { useAuthStore } from "@/shared/stores/useAuthStore";
import { useHistoricoNavegacaoStore } from "@/shared/stores/useHistoricoNavegacaoStore";

export interface OpcoesVoltarSeguro {
  backState?: unknown;
}

export function RastreadorHistoricoNavegacao() {
  const location = useLocation();
  const navigationType = useNavigationType();

  useEffect(() => {
    useHistoricoNavegacaoStore.getState().registrar(
      {
        key: location.key,
        pathname: location.pathname,
        search: location.search,
      },
      navigationType,
    );
  }, [location.key, location.pathname, location.search, navigationType]);

  return null;
}

function deveAplicarEstadoAoFallback(
  backState: unknown,
  fallback: string | undefined,
  anteriorPathname: string,
): boolean {
  if (backState == null || !fallback || anteriorPathname !== fallback) {
    return false;
  }
  if (typeof backState === "object" && "from" in backState) {
    return false;
  }
  return true;
}

export function useVoltarSeguro(
  fallback?: string,
  opcoes?: OpcoesVoltarSeguro,
): () => void {
  const navigate = useNavigate();
  const backState = opcoes?.backState;

  return useCallback(() => {
    const perfil = useAuthStore.getState().usuario?.perfil?.nomePerfil;
    const anterior = useHistoricoNavegacaoStore
      .getState()
      .obterAnteriorValida(perfil);
    const idx =
      typeof window !== "undefined"
        ? (window.history.state as { idx?: number } | null)?.idx
        : undefined;

    if (anterior) {
      if (deveAplicarEstadoAoFallback(backState, fallback, anterior.pathname)) {
        void navigate(anterior.rota, { state: backState, replace: true });
        return;
      }
      if (typeof idx === "number" && idx > 0) {
        void navigate(-1);
        return;
      }
      void navigate(anterior.rota, { replace: true });
      return;
    }

    if (fallback) {
      void navigate(fallback, { state: backState });
    }
  }, [navigate, fallback, backState]);
}
