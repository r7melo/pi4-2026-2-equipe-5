import { useEffect } from "react";
import * as signalR from "@microsoft/signalr";
import { useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/stores/useAuthStore";

/**
 * Hook para conexão e sincronização em tempo real via SignalR.
 * Escuta eventos 'ObraAtualizada' do Hub /hubs/obras do backend ASP.NET Core
 * e invalida automaticamente as queries do TanStack Query para atualizar a UI.
 */
export function useSignalR() {
  const queryClient = useQueryClient();
  const token = useAuthStore((s) => s.token);

  useEffect(() => {
    if (!token) return;
    if (import.meta.env.VITE_USE_MOCK === "true") return;

    const baseUrl = (import.meta.env.VITE_API_URL as string | undefined) || "http://localhost:8000";
    const hubUrl = `${baseUrl}/hubs/obras`;

    const connection = new signalR.HubConnectionBuilder()
      .withUrl(hubUrl, {
        accessTokenFactory: () => token,
      })
      .withAutomaticReconnect()
      .build();

    connection
      .start()
      .catch((err) => {
        // Log preventivo caso o backend ASP.NET Core esteja offline em desenvolvimento local
        console.warn("[SignalR] Não foi possível conectar ao hub em tempo real:", err);
      });

    connection.on("ObraAtualizada", () => {
      // Invalida o cache e o React Query refaz o fetch automaticamente
      void queryClient.invalidateQueries({ queryKey: ["obras"] });
    });

    return () => {
      void connection.stop();
    };
  }, [token, queryClient]);
}
