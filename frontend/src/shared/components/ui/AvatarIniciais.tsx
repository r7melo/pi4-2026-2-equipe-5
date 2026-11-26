import { cn } from "@/shared/lib/utils";

export type TamanhoAvatar = "xs" | "sm" | "md" | "lg";
export type TomAvatar = "subtle" | "surface" | "muted" | "primary";

export interface AvatarIniciaisProps {
  nome?: string | null;
  fallback?: string;
  letras?: 1 | 2;
  size?: TamanhoAvatar;
  tone?: TomAvatar;
  className?: string;
}

const SIZE_CLASSES: Record<TamanhoAvatar, string> = {
  xs: "w-6 h-6 text-[10px] font-bold",
  sm: "w-7 h-7 text-xs font-semibold",
  md: "w-8 h-8 text-xs font-semibold",
  lg: "w-11 h-11 text-sm font-semibold",
};

const TONE_CLASSES: Record<TomAvatar, string> = {
  subtle: "border border-border-strong bg-surface-subtle text-foreground",
  surface: "border border-border-subtle bg-surface text-foreground",
  muted: "bg-muted text-foreground",
  primary: "bg-primary text-primary-foreground",
};

function extrairIniciais(
  nome?: string | null,
  fallback = "ZL",
  letras: 1 | 2 = 2,
): string {
  const partes = (nome || "").trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return fallback;
  if (letras === 1) return partes[0].charAt(0).toUpperCase() || fallback;
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
  return `${partes[0][0]}${partes[partes.length - 1][0]}`.toUpperCase();
}

export function AvatarIniciais({
  nome,
  fallback = "ZL",
  letras = 2,
  size = "sm",
  tone = "subtle",
  className,
}: AvatarIniciaisProps) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "rounded-full inline-flex items-center justify-center shrink-0 select-none",
        SIZE_CLASSES[size],
        TONE_CLASSES[tone],
        className,
      )}
    >
      {extrairIniciais(nome, fallback, letras)}
    </span>
  );
}
