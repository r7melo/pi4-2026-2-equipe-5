import { useEffect, useRef } from "react";
import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import type { PaginaAcessoProps } from "../types/senha";

export function PaginaAcesso({ titulo, subtitulo, children }: PaginaAcessoProps) {
  const tituloRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => { tituloRef.current?.focus(); }, []);
  return (
    <main className="min-h-dvh bg-background-app flex items-center justify-center p-4 sm:p-6 text-foreground">
      <section
        aria-labelledby="titulo-acesso"
        className="w-full max-w-[440px] rounded-xl border border-border-subtle bg-surface p-6 sm:p-8 space-y-6"
      >
        <div className="space-y-4">
          <Link
            to="/login"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground py-1 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
            Voltar para o login
          </Link>

          <div className="flex items-center gap-3">
            <span className="w-10 h-10 rounded-lg bg-primary text-primary-foreground inline-flex items-center justify-center text-xs font-semibold shrink-0">
              ZL
            </span>
            <div className="min-w-0">
              <h1 id="titulo-acesso" tabIndex={-1} ref={tituloRef} className="text-2xl font-semibold tracking-tight text-foreground">
                {titulo}
              </h1>
              {subtitulo && <p className="text-xs text-muted-foreground mt-0.5">{subtitulo}</p>}
            </div>
          </div>
        </div>
        {children}
      </section>
    </main>
  );
}
