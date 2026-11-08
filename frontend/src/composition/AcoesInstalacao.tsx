import { useCallback, useSyncExternalStore } from "react";
import { useLocation } from "react-router-dom";
import { useAuthStore } from "@/features/auth/stores/useAuthStore";
import { useModoDisplay } from "@/shared/contexts/ModoDisplayContext";
import { ExportarDetalhesInstalacao } from "@/features/obras/components/ExportarDetalhesInstalacao";
import type { ExportarDetalhesInstalacaoProps } from "@/features/obras/types/exportacaoInstalacao";
import { lerAutorizacaoInstalacao, assinarAutorizacaoInstalacao } from "./autorizacaoInstalacao";

export function AcoesInstalacao({ obraId }: Pick<ExportarDetalhesInstalacaoProps, "obraId">) {
  const usuario = useAuthStore((s) => s.usuario);
  const autorizacao = useSyncExternalStore(assinarAutorizacaoInstalacao, lerAutorizacaoInstalacao, lerAutorizacaoInstalacao);
  const { podeInteragir, epoch } = useModoDisplay();
  const { pathname } = useLocation();
  const contextoValido = useCallback(() => {
    const state = useAuthStore.getState();
    const expiracao = state.expiresAt ? Date.parse(state.expiresAt) : NaN;
    return !autorizacao.signal.aborted && autorizacao === lerAutorizacaoInstalacao() &&
      Boolean(state.token && state.usuario?.perfil?.nomePerfil === "Administrador") &&
      Number.isFinite(expiracao) && expiracao > Date.now() &&
      window.location.pathname === pathname && podeInteragir(epoch);
  }, [autorizacao, epoch, pathname, podeInteragir]);
  if (usuario?.perfil?.nomePerfil !== "Administrador") return null;
  return <ExportarDetalhesInstalacao key={`${obraId}:${epoch}:${autorizacao.geracao}`} obraId={obraId}
    contextoValido={contextoValido} sinalContexto={autorizacao.signal} />;
}
