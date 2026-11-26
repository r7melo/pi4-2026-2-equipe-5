import type { ReactNode } from "react";
import { cn } from "@/shared/lib/utils";

export type BadgeVariante =
  | "success"
  | "warning"
  | "info"
  | "destructive"
  | "accent"
  | "neutral";

export interface BadgeProps {
  variante?: BadgeVariante;
  tamanho?: "xs" | "sm";
  formato?: "pill" | "rounded";
  comBorda?: boolean;
  title?: string;
  className?: string;
  children: ReactNode;
}

const VARIANTES_BADGE: Record<BadgeVariante, { base: string; borda: string }> = {
  success: {
    base: "bg-success-light text-success",
    borda: "border border-success-border",
  },
  warning: {
    base: "bg-warning-light text-warning",
    borda: "border border-warning-border",
  },
  info: {
    base: "bg-info-light text-info",
    borda: "border border-info-border",
  },
  destructive: {
    base: "bg-destructive-light text-destructive",
    borda: "border border-destructive-border",
  },
  accent: {
    base: "bg-accent-light text-accent",
    borda: "border border-accent/25",
  },
  neutral: {
    base: "bg-muted text-muted-foreground",
    borda: "border border-border-subtle",
  },
};

/** Rótulo de status ou contagem com tokens semânticos calibrados para claro e escuro. */
export function Badge({
  variante = "neutral",
  tamanho = "sm",
  formato = "pill",
  comBorda = false,
  title,
  className,
  children,
}: BadgeProps) {
  const estilos = VARIANTES_BADGE[variante];

  return (
    <span
      title={title}
      className={cn(
        "inline-flex items-center gap-1 font-semibold whitespace-nowrap shrink-0",
        tamanho === "xs" ? "px-1.5 py-0.5 text-[10px]" : "px-2 py-0.5 text-[11px]",
        formato === "pill" ? "rounded-full" : "rounded",
        estilos.base,
        comBorda && estilos.borda,
        className
      )}
    >
      {children}
    </span>
  );
}
