import { Search, X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SearchInputProps {
  valor: string;
  onChange: (valor: string) => void;
  placeholder?: string;
  tamanho?: "sm" | "md";
  onLimpar?: () => void;
  exibirLimparSempre?: boolean;
  onEscape?: () => void;
  autoFocus?: boolean;
  className?: string;
}

export function SearchInput({
  valor,
  onChange,
  placeholder = "Buscar...",
  tamanho = "md",
  onLimpar,
  exibirLimparSempre = false,
  onEscape,
  autoFocus = false,
  className,
}: SearchInputProps) {
  const isSm = tamanho === "sm";

  const handleLimpar = () => {
    if (onLimpar) {
      onLimpar();
    } else {
      onChange("");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") {
      if (onEscape) {
        onEscape();
      } else {
        handleLimpar();
      }
    }
  };

  return (
    <div className={cn("relative flex items-center", className)}>
      <Search
        className={cn(
          "text-slate-400 absolute pointer-events-none shrink-0",
          isSm ? "w-3.5 h-3.5 left-2.5" : "w-4 h-4 left-3"
        )}
      />
      <input
        type="text"
        value={valor}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        autoFocus={autoFocus}
        className={cn(
          "w-full rounded-md bg-slate-50 border border-slate-200 text-slate-800 placeholder-slate-400 transition-colors focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500",
          isSm ? "text-xs pl-8 pr-7 py-1.5" : "text-sm pl-9 pr-8 py-2"
        )}
      />
      {(valor || exibirLimparSempre) && (
        <button
          type="button"
          onClick={handleLimpar}
          aria-label="Limpar busca"
          className={cn(
            "absolute text-slate-400 hover:text-slate-600 transition-colors cursor-pointer p-0.5 rounded",
            isSm ? "right-2" : "right-2.5"
          )}
        >
          <X className={isSm ? "w-3 h-3" : "w-3.5 h-3.5"} />
        </button>
      )}
    </div>
  );
}

export default SearchInput;
