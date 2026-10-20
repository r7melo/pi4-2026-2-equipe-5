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

    const baseUrl = window.location.protocol === "https:"
      ? window.location.origin
      : (import.meta.env.VITE_API_URL as string | undefined) || `${window.location.protocol}//${window.location.hostname}:8000`;
    const hubUrl = `${baseUrl}/hubs/obras`;

    const connection = new signalR.HubConnectionBuilder()
      .withUrl(hubUrl, {
        accessTokenFactory: () => token,
      })
      .withAutomaticReconnect()
      .build();

    connection.on("ObraAtualizada", (evento?: { obraId?: number | null }) => {
      // Eventos gerais renovam Kanban/Gantt; quando há ID, renova também o detalhe da obra.
      void queryClient.invalidateQueries({ queryKey: ["obras"] });
      void queryClient.invalidateQueries({ queryKey: ["programacoes"] });
      if (evento?.obraId != null) {
        void queryClient.invalidateQueries({ queryKey: ["obra", evento.obraId] });
        void queryClient.invalidateQueries({ queryKey: ["materiais", evento.obraId] });
        void queryClient.invalidateQueries({ queryKey: ["relatorio-custo", evento.obraId] });
      }
    });

    let encerrado = false;
    let temporizadorReconexao: number | undefined;
    const agendarReconexao = () => {
      if (encerrado || temporizadorReconexao !== undefined) return;
      temporizadorReconexao = window.setTimeout(() => {
        temporizadorReconexao = undefined;
        void connection.start().catch((err) => {
          console.warn("[SignalR] Nao foi possivel conectar ao hub em tempo real:", err);
          agendarReconexao();
        });
      }, 5000);
    };
    connection.onclose(() => agendarReconexao());
    void connection.start().catch((err) => {
      console.warn("[SignalR] Nao foi possivel conectar ao hub em tempo real:", err);
      agendarReconexao();
    });

    return () => {
      encerrado = true;
      if (temporizadorReconexao !== undefined) window.clearTimeout(temporizadorReconexao);
      void connection.stop();
    };
  }, [token, queryClient]);
}
