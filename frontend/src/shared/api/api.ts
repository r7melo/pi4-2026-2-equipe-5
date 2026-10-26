import axios from "axios";
import { toast } from "sonner";
import { capturarSessaoOperacional, exigirSessaoOperacional, registrarErro403, sessaoOperacionalVigente } from "@/shared/lib/sessaoOperacao";
import { useAuthStore } from "@/features/auth/stores/useAuthStore";
import { salvarRotaRetorno, TOAST_ID_SESSAO_EXPIRADA } from "@/shared/lib/rotasSessao";

// VITE_API_URL é a raiz do backend (sem /api), compartilhada com o hub do SignalR.
// Vazio (padrão no Docker) = mesma origem da página: o nginx (ou o proxy do Vite em dev) encaminha /api e /hubs.
export const BACKEND_ROOT_URL = (
  (import.meta.env.VITE_API_URL as string | undefined) ||
  (typeof window !== "undefined" ? window.location.origin : "http://localhost:8000")
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
  if (config.sessao403 !== undefined) exigirSessaoOperacional(config.sessao403);
  config.sessao403 ??= capturarSessaoOperacional();
  if (config.semAutenticacao) {
    config.headers.delete("Authorization");
  } else if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Interceptor de Response: Captura 401 para logout forçado com proteção anti-thundering herd
api.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    if (axios.isAxiosError(error) && error.response?.status === 403 && error.config) {
      const config = error.config;
      const metodo = (config.method || "get").toUpperCase();
      const caminho = new URL(config.url || "", config.baseURL + "/").pathname.replace(/^\/api(?=\/)/, "");
      const publico = config.semAutenticacao || caminho === "/auth/login" ||
        (metodo === "GET" && (/^\/cronograma\/compartilhado\/[^/]+\/?$/.test(caminho) ||
          /^\/relatorio-publico(?:\/|$)/.test(caminho) || /^\/mobile(?:\/|$)/.test(caminho)));
      if (!publico && config.responseType !== "blob") {
        const sessao = config.sessao403 ?? -1;
        const mutacao = ["POST", "PUT", "PATCH", "DELETE"].includes(metodo);
        const avisoGlobal = mutacao && !config.suprimirToast403;
        const mensagem = mutacao ? "Você não possui permissão para realizar esta ação." : "Você não possui permissão para visualizar este recurso.";
        error.message = mensagem;
        const corpo: unknown = error.response.data;
        const campos = corpo !== null && typeof corpo === "object" && !Array.isArray(corpo) ? corpo : {};
        const envelope = "error" in campos && campos.error !== null && typeof campos.error === "object" ? campos.error : {};
        error.response.data = { ...campos, message: mensagem, error: { ...envelope, message: mensagem } };
        registrarErro403(error, { sessao, avisoGlobal });
        if (avisoGlobal && sessaoOperacionalVigente(sessao)) {
          toast.error(mensagem, { id: "acesso-proibido-403" });
        }
      }
    }
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      const config = error.config;
      if (config?.semAutenticacao) return Promise.reject(error);
      if (config?.politica401 && !sessaoOperacionalVigente(config.sessao403 ?? -1)) return Promise.reject(error);
      if (config?.politica401 === "manual") return Promise.reject(error);
      const corpo: unknown = error.response.data;
      const envelope = corpo && typeof corpo === "object" && "error" in corpo ? corpo.error : undefined;
      const credencialInvalida = envelope && typeof envelope === "object" && "code" in envelope && envelope.code === "INVALID_CREDENTIALS";
      const url = config?.url || "";
      if (config?.politica401 === "credencial" && config.method?.toLowerCase() === "put" &&
          /^\/auth\/alterar-senha\/?$/.test(new URL(url, config.baseURL + "/").pathname.replace(/^\/api(?=\/)/, "")) && credencialInvalida) return Promise.reject(error);
      const isRotaLogin = url.includes("/auth/login");
      const caminho = new URL(url, error.config?.baseURL + "/").pathname.replace(/^\/api(?=\/)/, "");
      const postCompartilhado = error.config?.method?.toLowerCase() === "post" &&
        /^\/cronograma\/compartilhado\/?$/.test(caminho);
      // Exceção pontual: este POST é privado; um 401 antigo nunca encerra a sessão nova.
      if (postCompartilhado && !sessaoOperacionalVigente(error.config?.sessao403 ?? -1)) return Promise.reject(error);
      const isRotaPublica = !postCompartilhado && (
        url.includes("/cronograma/compartilhado") ||
        url.includes("/relatorio-publico") ||
        url.includes("/mobile"));

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
