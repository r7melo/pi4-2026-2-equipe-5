import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../stores/useAuthStore";
import { useSessionExpiry } from "../hooks/useSessionExpiry";

export function SessionLifecycleSentinel(): null {
  const navigate = useNavigate();

  // Aciona o monitoramento contínuo de expiração
  useSessionExpiry();

  // Sincronização multi-abas assíncrona com resolução de Promise no Zustand v5
  useEffect(() => {
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === "auth-storage") {
        void (async () => {
          await useAuthStore.persist.rehydrate();
          const tokenAtual = useAuthStore.getState().token;
          if (!tokenAtual) {
            // Se outra aba efetuou logout, conduz esta aba imediatamente para o login
            void navigate("/login", { replace: true });
          }
        })();
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => {
      window.removeEventListener("storage", handleStorageChange);
    };
  }, [navigate]);

  return null;
}

export default SessionLifecycleSentinel;

