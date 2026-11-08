import type { MutationFunctionContext, UseMutationOptions } from "@tanstack/react-query";

export interface IdentidadeOperacional {
  token: string | null;
  usuario: { id: number; perfil?: { nomePerfil?: string } } | null;
  expiresAt: string | null;
}

export interface ContextoErro403 {
  sessao: number;
  avisoGlobal: boolean;
}

export interface VariaveisSessao<T> { dados: T; sessao: number }

export type OpcoesMutacaoSessao<D, V, C> = Omit<UseMutationOptions<D, Error, V, C>, "mutationFn" | "onMutate"> & {
  mutationFn: (dados: V, sessao: number) => Promise<D>;
  onMutate?: (dados: V, contexto: MutationFunctionContext, sessao: number) => Promise<C> | C;
};

declare module "axios" {
  // D deve acompanhar o parâmetro genérico original do Axios.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  interface AxiosRequestConfig<D = any> {
    sessao403?: number;
    suprimirToast403?: boolean;
    semAutenticacao?: boolean;
    politica401?: "credencial" | "manual" | "sessao";
  }
}
