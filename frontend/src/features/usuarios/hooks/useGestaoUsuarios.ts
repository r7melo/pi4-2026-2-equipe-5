import { toast } from "sonner";
import { ApiErro } from "@/shared/api/api";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useSyncExternalStore } from "react";
import { assinarSessaoOperacional, capturarSessaoOperacional, exigirSessaoOperacional, erroDaSessaoAnterior, sessaoOperacionalVigente, statusHttp } from "@/shared/lib/sessaoOperacao";
import { useMutacaoSessao } from "@/shared/hooks/useMutacaoSessao";
import { listarUsuarios, editarUsuario, atualizarStatus } from "../services/gestaoUsuarios";
import type { EditarUsuario, StatusUsuario, FiltrosUsuarios } from "../types/gestaoUsuarios";
export function useSessaoUsuarios() { return useSyncExternalStore(assinarSessaoOperacional, capturarSessaoOperacional); }
export function useListaUsuarios(filtros: FiltrosUsuarios) {
  const sessao = useSessaoUsuarios();
  return useQuery({ queryKey: ["usuarios", sessao, filtros], retry: false, networkMode: "always", gcTime: 0,
    queryFn: async ({ signal }) => { exigirSessaoOperacional(sessao); const r = await listarUsuarios(filtros, sessao, signal); exigirSessaoOperacional(sessao); return r; } });
}
export function useEditarUsuario(id: number, email: string) {
  return useMutacaoSessao({ retry: false, networkMode: "always", gcTime: 0, mutationFn: async (dados: EditarUsuario, sessao) => {
    const r = await editarUsuario(id, dados, sessao, email); exigirSessaoOperacional(sessao); return r;
  } });
}
export function useStatusUsuario(id: number) {
  return useMutacaoSessao({ retry: false, networkMode: "always", gcTime: 0, mutationFn: async (dados: StatusUsuario, sessao) => {
    const r = await atualizarStatus(id, dados, sessao); exigirSessaoOperacional(sessao); return r;
  } });
}

export function useConsultaUsuario(id: number, email: string) {
  const sessao = useSessaoUsuarios();
  return useQuery({ queryKey: ["usuarioGestao", sessao, id, email], enabled: false, retry: false, gcTime: 0, networkMode: "always",
    queryFn: async ({ signal }) => {
      for (let page = 1; ; page++) {
        exigirSessaoOperacional(sessao);
        // oxlint-disable-next-line no-await-in-loop -- A página seguinte depende da resposta anterior.
        const r = await listarUsuarios({ page, pageSize: 100, busca: email, ativo: "todos" }, sessao, signal);
        exigirSessaoOperacional(sessao);
        const conta = r.itens.find(u => u.id === id && u.email === email);
        if (conta) return conta;
        if (!r.itens.length || page * 100 >= r.total) throw new ApiErro(404, "USUARIO_NOT_FOUND", "Usuário não encontrado. Atualize a lista.");
      }
    } });
}

/** Descarta a interface da operação somente para uma negativa da sessão atual. */
export function usePerdaPermissao(erro: unknown, aoNegado: () => void) {
  const sessao = useSessaoUsuarios();
  useEffect(() => {
    if (statusHttp(erro) !== 403 || erroDaSessaoAnterior(erro)) return;
    const frame = requestAnimationFrame(() => { if (sessaoOperacionalVigente(sessao) && !erroDaSessaoAnterior(erro)) { toast.error("Você não possui permissão para visualizar este recurso.", { id: "acesso-proibido-403" }); aoNegado(); } });
    return () => cancelAnimationFrame(frame);
  }, [erro, sessao, aoNegado]);
}
