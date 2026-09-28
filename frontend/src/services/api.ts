import axios from "axios";
import { useAuthStore } from "@/stores/useAuthStore";

const API_BASE_URL = (import.meta.env.VITE_API_URL as string | undefined) || "http://localhost:8000/api";

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

// Instância Singleton do Axios
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

// Interceptor de Response: Captura 401 para logout forçado
api.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      useAuthStore.getState().logout();
    }
    return Promise.reject(error instanceof Error ? error : new Error(String(error)));
  }
);

/**
 * Adapter retrocompatível de fetch para serviços existentes
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
