import * as React from "react";
import { cn } from "@/shared/lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  errorId?: string;
  helperText?: string;
  icon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, errorId, helperText, icon, id, type = "text",
    "aria-describedby": descricaoExterna, ...props }, ref) => {
    const generatedId = React.useId();
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, "-") : generatedId);
    const resolvedErrorId = errorId || (inputId + "-erro");
    const describedBy = [descricaoExterna, error ? resolvedErrorId : undefined]
      .filter(Boolean).join(" ") || undefined;

    return (
      <div className="space-y-1.5 w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-sm font-semibold text-foreground-muted"
          >
            {label}
            {props.required && <span className="text-destructive ml-1">*</span>}
          </label>
        )}

        <div className="relative">
          {icon && (
            <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-subtle-foreground pointer-events-none flex items-center justify-center">
              {icon}
            </div>
          )}

          <input
            ref={ref}
            id={inputId}
            type={type}
            aria-invalid={!!error}
            aria-describedby={describedBy}
            className={cn(
              "w-full rounded-lg border bg-surface-subtle border-border-subtle px-4 py-2.5 text-sm text-foreground-secondary placeholder-subtle-foreground outline-none transition-all focus:bg-surface focus:border-border-strong focus:ring-2 focus:ring-border-subtle disabled:opacity-50 disabled:cursor-not-allowed",
              icon ? "pl-10" : "px-4",
              error && "border-destructive-border bg-destructive-light/30 focus:border-destructive focus:ring-destructive-border",
              className
            )}
            {...props}
          />
        </div>

        {error ? (
          <p id={resolvedErrorId} className="text-xs text-destructive font-medium mt-1 animate-fadeIn">{error}</p>
        ) : helperText ? (
          <p className="text-xs text-muted-foreground mt-1">{helperText}</p>
        ) : null}
      </div>
    );
  }
);

Input.displayName = "Input";
