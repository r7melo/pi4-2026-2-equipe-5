import { NOMES_PERFIS } from "@/shared/constants/perfis";
import type { NomePerfil } from "@/shared/types/autorizacao";

function normalizarPathname(pathname: string): string {
  return pathname.length > 1 ? pathname.replace(/\/+$/, "") || "/" : pathname;
}

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
  "/produtos",
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
    const pathnameNormalizado = normalizarPathname(parsed.pathname);

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
export function isRotaAutorizadaParaPerfil(pathname: string, perfilNome?: NomePerfil): boolean {
  if (!perfilNome) return false;

  // InstaladorCampo possui acesso exclusivo a /linkparainstaladores (Rotas #37-#39); perfis de escritório não acessam
  if (pathname === "/linkparainstaladores") {
    return perfilNome === "InstaladorCampo";
  }

  // Administrador possui acesso irrestrito às rotas operacionais do sistema
  if (perfilNome === "Administrador") {
    return true;
  }

  if (perfilNome === "Financeiro") {
    // Financeiro acessa também materiais da obra para alterar status (RN-08) e catálogo de produtos (RF-25).
    if (
      pathname === "/kanban" ||
      pathname === "/equipes" ||
      pathname === "/relatorios" ||
      pathname === "/financeiro" ||
      pathname === "/produtos"
    ) {
      return true;
    }
    // Detalhe da obra e sua rota de materiais; outras sub-rotas continuam bloqueadas.
    return REGEX_OBRAS_DINAMICAS.test(pathname);
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
    const pathnameNormalizado = normalizarPathname(parsed.pathname);

    if (isRotaAutorizadaParaPerfil(pathnameNormalizado, perfilNome)) {
      return rotaCandidata;
    }
  } catch {
    // Fallback em caso de erro de parsing
  }

  return fallback;
}


export function perfilCanonico(perfil: unknown): perfil is NomePerfil {
  return NOMES_PERFIS.some(nome => perfil === nome);
}

export function perfilEscritorio(perfil: unknown): boolean {
  return perfil === "Administrador" || perfil === "Engenharia" || perfil === "Financeiro";
}

export function destinoInicialSeguro(perfil: unknown): string {
  return perfilEscritorio(perfil) ? "/kanban" : perfil === "InstaladorCampo" ? "/linkparainstaladores" : "/sem-permissao";
}

const TITULOS_ROTAS_ESTATICAS: Readonly<Record<string, string>> = {
  "/": "Entrar",
  "/login": "Entrar",
  "/esqueci-senha": "Recuperar senha",
  "/redefinir-senha": "Redefinir senha",
  "/kanban": "Obras",
  "/equipes": "Cronograma",
  "/financeiro": "Financeiro",
  "/produtos": "Catálogo de Produtos",
  "/relatorios": "Relatórios",
  "/usuarios": "Usuários",
  "/usuarios/novo": "Cadastrar usuário",
  "/configuracoes": "Configurações",
  "/cadastrarobra": "Cadastrar obra",
  "/acompanharhomologacao": "Homologação",
  "/linkparainstaladores": "Instalações",
  "/sem-permissao": "Acesso indisponível",
};

/**
 * Resolve o título da aba do navegador com correspondência exata ao padrão da rota.
 */
export function resolverTituloRota(pathname: string): string {
  const normalizado = normalizarPathname(pathname).toLowerCase();
  const estatico = TITULOS_ROTAS_ESTATICAS[normalizado];
  if (estatico) return estatico;
  if (/^\/obras\/[^/]+\/materiais$/.test(normalizado)) return "Materiais da obra";
  if (/^\/obras\/[^/]+$/.test(normalizado)) return "Detalhes da obra";
  if (/^\/cronograma\/compartilhado\/[^/]+$/.test(normalizado)) return "Cronograma compartilhado";
  if (/^\/relatorio-publico\/[^/]+$/.test(normalizado)) return "Relatório compartilhado";
  return "Página não encontrada";
}
