import axios from "axios";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMutacaoSessao as useMutation } from "@/shared/hooks/useMutacaoSessao";
import { deveExibirErroLocal } from "@/shared/lib/sessaoOperacao";

import {
  buscarObra,
  atualizarObra,
  excluirObra,
  listarHistorico,
  listarComentarios,
  adicionarComentario,
  editarComentario,
  excluirComentario,
} from "@/features/obras/services/obras";
import type { EditarObraPayload } from "../types/obras";
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
    mutationFn: ({ obraId, descricao }: { obraId: number; descricao: string }, sessao) =>
      adicionarComentario(obraId, descricao, sessao),
    onSuccess: (_, variables) => {
      void queryClient.invalidateQueries({ queryKey: ["comentarios", variables.obraId] });
      toast.success("Comentário adicionado");
    },
    onError: (erro) => {
      if (!deveExibirErroLocal(erro)) return;
      toast.error("Erro ao adicionar comentário");
    },
  });
}

export function useEditarObra() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: EditarObraPayload }, sessao) =>
      atualizarObra(id, payload, sessao),
    onSuccess: (_, variables) => {
      void queryClient.invalidateQueries({ queryKey: ["obras"] });
      void queryClient.invalidateQueries({ queryKey: ["obra", variables.id] });
      void queryClient.invalidateQueries({ queryKey: ["dre"] });
      void queryClient.invalidateQueries({ queryKey: ["custos"] });
      void queryClient.invalidateQueries({ queryKey: ["relatorio-custo"] });
      toast.success("Dados da obra atualizados com sucesso.");
    },
    onError: (err: unknown) => {
      if (!deveExibirErroLocal(err)) return;
      let mensagem = "Erro ao atualizar dados da obra. Tente novamente.";
      if (axios.isAxiosError<{ error?: { message?: string } }>(err) && err.response?.data?.error?.message) {
        mensagem = String(err.response.data.error.message);
      }
      toast.error(mensagem);
    },
  });
}

export function useEditarComentario() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (
      { id, descricao }: { id: number; obraId: number; descricao: string },
      sessao
    ) => editarComentario(id, descricao, sessao),
    onSuccess: (_, variables) => {
      void queryClient.invalidateQueries({ queryKey: ["comentarios", variables.obraId] });
      toast.success("Comentário atualizado");
    },
    onError: (erro) => {
      if (!deveExibirErroLocal(erro)) return;
      toast.error("Não foi possível atualizar o comentário.");
    },
  });
}

export function useExcluirComentario() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id }: { id: number; obraId: number }, sessao) =>
      excluirComentario(id, sessao),
    onSuccess: (_, variables) => {
      void queryClient.invalidateQueries({ queryKey: ["comentarios", variables.obraId] });
      toast.success("Comentário excluído");
    },
    onError: (erro) => {
      if (!deveExibirErroLocal(erro)) return;
      toast.error("Não foi possível excluir o comentário.");
    },
  });
}

export function useExcluirObraDetalhe() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number, sessao) => excluirObra(id, sessao),
    onSuccess: (_, id) => {
      void queryClient.invalidateQueries({ queryKey: ["obras"] });
      void queryClient.removeQueries({ queryKey: ["obra", id] });
      toast.success("Obra excluída com sucesso.");
    },
    onError: (err: unknown) => {
      if (!deveExibirErroLocal(err)) return;
      let mensagem = "Não foi possível excluir a obra.";
      if (
        axios.isAxiosError<{ error?: { message?: string } }>(err) &&
        err.response?.data?.error?.message
      ) {
        mensagem = String(err.response.data.error.message);
      }
      toast.error(mensagem);
    },
  });
}

