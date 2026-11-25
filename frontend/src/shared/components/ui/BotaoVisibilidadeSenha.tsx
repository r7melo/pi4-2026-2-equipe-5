import { Eye, EyeOff } from "lucide-react";
import { cn } from "@/shared/lib/utils";

export interface BotaoVisibilidadeSenhaProps {
  visivel: boolean;
  onAlternar: () => void;
  disabled?: boolean;
  rotuloMostrar?: string;
  rotuloOcultar?: string;
  className?: string;
}

/**
 * Controle reutilizável de alternância mostrar/ocultar senha (`44×44px` exatos).
 *
 * Projetado para uso como irmão direto de `<input>` dentro de `<div className="relative">`
 * com `right-1 top-1/2 -translate-y-1/2`. Caso um chamador futuro sobrescreva o eixo
 * vertical via `className` (`top-*`), deve informar `translate-y-0` conjuntamente, pois
 * `tailwind-merge` substitui `top-*` mantendo `-translate-y-1/2`.
 */
export function BotaoVisibilidadeSenha({
  visivel,
  onAlternar,
  disabled = false,
  rotuloMostrar = "Mostrar senha",
  rotuloOcultar = "Ocultar senha",
  className,
}: BotaoVisibilidadeSenhaProps) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onAlternar}
      aria-label={visivel ? rotuloOcultar : rotuloMostrar}
      className={cn(
        "absolute right-1 top-1/2 -translate-y-1/2 h-11 w-11 min-h-11 min-w-11 flex items-center justify-center rounded text-foreground-muted hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer",
        className,
      )}
    >
      {visivel ? (
        <EyeOff aria-hidden="true" className="size-4" />
      ) : (
        <Eye aria-hidden="true" className="size-4" />
      )}
    </button>
  );
}
