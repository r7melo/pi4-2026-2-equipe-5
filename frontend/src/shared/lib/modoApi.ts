/** O transporte da pagina nao muda sem recarregamento. */
export function lerModoApi(): "real" | "mock" {
  try {
    const salvo = localStorage.getItem("zl_api_mode");
    if (salvo === "real" || salvo === "mock") return salvo;
  } catch { /* A inicializacao apresenta a indisponibilidade no modo demonstracao. */ }
  return import.meta.env.VITE_USE_MOCK === "true" ? "mock" : "real";
}
export const MOCK_ATIVO = import.meta.env.DEV ? lerModoApi() === "mock" : import.meta.env.VITE_USE_MOCK === "true";
export const CHAVE_AUTH_ATUAL = MOCK_ATIVO ? "mock_auth_demonstracao_v1" : "auth-storage";
