import axios, { AxiosError } from "axios";
import { api } from "@/shared/api/api";
import { acessoRevogadoSenhaMock } from "../dados/segurancaSenha";

/** Conserva os handlers e o passthrough; rejeita acessos revogados antes de seus efeitos. */
export function protegerRevogacaoSenhaMock(): void {
  const executar = axios.getAdapter(api.defaults.adapter);
  api.defaults.adapter = config => {
    const path = new URL(config.url || "", config.baseURL + "/").pathname.replace(/^\/api(?=\/)/, "").replace(/\/+$/, "");
    const method = (config.method || "get").toLowerCase();
    const publico = (method === "post" && ["/auth/login", "/auth/esqueci-senha", "/auth/redefinir-senha"].includes(path)) ||
      (method === "get" && (/^\/cronograma\/compartilhado\//.test(path) || /^\/(relatorio-publico|mobile)(\/|$)/.test(path)));
    let status = 0;
    if (!publico) {
      try { if (acessoRevogadoSenhaMock(config.headers.Authorization)) status = 401; }
      catch { status = 500; }
    }
    if (status) {
      const data = { error: { code: status === 401 ? "UNAUTHORIZED" : "INTERNAL_ERROR", message: status === 401 ? "Sessão revogada após alteração de senha." : "Não foi possível consultar a sessão." } };
      const resposta = { data, status, statusText: String(status), headers: {}, config };
      if (!config.validateStatus || config.validateStatus(status)) return Promise.resolve(resposta);
      return Promise.reject(new AxiosError(data.error.message, "ERR_BAD_REQUEST", config, undefined, resposta));
    }
    return executar(config);
  };
}
