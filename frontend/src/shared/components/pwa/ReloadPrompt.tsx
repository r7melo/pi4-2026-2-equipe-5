import { useRegisterSW } from "virtual:pwa-register/react";
import { toast } from "sonner";
import { useEffect } from "react";

/**
 * Escuta atualizações do Service Worker em segundo plano.
 * Quando um novo Service Worker é ativado, notifica o usuário via Sonner Toast
 * com botão de atualização não obstrutivo para preservar eventuais formulários abertos.
 */
export function ReloadPrompt() {
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r) {
      console.log("[PWA] Service Worker registrado com sucesso:", r);
    },
    onRegisterError(error) {
      console.warn("[PWA] Falha ao registrar Service Worker:", error);
    },
  });

  useEffect(() => {
    if (needRefresh) {
      toast.info("Nova versão do sistema disponível!", {
        action: {
          label: "Atualizar",
          onClick: () => {
            void updateServiceWorker(true);
          },
        },
        duration: Infinity,
      });
    }
  }, [needRefresh, updateServiceWorker]);

  return null;
}
