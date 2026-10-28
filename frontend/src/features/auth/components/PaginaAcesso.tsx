import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import type { PaginaAcessoProps } from "@/types";

export function PaginaAcesso({ titulo, children }: PaginaAcessoProps) {
  const tituloRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => { tituloRef.current?.focus(); }, []);
  return <main className="min-h-screen bg-background-app flex items-center justify-center p-4 sm:p-6 text-foreground">
    <section aria-labelledby="titulo-acesso" className="w-full max-w-lg rounded-xl border border-border-subtle bg-surface p-6 sm:p-8 space-y-6">
      <p className="text-sm font-medium text-muted-foreground">ZL Engenharia</p>
      <h1 id="titulo-acesso" tabIndex={-1} ref={tituloRef} className="text-2xl font-semibold">{titulo}</h1>
      {children}
      <Link to="/login" className="inline-flex min-h-11 items-center text-sm underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">Voltar para o login</Link>
    </section>
  </main>;
}
