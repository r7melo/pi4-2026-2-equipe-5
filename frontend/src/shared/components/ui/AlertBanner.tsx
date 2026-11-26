import * as React from "react";
import { cn } from "@/shared/lib/utils";

export type VarianteAlertBanner = "info" | "success" | "warning" | "destructive";

export interface AlertBannerProps extends React.HTMLAttributes<HTMLDivElement> {
  variante?: VarianteAlertBanner;
  icone?: React.ReactNode;
  titulo?: React.ReactNode;
}

const VARIANTE_CLASSES: Record<VarianteAlertBanner, string> = {
  info: "border-info-border bg-info-light text-info",
  success: "border-success-border bg-success-light text-success",
  warning: "border-warning-border bg-warning-light text-warning",
  destructive: "border-destructive-border bg-destructive-light text-destructive",
};

export function AlertBanner({
  variante = "info",
  icone,
  titulo,
  role,
  className,
  children,
  ...props
}: AlertBannerProps) {
  const roleResolvido =
    role ?? (variante === "destructive" || variante === "warning" ? "alert" : "status");

  return (
    <div
      role={roleResolvido}
      className={cn(
        "rounded-lg border px-3.5 py-3 text-xs leading-relaxed flex items-start gap-2.5",
        VARIANTE_CLASSES[variante],
        className,
      )}
      {...props}
    >
      {icone && (
        <span className="shrink-0 mt-0.5" aria-hidden="true">
          {icone}
        </span>
      )}
      <div className="min-w-0 flex-1 space-y-0.5">
        {titulo && <p className="font-semibold text-sm leading-snug">{titulo}</p>}
        <div>{children}</div>
      </div>
    </div>
  );
}
