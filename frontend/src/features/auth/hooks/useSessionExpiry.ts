import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useAuthStore } from "../stores/useAuthStore";
import {
  salvarRotaRetorno,
  TOAST_ID_SESSAO_EXPIRADA,
  TOAST_ID_SESSAO_AVISO,
} from "@/shared/lib/rotasSessao";

const TRES_MINUTOS_MS = 3 * 60 * 1000;
const INTERVALO_CHECAGEM_MS = 15 * 1000;

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

    // Se houver token mas expiresAt for nulo ou inválido, adota o fallback de 480 min
    const expiracaoEfetiva =
      expiresAt && !Number.isNaN(new Date(expiresAt).getTime())
        ? expiresAt
        : new Date(Date.now() + 480 * 60 * 1000).toISOString();

    const expTime = new Date(expiracaoEfetiva).getTime();

    const checarExpiracao = () => {
      const agora = Date.now();
      const deltaT = expTime - agora;

      // 1. Sessão Expirada (deltaT <= 0)
      if (deltaT <= 0) {
        if (typeof window !== "undefined") {
          salvarRotaRetorno(window.location.pathname + window.location.search);
        }
        useAuthStore.getState().logout();
        toast.error("Sua sessão expirou por inatividade. Faça login novamente para continuar.", {
          id: TOAST_ID_SESSAO_EXPIRADA,
        });
        void navigate("/login", { replace: true });
        return;
      }

      // 2. Aviso Prévio de 3 Minutos (0 < deltaT <= 180.000ms)
      if (deltaT <= TRES_MINUTOS_MS && !avisoDisparadoRef.current) {
        avisoDisparadoRef.current = true;
        toast.warning("Sua sessão expira em menos de 3 minutos. Salve suas alterações.", {
          id: TOAST_ID_SESSAO_AVISO,
        });
      }
    };

    // Executa a primeira checagem imediatamente ao montar
    checarExpiracao();

    const intervalId = window.setInterval(checarExpiracao, INTERVALO_CHECAGEM_MS);
    window.addEventListener("focus", checarExpiracao);
    document.addEventListener("visibilitychange", checarExpiracao);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("focus", checarExpiracao);
      document.removeEventListener("visibilitychange", checarExpiracao);
    };
  }, [token, expiresAt, navigate]);
}
