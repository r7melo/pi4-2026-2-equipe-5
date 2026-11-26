import { cn } from "@/shared/lib/utils";

export interface OpcaoSegmentedControl<T extends string> {
  valor: T;
  rotulo: string;
}

export interface SegmentedControlProps<T extends string> {
  opcoes: ReadonlyArray<OpcaoSegmentedControl<T>>;
  valor: T;
  onChange: (valor: T) => void;
  ariaLabel?: string;
  tamanho?: "xs" | "sm";
  larguraTotal?: boolean;
  className?: string;
}

/** Alternador segmentado compacto em grupo de opções mutuamente exclusivas. */
export function SegmentedControl<T extends string>({
  opcoes,
  valor,
  onChange,
  ariaLabel,
  tamanho = "xs",
  larguraTotal = false,
  className,
}: SegmentedControlProps<T>) {
  const isXs = tamanho === "xs";

  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className={cn(
        "items-center p-0.5 rounded-md bg-muted border border-border-subtle",
        larguraTotal ? "grid w-full" : "inline-flex gap-0.5 shrink-0",
        isXs && !larguraTotal && "h-7",
        className
      )}
      style={
        larguraTotal
          ? { gridTemplateColumns: `repeat(${opcoes.length}, minmax(0, 1fr))` }
          : undefined
      }
    >
      {opcoes.map((op) => {
        const ativo = valor === op.valor;
        return (
          <button
            key={op.valor}
            type="button"
            aria-pressed={ativo}
            onClick={() => onChange(op.valor)}
            className={cn(
              "controle-compacto rounded text-[11px] transition-colors cursor-pointer whitespace-nowrap",
              isXs ? "h-full px-1.5 sm:px-2" : "py-1 px-2",
              ativo
                ? "bg-surface text-foreground shadow-2xs font-semibold"
                : "text-muted-foreground font-medium hover:text-foreground"
            )}
          >
            {op.rotulo}
          </button>
        );
      })}
    </div>
  );
}
