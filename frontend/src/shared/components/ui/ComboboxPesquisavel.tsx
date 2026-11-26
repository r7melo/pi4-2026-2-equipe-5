import { useEffect, useId, useMemo, useRef, useState, type Ref } from "react";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/shared/lib/utils";

export interface OpcaoCombobox {
  valor: string;
  rotulo: string;
  subtitulo?: string;
  badge?: string;
  badgeVariante?: "success" | "warning" | "muted";
  desabilitada?: boolean;
  textoBusca?: string;
}

export interface ComboboxPesquisavelProps {
  id?: string;
  inputRef?: Ref<HTMLInputElement>;
  ariaLabel?: string;
  listboxAriaLabel?: string;
  ariaInvalid?: boolean;
  ariaDescribedBy?: string;
  opcoes: OpcaoCombobox[];
  valorSelecionado: string;
  textoInicial?: string;
  placeholder?: string;
  mensagemVazia?: string;
  desabilitado?: boolean;
  compacto?: boolean;
  direcao?: "baixo" | "cima";
  permitirTextoLivre?: boolean;
  onSelecionar: (valor: string, opcao?: OpcaoCombobox) => void;
  onTextoChange?: (texto: string) => void;
  className?: string;
}

function normalizarBusca(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

const BADGE_CLASSES: Record<NonNullable<OpcaoCombobox["badgeVariante"]>, string> = {
  success: "bg-success-light text-success",
  warning: "bg-warning-light text-warning",
  muted: "bg-muted text-muted-foreground",
};

export function ComboboxPesquisavel({
  id,
  inputRef,
  ariaLabel,
  listboxAriaLabel,
  ariaInvalid,
  ariaDescribedBy,
  opcoes,
  valorSelecionado,
  textoInicial = "",
  placeholder = "Pesquisar...",
  mensagemVazia,
  desabilitado = false,
  compacto = false,
  direcao = "baixo",
  permitirTextoLivre = false,
  onSelecionar,
  onTextoChange,
  className,
}: ComboboxPesquisavelProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const listboxId = useId();
  const [aberto, setAberto] = useState(false);
  const [busca, setBusca] = useState(textoInicial);
  const [digitouBusca, setDigitouBusca] = useState(false);
  const [indiceAtivo, setIndiceAtivo] = useState(-1);

  const opcaoSelecionada = useMemo(
    () => opcoes.find((o) => o.valor === valorSelecionado) ?? null,
    [opcoes, valorSelecionado]
  );

  const opcoesFiltradas = useMemo(() => {
    if (!digitouBusca) return opcoes;
    const termo = normalizarBusca(busca);
    if (!termo) return opcoes;
    return opcoes.filter((o) =>
      normalizarBusca([o.rotulo, o.subtitulo, o.textoBusca].filter(Boolean).join(" ")).includes(termo)
    );
  }, [busca, digitouBusca, opcoes]);

  useEffect(() => {
    if (!aberto) return;
    const handleClickFora = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setAberto(false);
        setDigitouBusca(false);
        setIndiceAtivo(-1);
      }
    };
    document.addEventListener("mousedown", handleClickFora);
    return () => document.removeEventListener("mousedown", handleClickFora);
  }, [aberto]);

  const selecionarOpcao = (op: OpcaoCombobox) => {
    if (op.desabilitada) return;
    onSelecionar(op.valor, op);
    setBusca(op.rotulo);
    setDigitouBusca(false);
    setAberto(false);
    setIndiceAtivo(-1);
  };

  const moverIndiceAtivo = (delta: 1 | -1) => {
    if (opcoesFiltradas.length === 0) return;
    const indicesHabilitados = opcoesFiltradas
      .map((o, i) => (o.desabilitada ? -1 : i))
      .filter((i) => i >= 0);
    if (indicesHabilitados.length === 0) return;

    const posAtual = indicesHabilitados.indexOf(indiceAtivo);
    if (posAtual === -1) {
      setIndiceAtivo(
        delta === 1
          ? indicesHabilitados[0]
          : indicesHabilitados[indicesHabilitados.length - 1]
      );
      return;
    }
    const proximo =
      (posAtual + delta + indicesHabilitados.length) % indicesHabilitados.length;
    setIndiceAtivo(indicesHabilitados[proximo]);
  };

  const valorExibido =
    aberto && digitouBusca
      ? busca
      : opcaoSelecionada
      ? opcaoSelecionada.rotulo
      : valorSelecionado || permitirTextoLivre
      ? busca
      : "";

  const textoVazio =
    mensagemVazia ??
    (digitouBusca && busca.trim()
      ? `Nenhum resultado para "${busca.trim()}".`
      : "Nenhuma opção disponível.");

  const opcaoAtiva = indiceAtivo >= 0 ? opcoesFiltradas[indiceAtivo] : undefined;

  return (
    <div ref={wrapRef} className={cn("relative", className)}>
      <input
        id={id}
        ref={inputRef}
        type="text"
        role="combobox"
        aria-label={ariaLabel}
        aria-expanded={aberto}
        aria-controls={aberto ? listboxId : undefined}
        aria-autocomplete="list"
        aria-activedescendant={
          aberto && opcaoAtiva ? `${listboxId}-opt-${indiceAtivo}` : undefined
        }
        aria-invalid={ariaInvalid}
        aria-describedby={ariaDescribedBy}
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="none"
        spellCheck={false}
        enterKeyHint="search"
        disabled={desabilitado}
        value={valorExibido}
        placeholder={placeholder}
        onFocus={() => {
          if (desabilitado) return;
          setDigitouBusca(false);
          setIndiceAtivo(-1);
          setAberto(true);
        }}
        onClick={() => {
          if (!desabilitado && !aberto) {
            setDigitouBusca(false);
            setIndiceAtivo(-1);
            setAberto(true);
          }
        }}
        onChange={(e) => {
          const texto = e.target.value;
          setBusca(texto);
          setDigitouBusca(true);
          setIndiceAtivo(-1);
          if (valorSelecionado) onSelecionar("", undefined);
          onTextoChange?.(texto);
          if (!aberto) setAberto(true);
        }}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") {
            e.preventDefault();
            if (!aberto) {
              setDigitouBusca(false);
              setAberto(true);
            }
            moverIndiceAtivo(1);
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            if (!aberto) {
              setDigitouBusca(false);
              setAberto(true);
            }
            moverIndiceAtivo(-1);
          } else if (
            e.key === "Enter" &&
            aberto &&
            opcaoAtiva &&
            !opcaoAtiva.desabilitada &&
            !e.nativeEvent.isComposing
          ) {
            e.preventDefault();
            selecionarOpcao(opcaoAtiva);
          } else if (e.key === "Escape" && aberto && !e.nativeEvent.isComposing) {
            e.preventDefault();
            e.stopPropagation();
            setAberto(false);
            setDigitouBusca(false);
            setIndiceAtivo(-1);
          }
        }}
        className={cn(
          "w-full border border-border-strong text-foreground placeholder:text-muted-foreground transition-colors",
          compacto
            ? "controle-compacto h-8 text-xs px-2.5 pr-7 rounded-md bg-surface disabled:opacity-55"
            : "h-10 text-sm px-3.5 pr-9 rounded-lg bg-surface-subtle focus:bg-surface disabled:opacity-60"
        )}
      />

      <ChevronDown
        aria-hidden="true"
        className={cn(
          "absolute top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none transition-transform",
          compacto ? "right-2 w-3.5 h-3.5" : "right-3 w-4 h-4",
          aberto && "rotate-180"
        )}
      />

      {aberto && !desabilitado && (
        <div
          id={listboxId}
          role="listbox"
          aria-label={listboxAriaLabel || ariaLabel || "Opções disponíveis"}
          className={cn(
            "absolute left-0 right-0 z-50 rounded-lg border border-border-subtle bg-surface shadow-xl max-h-48 overflow-y-auto overscroll-contain divide-y divide-border-subtle custom-scrollbar",
            direcao === "cima" ? "bottom-full mb-1" : "top-full mt-1"
          )}
        >
          {opcoesFiltradas.length === 0 ? (
            <p className="px-3 py-2.5 text-xs text-muted-foreground">{textoVazio}</p>
          ) : (
            opcoesFiltradas.map((op, idx) => {
              const isSel = valorSelecionado === op.valor;
              const isAtivo = idx === indiceAtivo;
              return (
                <button
                  key={op.valor}
                  id={`${listboxId}-opt-${idx}`}
                  type="button"
                  role="option"
                  aria-selected={isSel}
                  aria-disabled={op.desabilitada || undefined}
                  disabled={op.desabilitada}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => selecionarOpcao(op)}
                  className={cn(
                    "w-full text-left px-3 py-2 flex items-center justify-between gap-2 text-xs transition-colors",
                    op.desabilitada
                      ? "opacity-55 cursor-not-allowed"
                      : "hover:bg-surface-subtle cursor-pointer",
                    isSel && "bg-info-light",
                    isAtivo && !isSel && "bg-surface-subtle"
                  )}
                >
                  <div className="min-w-0">
                    <div className="font-medium text-foreground truncate">{op.rotulo}</div>
                    {op.subtitulo && (
                      <div className="text-[11px] text-muted-foreground truncate">
                        {op.subtitulo}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {op.badge && (
                      <span
                        className={cn(
                          "px-2 py-0.5 rounded-full text-[10px] font-semibold",
                          BADGE_CLASSES[op.badgeVariante ?? "muted"]
                        )}
                      >
                        {op.badge}
                      </span>
                    )}
                    {isSel && <Check className="w-3.5 h-3.5 text-info shrink-0" aria-hidden="true" />}
                  </div>
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
