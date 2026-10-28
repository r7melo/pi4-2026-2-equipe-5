import { resolverUsuarioAutenticadoMock } from "./auth";
import axios, { AxiosError } from "axios";
import { api } from "@/shared/api/api";
import { executarLeituraCenario, executarTransacaoCenario, geracaoCenario } from "./estadoCenario";
export function coordenarTransporteMock(): void {
  const executar = axios.getAdapter(api.defaults.adapter);
  api.defaults.adapter = async config => {
    const path = new URL(config.url ?? "", config.baseURL + "/").pathname.replace(/^\/api(?=\/)/, "");
    if (!/^\/(auth|clientes|usuarios|equipes|instaladores|obras|programacoes)(?:\/|$)/.test(path) &&
        !/^\/(cronograma\/compartilhado|mock\/relatorios\/compartilhado|relatorios\/export)(?:\/|$)/.test(path)) return executar(config);
    try {
      const origem = config.geracaoDemonstracao ?? geracaoCenario();
      const tarefa = async () => {
          const caminho = new URL(config.url ?? "", config.baseURL + "/").pathname.replace(/^\/api(?=\/)/, "").replace(/\/+$/, "");
          const metodo = (config.method ?? "get").toLowerCase();
          const publica = (metodo === "post" && ["/auth/login", "/auth/esqueci-senha", "/auth/redefinir-senha"].includes(caminho)) || (metodo === "get" && /^\/cronograma\/compartilhado\//.test(caminho));
          if (!publica && !resolverUsuarioAutenticadoMock(config.headers.Authorization)) {
            return { config, headers: {}, status: 401, statusText: "401", data: { error: { code: "UNAUTHORIZED", message: "Sessão ausente ou expirada." } } };
          }
          return executar({ ...config, validateStatus: () => true });
        };
      const resposta = config.method?.toLowerCase() === "get"
        ? await executarLeituraCenario(origem, tarefa)
        : await executarTransacaoCenario(origem, tarefa, r => r.status < 400 || (/\/auth\/login\/?(?:\?.*)?$/.test(config.url ?? "") && [401, 423].includes(r.status)));
      // Uma resposta de consulta antiga nao entra no cache de uma geracao nova.
      executarLeituraCenario(origem, () => undefined);
      resposta.config = config;
      if (!config.validateStatus || config.validateStatus(resposta.status)) return resposta;
      throw new AxiosError("Requisição recusada.", "ERR_BAD_RESPONSE", config, undefined, resposta);
    } catch (erro) {
      if (axios.isAxiosError(erro)) throw erro;
      const resposta = { config, headers: {}, status: 500, statusText: "500", data: { error: { code: "INTERNAL_ERROR", message: erro instanceof Error ? erro.message : "Não foi possível salvar a demonstração." } } };
      if (!config.validateStatus || config.validateStatus(500)) return resposta;
      throw new AxiosError(resposta.data.error.message, "ERR_BAD_RESPONSE", config, undefined, resposta);
    }
  };
}
