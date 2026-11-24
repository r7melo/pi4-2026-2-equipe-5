import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMutacaoSessao } from "@/shared/hooks/useMutacaoSessao";
import { capturarSessaoOperacional } from "@/shared/lib/sessaoOperacao";
import type {
  CriarClientePayload,
  EditarClientePayload,
  FiltroClientesParams,
} from "@/shared/types/clientes";
import {
  criarCliente,
  editarCliente,
  excluirCliente,
  listarClientesPaginado,
} from "../services/clientes";

function useInvalidarClientes() {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: ["clientes"] });
  };
}

export function useClientes(filtros: FiltroClientesParams = {}) {
  const sessao = capturarSessaoOperacional();
  const chaveFiltros = {
    nome: filtros.nome?.trim() ?? "",
    page: filtros.page ?? 1,
    pageSize: filtros.pageSize ?? 50,
  };

  return useQuery({
    queryKey: ["clientes", chaveFiltros, sessao],
    queryFn: ({ signal }) => listarClientesPaginado(chaveFiltros, sessao, signal),
    enabled: sessao > 0,
  });
}

export function useCriarCliente() {
  const invalidar = useInvalidarClientes();
  return useMutacaoSessao({
    mutationKey: ["clientes", "criar"],
    mutationFn: (payload: CriarClientePayload, sessao) => criarCliente(payload, sessao),
    onSuccess: invalidar,
  });
}

export function useEditarCliente() {
  const invalidar = useInvalidarClientes();
  return useMutacaoSessao({
    mutationKey: ["clientes", "editar"],
    mutationFn: (
      { id, payload }: { id: number; payload: EditarClientePayload },
      sessao
    ) => editarCliente(id, payload, sessao),
    onSuccess: invalidar,
  });
}

export function useExcluirCliente() {
  const invalidar = useInvalidarClientes();
  return useMutacaoSessao({
    mutationKey: ["clientes", "excluir"],
    mutationFn: (id: number, sessao) => excluirCliente(id, sessao),
    onSuccess: invalidar,
  });
}
