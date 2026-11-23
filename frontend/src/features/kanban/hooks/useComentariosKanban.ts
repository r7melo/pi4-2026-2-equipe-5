import { useSyncExternalStore } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMutacaoSessao } from "@/shared/hooks/useMutacaoSessao";
import { assinarSessaoOperacional, capturarSessaoOperacional, exigirSessaoOperacional, sessaoOperacionalVigente } from "@/shared/lib/sessaoOperacao";
import { useAuthStore } from "@/shared/stores/useAuthStore";
import { alterarComentario, erroComentario, listarComentariosKanban } from "../services/comentarios";
import type { AlteracaoComentario, ComentarioResposta, ContextoComentario } from "../types/comentarios";

export function useComentariosKanban(obraId: number) {
  const sessao = useSyncExternalStore(assinarSessaoOperacional, capturarSessaoOperacional);
  const cliente = useQueryClient();
  const consulta = useQuery({
    queryKey: ["comentarios", obraId, sessao], enabled: obraId > 0, retry: false, staleTime: 30000,
    queryFn: async ({ signal }) => {
      try {
        const resposta = await listarComentariosKanban(obraId, sessao, signal);
        exigirSessaoOperacional(sessao);
        return resposta;
      } catch (erro) { throw erroComentario(erro); }
    },
  });
  const mutacao = useMutacaoSessao<ComentarioResposta | undefined, AlteracaoComentario, ContextoComentario>({
    retry: false,
    onMutate: (_dados, _contexto, origem) => ({ origem }),
    mutationFn: async (alteracao: AlteracaoComentario, origem) => {
      exigirSessaoOperacional(origem);
      const perfil = useAuthStore.getState().usuario?.perfil.nomePerfil;
      if (alteracao.acao !== "criar" ? perfil !== "Administrador" :
        !(["Administrador", "Engenharia"].includes(perfil ?? "") && alteracao.tipo === "Cartao") && !(perfil === "Financeiro" && alteracao.tipo === "Timeline")) {
        throw new Error("Você não possui permissão para realizar esta ação.");
      }
      try {
        const resposta = await alterarComentario(obraId, alteracao, origem);
        exigirSessaoOperacional(origem);
        return resposta;
      } catch (erro) { throw erroComentario(erro); }
    },
    onSuccess: async (_resposta, _dados, contexto) => {
      if (!contexto || !sessaoOperacionalVigente(contexto.origem)) return;
      await Promise.all([
        cliente.invalidateQueries({ queryKey: ["comentarios", obraId] }),
        cliente.invalidateQueries({ queryKey: ["historico", obraId] }),
      ]);
    },
  });
  return { consulta, mutacao };
}
