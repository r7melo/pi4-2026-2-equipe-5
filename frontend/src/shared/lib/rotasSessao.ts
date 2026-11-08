import type { NomePerfil } from "@/types";

export const CHAVE_ROTA_RETORNO = "auth_return_url";
export const TOAST_ID_SESSAO_EXPIRADA = "sessao-expirada";
export const TOAST_ID_SESSAO_AVISO = "sessao-expirando-aviso";

const PARAMETROS_SENSIVEIS = ["token", "senha", "password", "code", "secret", "jwt"];

const ROTAS_ESTATICAS_PERMITIDAS = new Set([
  "/kanban",
  "/equipes",
  "/usuarios",
  "/usuarios/novo",
  "/cadastrarobra",
  "/acompanharhomologacao",
  "/relatorios",
  "/financeiro",
  "/linkparainstaladores",
]);

const REGEX_OBRAS_DINAMICAS = /^\/obras\/\d+(\/materiais)?$/;

/**
 * Valida se o pathname informado pertence à allowlist de rotas da aplicação.
 */
function isPathnamePermitido(pathname: string): boolean {
  if (ROTAS_ESTATICAS_PERMITIDAS.has(pathname)) {
    return true;
  }
  return REGEX_OBRAS_DINAMICAS.test(pathname);
}

/**
 * Sanitiza rigorosamente uma rota informada:
 * 1. Remove fragmentos de hash (#).
 * 2. Bloqueia contrabarras e esquemas externos (anti-Open Redirect).
 * 3. Decompõe pathname e searchParams.
 * 4. Normaliza trailing slashes (ex: /kanban/ -> /kanban).
 * 5. Valida pathname contra allowlist.
 * 6. Expuga parâmetros sensíveis case-insensitivamente.
 */
export function sanitizarRota(rotaBruta: string | null | undefined): string | null {
  if (!rotaBruta || typeof rotaBruta !== "string") {
    return null;
  }

  const rotaLimpa = rotaBruta.trim();
  if (rotaLimpa.length === 0 || rotaLimpa.length > 2048) {
    return null;
  }

  // Remove fragmento de hash
  const semHash = rotaLimpa.split("#")[0];

  // Deve iniciar com / e não pode conter contrabarras ou esquemas externos
  if (!semHash.startsWith("/") || semHash.startsWith("//") || semHash.includes("\\")) {
    return null;
  }

  try {
    const parsed = new URL(semHash, "http://localhost");
    
    // Normaliza trailing slash (ex: /kanban/ -> /kanban, preservando raiz /)
    const pathnameNormalizado =
      parsed.pathname.length > 1 && parsed.pathname.endsWith("/")
        ? parsed.pathname.slice(0, -1)
        : parsed.pathname;

    // Desconsidera rotas públicas de login ou compartilhamento
    if (
      pathnameNormalizado === "/" ||
      pathnameNormalizado === "/login" ||
      pathnameNormalizado.startsWith("/cronograma/compartilhado") ||
      pathnameNormalizado.startsWith("/relatorio-publico")
    ) {
      return null;
    }

    if (!isPathnamePermitido(pathnameNormalizado)) {
      return null;
    }

    // Sanitiza query parameters
    const paramsSanitizados = new URLSearchParams();
    parsed.searchParams.forEach((valor, chave) => {
      if (!PARAMETROS_SENSIVEIS.includes(chave.toLowerCase())) {
        paramsSanitizados.set(chave, valor);
      }
    });

    const queryString = paramsSanitizados.toString();
    return queryString ? `${pathnameNormalizado}?${queryString}` : pathnameNormalizado;
  } catch {
    return null;
  }
}

/**
 * Salva a rota de retorno em sessionStorage com guarda de idempotência anti-thundering herd.
 */
export function salvarRotaRetorno(rota: string): void {
  if (typeof window === "undefined") return;

  try {
    // Guarda de idempotência: se já houver rota salva e válida, ignora chamadas concorrentes
    const rotaAtual = sessionStorage.getItem(CHAVE_ROTA_RETORNO);
    if (sanitizarRota(rotaAtual)) {
      return;
    }

    const rotaSanitizada = sanitizarRota(rota);
    if (rotaSanitizada) {
      sessionStorage.setItem(CHAVE_ROTA_RETORNO, rotaSanitizada);
    }
  } catch {
    // Silencia possíveis exceções de quota ou restrições de sessionStorage
  }
}

