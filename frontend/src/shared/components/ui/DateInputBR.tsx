import * as React from "react";
import { mascararDataBR } from "@/shared/lib/datasBrasileiras";
import { cn } from "@/shared/lib/utils";

export interface DateInputBRProps
  extends Omit<
    React.InputHTMLAttributes<HTMLInputElement>,
    "type" | "value" | "onChange"
  > {
  valor: string;
  onChange: (valorMascarado: string) => void;
  tamanho?: "xs" | "sm" | "md";
  invalido?: boolean;
}

const TAMANHOS_DATA: Record<NonNullable<DateInputBRProps["tamanho"]>, string> = {
  xs: "controle-compacto h-7 px-2 text-xs rounded-md",
  sm: "h-8 px-2 text-xs rounded-md",
  md: "h-9 px-2.5 text-xs rounded-lg",
};

/** Campo controlado de data civil brasileira (`dd/mm/aaaa`) com máscara numérica automática. */
export const DateInputBR = React.forwardRef<HTMLInputElement, DateInputBRProps>(
  (
    {
      valor,
      onChange,
      tamanho = "md",
      invalido = false,
      disabled = false,
      readOnly = false,
      placeholder = "dd/mm/aaaa",
      className,
      ...rest
    },
    ref
  ) => {
    return (
      <input
        ref={ref}
        type="text"
        inputMode="numeric"
        maxLength={10}
        placeholder={placeholder}
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="none"
        spellCheck={false}
        disabled={disabled}
        readOnly={readOnly}
        aria-invalid={invalido || undefined}
        value={valor}
        onChange={(e) => onChange(mascararDataBR(e.target.value))}
        className={cn(
          "w-full border bg-surface-subtle focus:bg-surface text-foreground tabular-nums transition-colors disabled:opacity-60",
          invalido ? "border-destructive" : "border-border-subtle",
          readOnly && "bg-muted cursor-not-allowed opacity-80",
          TAMANHOS_DATA[tamanho],
          className
        )}
        {...rest}
      />
    );
  }
);

DateInputBR.displayName = "DateInputBR";
