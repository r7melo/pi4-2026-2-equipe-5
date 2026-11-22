import { ROTULOS_PERFIS } from "@/shared/constants/perfis";
import { useLocation, useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { FileQuestion } from "lucide-react";
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
      className="flex-1 min-w-0 overflow-y-auto flex items-center justify-center p-4 md:p-6 bg-background-app"
    >
      <section
        className="my-auto w-full max-w-lg rounded-xl border border-border-subtle bg-surface p-5 sm:p-8 text-center"
        aria-labelledby="nao-encontrada-titulo"
      >
        <FileQuestion className="mx-auto mb-4 size-8 text-muted-foreground" aria-hidden="true" />
        <h1 id="nao-encontrada-titulo" tabIndex={-1} className="text-2xl font-semibold text-foreground">
          Página não encontrada
        </h1>
        <p className="mt-4 text-foreground-secondary">
          O endereço acessado não existe ou foi movido. Retorne à tela principal do seu perfil (
          <strong>{rotulo}</strong>).
        </p>
        {caminho && (
          <p className="mt-3 break-all rounded-lg bg-surface-subtle px-3 py-2 text-sm text-foreground-secondary">
            {caminho}
          </p>
        )}
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          {perfilCanonico(perfil) ? (
            <Button
              className={FOCO}
              onClick={() => void navigate(destinoInicialSeguro(perfil), { replace: true })}
            >
              Voltar ao Início
            </Button>
          ) : (
            <Button
              variant="primary"
              className={FOCO}
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
      <div className="h-dvh flex flex-col overflow-hidden bg-background-app">
        <a href="#conteudo-principal" className="skip-link">
          Ir para o conteúdo
        </a>
        <header className="h-14 shrink-0 border-b border-border-subtle bg-surface px-4 flex items-center">
          <SidebarTrigger className="md:hidden" />
        </header>
        <div className="flex flex-1 min-h-0">
          <Sidebar />
          {conteudo}
        </div>
      </div>
    </SidebarProvider>
  );
}
