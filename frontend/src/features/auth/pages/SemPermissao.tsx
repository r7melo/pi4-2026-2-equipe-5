import { useLocation, useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { ShieldAlert } from "lucide-react";
import { useAuthStore } from "../stores/useAuthStore";
import { destinoInicialSeguro, perfilCanonico, perfilEscritorio } from "@/shared/lib/rotasSessao";
import Sidebar, { SidebarTrigger } from "@/shared/layouts/Sidebar";
import { SidebarProvider } from "@/shared/contexts/SidebarProvider";
import { Button } from "@/shared/components/ui/Button";

function caminhoTentado(estado: unknown): string | null {
  if (estado === null || typeof estado !== "object" || !("de" in estado) || typeof estado.de !== "string") return null;
  const bruto = estado.de;
  if (!bruto.startsWith("/") || [...bruto].some(c => c.charCodeAt(0) < 33) || /[\\?#]/.test(bruto) || bruto.includes("//") || /%[0-9a-f]{2}/i.test(bruto)) return null;
  const caminho = bruto.replace(/\/+$/, "") || "/";
  return ["/", "/login", "/sem-permissao"].includes(caminho) ? null : caminho.slice(0, 80);
}

const FOCO = "focus:ring-primary focus-visible:ring-2 focus-visible:ring-primary focus:ring-offset-2 focus-visible:ring-offset-2 ring-offset-surface";

export default function SemPermissao() {
  const perfil = useAuthStore(s => s.usuario?.perfil?.nomePerfil);
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const rotulo = !perfilCanonico(perfil) ? "Não identificado" : perfil === "InstaladorCampo" ? "Instalador de Campo" : perfil;
  const caminho = caminhoTentado(location.state);
  const conteudo = (
    <main className="flex-1 min-w-0 overflow-y-auto flex items-center justify-center p-4 md:p-6 bg-background-app">
      <section className="w-full max-w-lg rounded-xl border border-border-subtle bg-surface p-5 sm:p-8 text-center" aria-labelledby="acesso-titulo">
        <ShieldAlert className="mx-auto mb-4 size-8 text-destructive" aria-hidden="true" />
        <h1 id="acesso-titulo" tabIndex={-1} className="text-2xl font-semibold text-foreground">Acesso Não Autorizado</h1>
        <p className="mt-4 text-foreground-secondary">Seu perfil de acesso atual (<strong>{rotulo}</strong>) não possui permissão para visualizar este recurso.</p>
        {caminho && <p className="mt-3 break-all rounded-lg bg-surface-subtle px-3 py-2 text-sm text-foreground-secondary">{caminho}</p>}
        <p className="mt-4 text-sm text-muted-foreground">Se você precisa de acesso a esta área, entre em contato com o Administrador do sistema.</p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          {perfilCanonico(perfil) && <Button className={FOCO} onClick={() => void navigate(destinoInicialSeguro(perfil), { replace: true })}>Voltar ao Início</Button>}
          <Button variant={perfilCanonico(perfil) ? "outline" : "primary"} className={FOCO} onClick={() => {
            queryClient.clear();
            useAuthStore.getState().logout();
            void navigate("/login", { replace: true });
          }}>Trocar de conta</Button>
        </div>
      </section>
    </main>
  );
  if (!perfilEscritorio(perfil)) return <div className="min-h-screen flex flex-col bg-background-app">{conteudo}</div>;
  return <SidebarProvider><div className="h-screen flex flex-col overflow-hidden bg-background-app">
    <header className="h-14 shrink-0 border-b border-border-subtle bg-surface px-4 flex items-center"><SidebarTrigger className="md:hidden" /></header>
    <div className="flex flex-1 min-h-0"><Sidebar />{conteudo}</div>
  </div></SidebarProvider>;
}
