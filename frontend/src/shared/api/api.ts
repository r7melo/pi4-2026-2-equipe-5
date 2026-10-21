import axios from "axios";
import { toast } from "sonner";
import { useAuthStore } from "@/features/auth/stores/useAuthStore";
import { salvarRotaRetorno, TOAST_ID_SESSAO_EXPIRADA } from "@/shared/lib/rotasSessao";

// VITE_API_URL é a raiz do backend (sem /api), compartilhada com o hub do SignalR
export const BACKEND_ROOT_URL = (
  typeof window !== "undefined" && window.location.protocol === "https:"
    ? window.location.origin
    : (import.meta.env.VITE_API_URL as string | undefined) ||
      (typeof window !== "undefined"
        ? `${window.location.protocol}//${window.location.hostname}:8000`
        : "http://localhost:8000")
)
  .replace(/\/api\/?$/, "")
  .replace(/\/+$/, "");

const API_BASE_URL = `${BACKEND_ROOT_URL}/api`;

/**
 * Erro estruturado da API, seguindo o padrão do contrato:
 * { "error": { "code": "string", "message": "string" } }
 */
export class ApiErro extends Error {
  codigo: string;
  status: number;

  constructor(status: number, codigo: string, mensagem: string) {
    super(mensagem);
    this.name = "ApiErro";
    this.status = status;
    this.codigo = codigo;
  }
}

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { "Content-Type": "application/json" },
});

// Interceptor de Request: Injeta JWT automaticamente em todas as chamadas
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Interceptor de Response: Captura 401 para logout forçado com proteção anti-thundering herd
api.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      const url = error.config?.url || "";
      const isRotaLogin = url.includes("/auth/login");
      const isRotaPublica =
        url.includes("/cronograma/compartilhado") ||
        url.includes("/relatorio-publico") ||
        url.includes("/mobile");

      if (!isRotaLogin && !isRotaPublica) {
        // Guarda anti-thundering herd: só processa o salvamento e emissão se o operador ainda constar logado
        if (useAuthStore.getState().token !== null) {
          if (typeof window !== "undefined") {
            salvarRotaRetorno(window.location.pathname + window.location.search);
          }
          useAuthStore.getState().logout();
          toast.error("Sua sessão expirou. Faça login novamente para continuar.", {
            id: TOAST_ID_SESSAO_EXPIRADA,
          });
        }
      }
    }
    return Promise.reject(error instanceof Error ? error : new Error(String(error)));
  }
);

/**
 * @deprecated Utilize diretamente a instância Axios singleton `api` (`api.get`, `api.post`, etc.).
 * Mantido exclusivamente para resguardo de retrocompatibilidade de baixo nível.
 */
export async function apiFetch<T>(
  caminho: string,
  opcoes?: RequestInit
): Promise<T> {
  try {
    const metodo = (opcoes?.method || "GET").toLowerCase();
    const corpo = opcoes?.body ? (JSON.parse(opcoes.body as string) as unknown) : undefined;
    
    const resposta = await api.request<T>({
      url: caminho,
      method: metodo,
      data: corpo,
      headers: opcoes?.headers as Record<string, string>,
    });

    return resposta.data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      const corpo = error.response.data as { error?: { code?: string; message?: string } };
      throw new ApiErro(
        error.response.status,
        corpo?.error?.code || "ERRO_DESCONHECIDO",
        corpo?.error?.message || `Erro ${error.response.status}`
      );
    }
    throw error;
  }
}
