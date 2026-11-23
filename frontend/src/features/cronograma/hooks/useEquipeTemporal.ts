import { useRef, useSyncExternalStore } from 'react';
import { useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { useMutacaoSessao } from '@/shared/hooks/useMutacaoSessao';
import { assinarSessaoOperacional, capturarSessaoOperacional, exigirSessaoOperacional, deveExibirErroLocal, sessaoOperacionalVigente } from '@/shared/lib/sessaoOperacao';
import { consultarDisponibilidade, consultarOcupacao, alterarEquipeTemporal } from '../services/equipeTemporal';
import type { AlteracaoEquipeTemporal } from '@/shared/types/equipeTemporal';
import { useOperacoesTemporais } from '../stores/useOperacoesTemporais';
import { opcoesConsultaReconciliacaoProgramacoes } from './estadoReagendamento';

export function useSessaoCronograma() {
  return useSyncExternalStore(assinarSessaoOperacional, capturarSessaoOperacional, capturarSessaoOperacional);
}
export function useDisponibilidade(inicio: string, fim: string, habilitada: boolean) {
  const sessao = useSessaoCronograma();
  return useQuery({
    queryKey: ['disponibilidade', sessao, inicio, fim], enabled: habilitada,
    queryFn: async ({ signal }) => { exigirSessaoOperacional(sessao); return consultarDisponibilidade(inicio, fim, sessao, signal); },
    staleTime: 0, retry: false,
  });
}
export function useOcupacao(inicio: string, fim: string, habilitada: boolean) {
  const sessao = useSessaoCronograma();
  return useQuery({
    queryKey: ['ocupacao', sessao, inicio, fim], enabled: habilitada,
    queryFn: async ({ signal }) => { exigirSessaoOperacional(sessao); return consultarOcupacao(inicio, fim, sessao, signal); },
    staleTime: 0, retry: false,
  });
}
export function mensagemEquipe(erro: unknown): string {
  const dados = erro as { response?: { data?: { error?: { message?: string } } }; message?: string };
  return dados.response?.data?.error?.message || dados.message || 'Não foi possível confirmar a alteração. Consulte os dados antes de tentar novamente.';
}
/** Libera escrita só depois de um GET novo, validado e pertencente à mesma sessão. */
export async function confirmarConsultaTemporal(cliente: QueryClient, sessao: number) {
  exigirSessaoOperacional(sessao);
  await cliente.cancelQueries({ queryKey: ['programacoes', sessao], exact: true });
  await cliente.fetchQuery(opcoesConsultaReconciliacaoProgramacoes(sessao));
  exigirSessaoOperacional(sessao);
  useOperacoesTemporais.getState().confirmarConsulta(sessao);
  void Promise.all(['ocupacao', 'disponibilidade', 'obras'].map(chave => cliente.invalidateQueries({ queryKey: [chave] })));
}
export function useAlterarEquipeTemporal(id: number, podeEditar: () => boolean) {
  const cliente = useQueryClient();
  const sessaoRender = useSessaoCronograma();
  const trava = useRef(false);
  const incerta = useOperacoesTemporais(s => s.sessao === sessaoRender && s.fases[String(id)] === 'incerta');
  const mutacao = useMutacaoSessao({
    mutationKey: ['programacoes', id], retry: false,
    mutationFn: (alteracao: AlteracaoEquipeTemporal, sessao) => {
      exigirSessaoOperacional(sessao);
      if (!podeEditar()) throw new Error('Edição indisponível neste contexto.');
      return alterarEquipeTemporal(id, alteracao, sessao);
    },
  });
  async function reconciliar(sessao: number) {
    await confirmarConsultaTemporal(cliente, sessao);
  }
  async function salvar(alteracao: AlteracaoEquipeTemporal) {
    if (trava.current || incerta || cliente.isMutating({ mutationKey: ["programacoes"] }) > 0 || !podeEditar()) return false;
    trava.current = true;
    const sessao = capturarSessaoOperacional();
    const operacoes = useOperacoesTemporais.getState();
    if (!operacoes.reservar(sessao, String(id))) { trava.current = false; return false; }
    let confirmouEscrita = false;
    try {
      await mutacao.mutateAsync(alteracao);
      confirmouEscrita = true;
      exigirSessaoOperacional(sessao);
      await reconciliar(sessao);
      return true;
    } catch (erro) {
      if (!sessaoOperacionalVigente(sessao)) return false;
      const status = (erro as { response?: { status?: number } }).response?.status;
      operacoes.marcar(sessao, String(id), confirmouEscrita || !status || status >= 500 ? 'incerta' : 'livre');
      if (!deveExibirErroLocal(erro)) return false;
      void Promise.all(['ocupacao', 'disponibilidade'].map(chave => cliente.invalidateQueries({ queryKey: [chave] })));
      throw erro;
    } finally { trava.current = false; }
  }
  return { salvar, incerta, isPending: mutacao.isPending, reconciliar: () => reconciliar(capturarSessaoOperacional()) };
}
