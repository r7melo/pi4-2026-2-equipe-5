import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { moverStatusObra } from "@/services/obras";
import type { ListaObras } from "@/types";
import type { StatusObra } from "@/constants/kanbanStatus";

interface MoverCardVariables {
  cardId: number | string;
  novoStatus: StatusObra;
  observacao?: string;
}

export function useMoverCard() {
  const queryClient = useQueryClient();

  const moverMutation = useMutation({
    mutationFn: async ({ cardId, novoStatus, observacao }: MoverCardVariables) => {
      return moverStatusObra(Number(cardId), novoStatus, observacao);
    },
    onMutate: async ({ cardId, novoStatus }) => {
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

      return { previousObras };
    },
    onError: (err, variables, context) => {
      // Rollback caso a mutação falhe no backend
      if (context?.previousObras) {
        queryClient.setQueryData(["obras"], context.previousObras);
      }
      console.error("Falha ao mover card:", err);
      toast.error("Falha ao mover o card. A posição foi restaurada.", {
        action: {
          label: "Tentar novamente",
          onClick: () => {
            moverMutation.mutate(variables);
          },
        },
      });
    },
    onSettled: (data) => {
      // Revalida tanto obras quanto programações (sincronização Kanban <-> Gantt RF-10)
      void queryClient.invalidateQueries({ queryKey: ["obras"] });
      void queryClient.invalidateQueries({ queryKey: ["programacoes"] });
      if (data?.emailNotificacaoEnviado) {
        toast.info("Obra marcada como concluída! Notificação enviada por e-mail.");
      }
    },
  });

  return moverMutation;
}
