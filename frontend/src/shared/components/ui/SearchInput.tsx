import * as React from "react";
import { useRef } from "react";
import { Search, X } from "lucide-react";
import { cn } from "@/shared/lib/utils";

export interface SearchInputProps {
  valor: string;
  onChange: (valor: string) => void;
  placeholder?: string;
  ariaLabel?: string;
  tamanho?: "xs" | "sm" | "md";
  onLimpar?: () => void;
  exibirLimparSempre?: boolean;
  onEscape?: () => void;
  autoFocus?: boolean;
  maxLength?: number;
  className?: string;
}

export const SearchInput = React.forwardRef<HTMLInputElement, SearchInputProps>(
  (
    {
      valor,
      onChange,
      placeholder = "Buscar...",
      ariaLabel,
      tamanho = "md",
      onLimpar,
      exibirLimparSempre = false,
      onEscape,
      autoFocus = false,
      maxLength,
      className,
    },
    ref
  ) => {
    const campoRef = useRef<HTMLInputElement>(null);
    const isMd = tamanho === "md";

    const atribuirRef = (el: HTMLInputElement | null) => {
      campoRef.current = el;
      if (typeof ref === "function") ref(el);
      else if (ref) ref.current = el;
    };

    const handleLimpar = () => {
      campoRef.current?.focus();
      if (onLimpar) {
        onLimpar();
      } else {
        onChange("");
      }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.nativeEvent.isComposing) return;
      if (e.key === "Escape") {
        if (onEscape) {
          onEscape();
        } else if (valor) {
          e.preventDefault();
          handleLimpar();
        } else {
          e.currentTarget.blur();
        }
      }
    };

    const tamanhoClasse =
      tamanho === "xs"
        ? "controle-compacto h-7 text-xs pl-8 pr-7"
        : tamanho === "sm"
          ? "controle-compacto h-9 text-xs pl-8 pr-7"
          : "text-sm pl-9 pr-8 py-2";

    return (
      <search className={cn("relative flex items-center", className)}>
        <Search
          aria-hidden="true"
          className={cn(
            "text-muted-foreground absolute pointer-events-none shrink-0",
            isMd ? "w-4 h-4 left-3" : "w-3.5 h-3.5 left-2.5"
          )}
        />
        <input
          ref={atribuirRef}
          type="search"
          aria-label={ariaLabel || placeholder}
          autoComplete="off"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          value={valor}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          autoFocus={autoFocus}
          maxLength={maxLength}
          className={cn(
            "w-full rounded-lg bg-surface-subtle border border-border-strong text-foreground placeholder:text-muted-foreground transition-colors focus:bg-surface [&::-webkit-search-cancel-button]:hidden",
            tamanhoClasse
          )}
        />
        {(valor || exibirLimparSempre) && (
          <button
            type="button"
            onClick={handleLimpar}
            aria-label="Limpar busca"
            className={cn(
              "controle-compacto absolute text-muted-foreground hover:text-foreground transition-colors cursor-pointer rounded flex items-center justify-center",
              isMd ? "right-2 w-6 h-6" : "right-1.5 w-5 h-5"
            )}
          >
            <X aria-hidden="true" className={isMd ? "w-3.5 h-3.5" : "w-3 h-3"} />
          </button>
        )}
      </search>
    );
  }
);

SearchInput.displayName = "SearchInput";

export default SearchInput;
