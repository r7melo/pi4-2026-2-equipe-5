import { ApiErro } from "@/shared/api/api";
import { useQuery } from "@tanstack/react-query";
import { exigirSessaoOperacional } from "@/shared/lib/sessaoOperacao";
import { useMutacaoSessao } from "@/shared/hooks/useMutacaoSessao";
import { listarUsuarios, editarUsuario, atualizarStatus, listarParticipacoesFuturasInstalador } from "../services/gestaoUsuarios";
import type { EditarUsuario, StatusUsuario, FiltrosUsuarios } from "../types/gestaoUsuarios";
import { useSessaoUsuarios } from "./useSessaoUsuarios";
export function useListaUsuarios(filtros: FiltrosUsuarios) {
  const sessao = useSessaoUsuarios();
  return useQuery({ queryKey: ["usuarios", sessao, filtros], retry: false, networkMode: "always", gcTime: 0,
    queryFn: async ({ signal }) => { exigirSessaoOperacional(sessao); const r = await listarUsuarios(filtros, sessao, signal); exigirSessaoOperacional(sessao); return r; } });
}
export function useEditarUsuario(id: number) {
  return useMutacaoSessao({ retry: false, networkMode: "always", gcTime: 0, mutationFn: async (dados: EditarUsuario, sessao) => {
    const r = await editarUsuario(id, dados, sessao); exigirSessaoOperacional(sessao); return r;
  } });
}
export function useStatusUsuario(id: number) {
  return useMutacaoSessao({ retry: false, networkMode: "always", gcTime: 0, mutationFn: async (dados: StatusUsuario, sessao) => {
    const r = await atualizarStatus(id, dados, sessao); exigirSessaoOperacional(sessao); return r;
  } });
}

export function useConsultaUsuario(id: number) {
  const sessao = useSessaoUsuarios();
  return useQuery({ queryKey: ["usuarioGestao", sessao, id], enabled: false, retry: false, gcTime: 0, networkMode: "always",
    queryFn: async ({ signal }) => {
      for (let page = 1; ; page++) {
        exigirSessaoOperacional(sessao);
        // oxlint-disable-next-line no-await-in-loop -- A página seguinte depende da resposta anterior.
        const r = await listarUsuarios({ page, pageSize: 100, busca: "", ativo: "todos" }, sessao, signal);
        exigirSessaoOperacional(sessao);
        const conta = r.itens.find(u => u.id === id);
        if (conta) return conta;
        if (!r.itens.length || page * 100 >= r.total) throw new ApiErro(404, "USUARIO_NOT_FOUND", "Usuário não encontrado. Atualize a lista.");
      }
    } });
}

export function useParticipacoesFuturasInstalador(usuarioId: number, habilitada: boolean) {
  const sessao = useSessaoUsuarios();
  return useQuery({
    queryKey: ["usuarioParticipacoesFuturas", sessao, usuarioId],
    enabled: habilitada && usuarioId > 0,
    retry: false,
    staleTime: 0,
    gcTime: 0,
    networkMode: "always",
    queryFn: async ({ signal }) => {
      exigirSessaoOperacional(sessao);
      const r = await listarParticipacoesFuturasInstalador(usuarioId, sessao, signal);
      exigirSessaoOperacional(sessao);
      return r;
    },
  });
}
