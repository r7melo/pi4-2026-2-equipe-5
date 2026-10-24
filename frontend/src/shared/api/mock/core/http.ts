export /**
 * Função utilitária para extrair com segurança o corpo de requisições,
 * suportando tanto string JSON quanto objetos já serializados pelo Axios.
 */
function extrairDados<T = Record<string, unknown>>(data: unknown): T {
  if (!data) return {} as T;
  if (typeof data === "object") return data as T;
  if (typeof data === "string") {
    try {
      return JSON.parse(data) as T;
    } catch {
      return {} as T;
    }
  }
  return {} as T;
}

export /**
 * Extrai parâmetros de consulta (query params) mesclando
 * config.params com eventuais query strings embutidas na URL.
 */
function extrairQueryParams(config: { url?: string; params?: Record<string, unknown> }): Record<string, string> {
  const params: Record<string, string> = {};

  if (config.params) {
    for (const [k, v] of Object.entries(config.params)) {
      if (v !== undefined && v !== null) params[k] = String(v);
    }
  }

  if (config.url && config.url.includes("?")) {
    const search = config.url.split("?")[1];
    const searchParams = new URLSearchParams(search);
    searchParams.forEach((val, key) => {
      if (!params[key]) params[key] = val;
    });
  }

  return params;
}
