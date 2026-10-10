import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { buscarObra, listarHistorico, listarComentarios, adicionarComentario } from "@/services/obras";
import { toast } from "sonner";

export function useObraDetalhe(id: number) {
  return useQuery({
    queryKey: ["obra", id],
    queryFn: () => buscarObra(id),
    staleTime: 1000 * 60, // 1 minuto
    enabled: !!id,
  });
}

export function useHistoricoObra(id: number) {
  return useQuery({
    queryKey: ["historico", id],
    queryFn: () => listarHistorico(id),
    staleTime: 1000 * 30,
    enabled: !!id,
  });
}

export function useComentariosObra(id: number) {
  return useQuery({
    queryKey: ["comentarios", id],
    queryFn: () => listarComentarios(id),
    staleTime: 1000 * 30,
    enabled: !!id,
  });
}

export function useAdicionarComentario() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ obraId, descricao }: { obraId: number; descricao: string }) =>
      adicionarComentario(obraId, descricao),
    onSuccess: (_, variables) => {
      void queryClient.invalidateQueries({ queryKey: ["comentarios", variables.obraId] });
      toast.success("Comentário adicionado");
    },
    onError: () => {
      toast.error("Erro ao adicionar comentário");
    },
  });
}
