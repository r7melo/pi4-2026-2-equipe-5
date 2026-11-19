import { useRegisterSW } from "virtual:pwa-register/react";
import { toast } from "sonner";
import { useEffect, useRef } from "react";

/**
 * Escuta atualizações do Service Worker em segundo plano.
 * Quando um novo Service Worker é ativado, notifica o usuário via Sonner Toast
 * com botão de atualização não obstrutivo para preservar eventuais formulários abertos.
 */
export function ReloadPrompt() {
  const recargaEscolhida = useRef(false);
  const controleAtualizado = useRef(false);
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    // O plugin conserva os callbacks da primeira renderização: consultar refs.
    // Outra aba pode ativar o SW, mas só esta aba pode autorizar sua recarga.
    onNeedReload() {
      controleAtualizado.current = true;
      if (recargaEscolhida.current) window.location.reload();
    },
    onRegistered(r) {
      console.log("[PWA] Service Worker registrado com sucesso:", r);
    },
    onRegisterError(error) {
      console.warn("[PWA] Falha ao registrar Service Worker:", error);
    },
  });

  useEffect(() => {
    if (needRefresh) {
      toast.info("Nova versão disponível. Salve suas alterações antes de atualizar.", {
        id: "atualizacao-disponivel",
        action: {
          label: "Atualizar e recarregar",
          onClick: (event) => {
            if (!navigator.onLine) { event.preventDefault(); toast.error("Conecte-se à internet para atualizar."); return; }
            recargaEscolhida.current = true;
            if (controleAtualizado.current) window.location.reload();
            else void updateServiceWorker(true);
          },
        },
        duration: Infinity,
      });
    }
  }, [needRefresh, updateServiceWorker]);

  return null;
}
