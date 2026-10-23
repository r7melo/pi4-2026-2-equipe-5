import { useLayoutEffect, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useModoDisplay } from "@/shared/contexts/ModoDisplayContext";
import { toast } from "sonner";
import { moverStatusObra } from "../services/kanban";
import type { ListaObras } from "@/types";
import type { StatusObra } from "@/shared/constants/kanbanStatus";

interface MoverCardVariables {
  cardId: number | string;
  novoStatus: StatusObra;
  observacao?: string;
  epochInicio?: number;
}

export function useMoverCard() {
  const queryClient = useQueryClient();
  const { lerEpoch, podeInteragir } = useModoDisplay();
  const montadoRef = useRef(true);
  useLayoutEffect(() => {
    montadoRef.current = true;
    return () => { montadoRef.current = false; };
  }, []);

  const moverMutation = useMutation({
    mutationKey: ["obras"],
    mutationFn: async ({ cardId, novoStatus, observacao }: MoverCardVariables) => {
      return moverStatusObra(Number(cardId), novoStatus, observacao);
    },
    onMutate: async ({ cardId, novoStatus, epochInicio }) => {
      const epochOperacao = epochInicio ?? lerEpoch();
      // Cancela queries ativas para evitar sobrescrever a atualização otimista
      await queryClient.cancelQueries({ queryKey: ["obras"] });

      // Snapshot do estado anterior para permitir rollback perfeito
      const previousObras = queryClient.getQueryData<ListaObras>(["obras"]);

      // Atualiza o cache otimisticamente
      if (previousObras) {
        queryClient.setQueryData<ListaObras>(["obras"], {
          ...previousObras,
          itens: previousObras.itens.map((obra) =>
            String(obra.id) === String(cardId) ? { ...obra, status: novoStatus } : obra
          ),
        });
      }

      return { previousObras, epochOperacao };
    },
    onError: (err, variables, context) => {
      // Rollback caso a mutação falhe no backend
      if (context?.previousObras) {
        queryClient.setQueryData(["obras"], context.previousObras);
      }
      console.error("Falha ao mover card:", err);
      const epochOperacao = context?.epochOperacao ?? variables.epochInicio;
      toast.error("Falha ao mover o card. A posição foi restaurada.", {
        action: epochOperacao !== undefined && montadoRef.current && podeInteragir(epochOperacao) ? {
          label: "Tentar novamente",
          onClick: () => {
            if (!montadoRef.current || !podeInteragir(epochOperacao)) return;
            moverMutation.mutate({ ...variables, epochInicio: epochOperacao });
          },
        } : undefined,
      });
    },
    onSettled: (data) => {
      // Revalida tanto obras quanto programações (sincronização Kanban <-> Gantt RF-10)
      void queryClient.invalidateQueries({ queryKey: ["obras"] });
      void queryClient.invalidateQueries({ queryKey: ["obra"] });
      void queryClient.invalidateQueries({ queryKey: ["programacoes"] });
      if (data?.emailNotificacaoEnviado) {
        toast.info("Obra marcada como concluída! Notificação enviada por e-mail.");
      }
    },
  });

  return moverMutation;
}