/**
 * Valida se a rota sanitizada é compatível com o perfil RBAC autenticado (espelha App.tsx).
 */
function isRotaAutorizadaParaPerfil(pathname: string, perfilNome?: NomePerfil): boolean {
  if (!perfilNome) return false;

  // Administrador possui acesso irrestrito a todas as rotas (incluindo /linkparainstaladores)
  if (perfilNome === "Administrador") {
    return true;
  }

  // InstaladorCampo possui acesso exclusivo a /linkparainstaladores
  if (perfilNome === "InstaladorCampo") {
    return pathname === "/linkparainstaladores";
  }

  // Perfis desktop não acessam /linkparainstaladores
  if (pathname === "/linkparainstaladores") {
    return false;
  }

  if (perfilNome === "Financeiro") {
    // Financeiro acessa: /kanban, /equipes, /obras/:id, /relatorios, /financeiro
    if (pathname === "/kanban" || pathname === "/equipes" || pathname === "/relatorios" || pathname === "/financeiro") {
      return true;
    }
    // Permite /obras/:id mas bloqueia sub-rotas como /obras/:id/materiais
    return /^\/obras\/\d+$/.test(pathname);
  }

  if (perfilNome === "Engenharia") {
    // Engenharia acessa: /kanban, /equipes, /cadastrarobra, /acompanharhomologacao, /obras/:id, /obras/:id/materiais
    if (
      pathname === "/kanban" ||
      pathname === "/equipes" ||
      pathname === "/cadastrarobra" ||
      pathname === "/acompanharhomologacao"
    ) {
      return true;
    }
    return REGEX_OBRAS_DINAMICAS.test(pathname);
  }

  return false;
}

/**
 * Retorna o destino seguro pós-login avaliando locationState e sessionStorage, limpando a chave incondicionalmente.
 */
export function obterELimparRotaRetorno(perfilNome?: NomePerfil, rotaOrigem?: string | null): string {
  const fallback = destinoInicialSeguro(perfilNome);

  let rotaCandidata: string | null = null;

  // 1. Prioriza o estado de navegação repassado via React Router
  if (rotaOrigem && typeof rotaOrigem === "string") {
    rotaCandidata = sanitizarRota(rotaOrigem);
  }

  // 2. Se não houver rota via state, consome do sessionStorage; sempre limpa a chave incondicionalmente
  if (typeof window !== "undefined") {
    try {
      if (!rotaCandidata) {
        const salva = sessionStorage.getItem(CHAVE_ROTA_RETORNO);
        rotaCandidata = sanitizarRota(salva);
      }
      sessionStorage.removeItem(CHAVE_ROTA_RETORNO);
    } catch {
      // Ignora erro de storage
    }
  }

  if (!rotaCandidata) {
    return fallback;
  }

  try {
    const parsed = new URL(rotaCandidata, "http://localhost");
    const pathnameNormalizado =
      parsed.pathname.length > 1 && parsed.pathname.endsWith("/")
        ? parsed.pathname.slice(0, -1)
        : parsed.pathname;

    if (isRotaAutorizadaParaPerfil(pathnameNormalizado, perfilNome)) {
      return rotaCandidata;
    }
  } catch {
    // Fallback em caso de erro de parsing
  }

  return fallback;
}


export function perfilCanonico(perfil: unknown): perfil is NomePerfil {
  return perfil === "Administrador" || perfil === "Engenharia" || perfil === "Financeiro" || perfil === "InstaladorCampo";
}

export function perfilEscritorio(perfil: unknown): boolean {
  return perfil === "Administrador" || perfil === "Engenharia" || perfil === "Financeiro";
}

export function destinoInicialSeguro(perfil: unknown): string {
  return perfilEscritorio(perfil) ? "/kanban" : perfil === "InstaladorCampo" ? "/linkparainstaladores" : "/sem-permissao";
}
