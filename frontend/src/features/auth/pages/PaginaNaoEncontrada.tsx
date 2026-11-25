import { cn } from "@/shared/lib/utils";
import { ROTULOS_PERFIS } from "@/shared/constants/perfis";
import { useLocation, useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { useAuthStore } from "@/shared/stores/useAuthStore";
import { destinoInicialSeguro, perfilCanonico, perfilEscritorio } from "@/shared/lib/rotasSessao";
import Sidebar, { SidebarTrigger } from "@/shared/layouts/Sidebar";
import { SidebarProvider } from "@/shared/contexts/SidebarProvider";
import { Button } from "@/shared/components/ui/Button";

function caminhoNaoEncontrado(pathname: string): string | null {
  if (
    !pathname.startsWith("/") ||
    [...pathname].some((c) => c.charCodeAt(0) < 33) ||
    /[\\?#]/.test(pathname) ||
    pathname.includes("//") ||
    /%[0-9a-f]{2}/i.test(pathname)
  ) {
    return null;
  }
  const caminho = pathname.replace(/\/+$/, "") || "/";
  return ["/", "/login", "/sem-permissao"].includes(caminho) ? null : caminho.slice(0, 80);
}

const FOCO =
  "focus:ring-primary focus-visible:ring-2 focus-visible:ring-primary focus:ring-offset-2 focus-visible:ring-offset-2 ring-offset-surface";

export default function PaginaNaoEncontrada() {
  const perfil = useAuthStore((s) => s.usuario?.perfil?.nomePerfil);
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const rotulo = !perfilCanonico(perfil) ? "Não identificado" : ROTULOS_PERFIS[perfil];
  const caminho = caminhoNaoEncontrado(location.pathname);

  const conteudo = (
    <main
      id="conteudo-principal"
      tabIndex={-1}
      className="flex-1 min-w-0 overflow-y-auto flex items-center justify-center p-4 sm:p-6 bg-background-app"
    >
      <section
        className="my-auto w-full max-w-lg rounded-xl border border-border-subtle bg-surface p-6 sm:p-8 space-y-5 text-left"
        aria-labelledby="nao-encontrada-titulo"
      >
        <div className="flex items-center justify-between">
          <span className="w-10 h-10 rounded-lg bg-surface-subtle text-foreground-muted inline-flex items-center justify-center">
            <Search className="w-5 h-5" aria-hidden="true" />
          </span>
          <span className="text-xs font-semibold tabular-nums text-muted-foreground bg-surface-subtle px-2.5 py-1 rounded-md">
            404
          </span>
        </div>

        <div className="space-y-2">
          <h1 id="nao-encontrada-titulo" tabIndex={-1} className="text-2xl font-semibold text-foreground">
            Página não encontrada
          </h1>
          <p className="text-sm text-foreground-muted leading-relaxed">
            O endereço acessado não existe ou foi movido. Retorne à tela principal do seu perfil (
            <strong className="font-semibold text-foreground">{rotulo}</strong>).
          </p>
        </div>

        {caminho && (
          <p className="border-y border-border-subtle py-2.5 text-xs flex items-center justify-between gap-2">
            <span className="text-muted-foreground">Endereço acessado</span>
            <code className="font-mono text-foreground break-all">{caminho}</code>
          </p>
        )}

        <div className="flex flex-wrap gap-3 pt-1">
          {perfilCanonico(perfil) ? (
            <Button
              className={cn("h-11", FOCO)}
              onClick={() => void navigate(destinoInicialSeguro(perfil), { replace: true })}
            >
              Voltar ao início
            </Button>
          ) : (
            <Button
              variant="primary"
              className={cn("h-11", FOCO)}
              onClick={() => {
                queryClient.clear();
                useAuthStore.getState().logout();
                void navigate("/login", { replace: true });
              }}
            >
              Trocar de conta
            </Button>
          )}
        </div>
      </section>
    </main>
  );

  if (!perfilEscritorio(perfil)) {
    return <div className="min-h-dvh flex flex-col bg-background-app">{conteudo}</div>;
  }

  return (
    <SidebarProvider>
      <div className="h-dvh w-full flex overflow-hidden bg-background-app">
        <a href="#conteudo-principal" className="skip-link">
          Ir para o conteúdo
        </a>
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden min-w-0">
          <header className="h-14 shrink-0 border-b border-border-subtle bg-surface px-4 flex items-center md:hidden">
            <SidebarTrigger />
          </header>
          {conteudo}
        </div>
      </div>
    </SidebarProvider>
  );
}
