import { MOCK_ATIVO } from "@/shared/lib/modoApi";
/* oxlint-disable react/only-export-components */
/* oxlint-disable react/set-state-in-effect */
import {
  createContext,
  useEffect,
  useRef,
  useState,
  useMemo,
  useCallback,
  type ReactNode,
} from "react";
import * as signalR from "@microsoft/signalr";
import { useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/shared/stores/useAuthStore";
import { BACKEND_ROOT_URL } from "@/shared/api/api";
import { agendarInvalidacaoProgramacoes, limparTemporizador } from "./signalrInvalidacao";

type SignalRStatus = "connected" | "connecting" | "reconnecting" | "disconnected";

interface SignalRContextValue {
  status: SignalRStatus;
  connection: signalR.HubConnection | null;
}

export const SignalRContext = createContext<SignalRContextValue | null>(null);


interface SignalRProviderProps {
  children: ReactNode;
}

export function SignalRProvider({ children }: SignalRProviderProps) {
  const queryClient = useQueryClient();
  const token = useAuthStore((s) => s.token);
  const [status, setStatus] = useState<SignalRStatus>("disconnected");
  const [connection, setConnection] = useState<signalR.HubConnection | null>(null);

  const connectionRef = useRef<signalR.HubConnection | null>(null);
  const isCancelledRef = useRef(false);
  const retryTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Debounce timers por chave de cache (100ms)
  const obrasTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const programacoesTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const comentariosTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const materiaisTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const invalidarObrasDebounced = useCallback(() => {
    limparTemporizador(obrasTimerRef);
    obrasTimerRef.current = setTimeout(() => {
      obrasTimerRef.current = null;
      // RN-05: Proteção Anti-Flicker no Kanban (verifica mutação otimista em trânsito)
      const mutacoesAtivas = queryClient.isMutating({ mutationKey: ["obras"] });
      if (mutacoesAtivas === 0) {
        void queryClient.invalidateQueries({ queryKey: ["obras"] });
        void queryClient.invalidateQueries({ queryKey: ["obra"] });
      }
    }, 100);
  }, [queryClient]);

  const invalidarProgramacoesDebounced = useCallback(() => {
    agendarInvalidacaoProgramacoes(queryClient, programacoesTimerRef);
  }, [queryClient]);

  const invalidarComentariosDebounced = useCallback(() => {
    limparTemporizador(comentariosTimerRef);
    comentariosTimerRef.current = setTimeout(() => {
      comentariosTimerRef.current = null;
      void queryClient.invalidateQueries({ queryKey: ["comentarios"] });
    }, 100);
  }, [queryClient]);

  const invalidarMateriaisDebounced = useCallback(() => {
    limparTemporizador(materiaisTimerRef);
    materiaisTimerRef.current = setTimeout(() => {
      materiaisTimerRef.current = null;
      void queryClient.invalidateQueries({ queryKey: ["materiais"] });
    }, 100);
  }, [queryClient]);

  useEffect(() => {
    isCancelledRef.current = false;

    // RN-09: Isolamento em ambiente mockado
    if (MOCK_ATIVO || !token) {
      return;
    }

    // RN-01: Conexão Canônica Oficial da Microsoft com URL normalizada compartilhada
    const hubUrl = `${BACKEND_ROOT_URL}/hubs/obras`;

    // RN-01: Conexão Canônica Oficial da Microsoft
    const conn = new signalR.HubConnectionBuilder()
      .withUrl(hubUrl, {
        withCredentials: true,
        accessTokenFactory: () => useAuthStore.getState().token || "",
      })
      .withAutomaticReconnect([0, 2000, 5000, 10000, 30000])
      .configureLogging(signalR.LogLevel.Warning)
      .build();

    connectionRef.current = conn;
    setConnection(conn);

    // Listeners de ciclo de vida
    conn.onreconnecting(() => {
      if (!isCancelledRef.current) setStatus("reconnecting");
    });

    conn.onreconnected(() => {
      if (!isCancelledRef.current) {
        setStatus("connected");
        // Ressincroniza dados perdidos durante o período de oscilação/reconexão
        invalidarObrasDebounced();
        invalidarProgramacoesDebounced();
      }
    });

    conn.onclose(() => {
      if (!isCancelledRef.current) {
        setStatus("disconnected");
        // Reinicia a repescagem caso as tentativas nativas de reconexão tenham se esgotado
        if (!retryTimerRef.current) {
          retryTimerRef.current = setInterval(() => {
            if (typeof document !== "undefined" && document.visibilityState === "hidden") {
              return;
            }
            if (connectionRef.current?.state === signalR.HubConnectionState.Disconnected) {
              void tentarConectar();
            }
          }, 30000);
        }
      }
    });

    // RN-07: Mapeamento de Tópicos Canônicos da ZL Engenharia
    conn.on("ObraAtualizada", () => {
      invalidarObrasDebounced();
    });

    conn.on("ProgramacaoAtualizada", () => {
      invalidarProgramacoesDebounced();
    });
    conn.on("ProgramacaoCriada", () => {
      invalidarProgramacoesDebounced();
    });
    conn.on("ProgramacaoExcluida", () => {
      invalidarProgramacoesDebounced();
    });

    conn.on("ComentarioCriado", () => {
      invalidarComentariosDebounced();
    });

    conn.on("MaterialAtualizado", () => {
      invalidarMateriaisDebounced();
    });

    // Função de tentativa de conexão
    const tentarConectar = async () => {
      if (isCancelledRef.current || conn.state !== signalR.HubConnectionState.Disconnected) {
        return;
      }

      setStatus("connecting");

      try {
        await conn.start();
        if (!isCancelledRef.current) {
          setStatus("connected");
          // Se conectou, cancela o timer de repescagem de handshake
          if (retryTimerRef.current) {
            clearInterval(retryTimerRef.current);
            retryTimerRef.current = null;
          }
        } else {
          // Desmontado durante o start (React 19 StrictMode)
          void conn.stop().catch(() => {});
        }
      } catch (err) {
        if (!isCancelledRef.current) {
          setStatus("disconnected");
          // RN-02: Diagnóstico informativo de degradação graciosa
          console.warn(
            "[SignalR] Serviço em tempo real indisponível no backend. Operando em modo REST convencional.",
            err
          );
        }
      }
    };

    // Dispara a primeira tentativa
    void tentarConectar();

    // RN-03: Rotina de repescagem de handshake inicial (30s)
    retryTimerRef.current = setInterval(() => {
      if (typeof document !== "undefined" && document.visibilityState === "hidden") {
        return;
      }
      if (connectionRef.current?.state === signalR.HubConnectionState.Disconnected) {
        void tentarConectar();
      }
    }, 30000);

    const listenersController = new AbortController();
    const reconectarSeDesconectado = () => {
      if (connectionRef.current?.state === signalR.HubConnectionState.Disconnected) {
        void tentarConectar();
      }
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        reconectarSeDesconectado();
      }
    };
    window.addEventListener("focus", reconectarSeDesconectado, { signal: listenersController.signal });
    document.addEventListener("visibilitychange", handleVisibilityChange, { signal: listenersController.signal });

    // RN-04: Limpeza segura compatível com React 19 StrictMode
    return () => {
      isCancelledRef.current = true;
      if (retryTimerRef.current) {
        clearInterval(retryTimerRef.current);
        retryTimerRef.current = null;
      }
      listenersController.abort();

      limparTemporizador(obrasTimerRef);
      limparTemporizador(programacoesTimerRef);
      limparTemporizador(comentariosTimerRef);
      limparTemporizador(materiaisTimerRef);

      if (
        conn.state === signalR.HubConnectionState.Connected ||
        conn.state === signalR.HubConnectionState.Reconnecting
      ) {
        void conn.stop().catch(() => {});
      }
      connectionRef.current = null;
      setConnection(null);
    };
  }, [
    token,
    invalidarObrasDebounced,
    invalidarProgramacoesDebounced,
    invalidarComentariosDebounced,
    invalidarMateriaisDebounced,
  ]);

  const value = useMemo(
    () => ({
      status,
      connection,
    }),
    [status, connection]
  );

  return <SignalRContext.Provider value={value}>{children}</SignalRContext.Provider>;
}
