import { useEffect, useRef, useState } from "react";
import { notifyManager, useQueryClient } from "@tanstack/react-query";
import { capturarSessaoOperacional, invalidarSessaoOperacional, transicaoSessaoArmazenada } from "@/shared/lib/sessaoOperacao";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../stores/useAuthStore";
import { useSessionExpiry } from "../hooks/useSessionExpiry";

const consultaProtegida = (chave: readonly unknown[]) => !["relatorioPublico", "cronogramaPublico"].includes(String(chave[0]));

export function SessionLifecycleSentinel(): null {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [geracaoConsultas, publicarGeracao] = useState(capturarSessaoOperacional);
  const ultimaRevalidada = useRef(geracaoConsultas);

  // Aciona o monitoramento contínuo de expiração
  useSessionExpiry();

  // A store publica a geração antes dos seus assinantes de interface.
  // Reset cancela o retryer antigo sem remover os observers ainda montados.
  useEffect(() => {
    let geracao = capturarSessaoOperacional();
    const sincronizarConsultas = () => {
      const atual = capturarSessaoOperacional();
      if (atual === geracao) return;
      geracao = atual;
      notifyManager.batch(() => {
        queryClient.getQueryCache().getAll().filter(q => consultaProtegida(q.queryKey)).forEach(q => q.reset());
      });
      publicarGeracao(atual);
    };
    const desassinar = useAuthStore.subscribe(sincronizarConsultas);
    return desassinar;
  }, [queryClient]);

  // Refazer após o commit: guardas/modais do perfil anterior já desmontaram.
  useEffect(() => {
    if (geracaoConsultas === ultimaRevalidada.current) return;
    ultimaRevalidada.current = geracaoConsultas;
    if (!useAuthStore.getState().token) return;
    void queryClient.refetchQueries({ type: "active", predicate: q => consultaProtegida(q.queryKey) });
  }, [geracaoConsultas, queryClient]);

  // O evento pode descrever logout/login já concluídos no storage atual.
  useEffect(() => {
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === "auth-storage" && (!event.storageArea || event.storageArea === localStorage)) {
        if (transicaoSessaoArmazenada(event.oldValue, event.newValue)) invalidarSessaoOperacional();
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

