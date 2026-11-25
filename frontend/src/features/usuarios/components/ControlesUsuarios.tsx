import { useEffect, useRef } from "react";
import { RotateCcw, Search, X } from "lucide-react";
import { NOMES_PERFIS, ROTULOS_PERFIS } from "@/shared/constants/perfis";
import { cn } from "@/shared/lib/utils";
import type { FiltrosUsuarios, UsuarioItem } from "../types/gestaoUsuarios";
import type { ControlesUsuariosProps } from "../types/gestaoUsuariosUI";

const OPCOES_STATUS: { valor: FiltrosUsuarios["ativo"]; label: string }[] = [
  { valor: "true", label: "Ativos" },
  { valor: "false", label: "Inativos" },
  { valor: "todos", label: "Todos" },
];

function CampoBuscaCompacto({
  inputRef,
  busca,
  aoBuscar,
  placeholder,
  className,
}: {
  inputRef?: React.RefObject<HTMLInputElement | null>;
  busca: string;
  aoBuscar: (valor: string) => void;
  placeholder: string;
  className?: string;
}) {
  return (
    <div className={cn("relative flex items-center", className)}>
      <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-2.5 pointer-events-none" aria-hidden="true" />
      <input
        ref={inputRef}
        type="search"
        maxLength={200}
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        enterKeyHint="search"
        value={busca}
        onChange={e => aoBuscar(e.target.value)}
        placeholder={placeholder}
        aria-label="Buscar por nome ou e-mail"
        className="controle-compacto w-full h-7 rounded-md border border-border-strong bg-surface-subtle focus:bg-surface pl-8 pr-6 text-xs text-foreground placeholder:text-muted-foreground transition-colors"
      />
      {busca && (
        <button
          type="button"
          onClick={() => aoBuscar("")}
          aria-label="Limpar busca"
          className="controle-compacto absolute right-1 w-5 h-5 rounded flex items-center justify-center text-muted-foreground hover:text-foreground cursor-pointer"
        >
          <X className="w-3 h-3" aria-hidden="true" />
        </button>
      )}
    </div>
  );
}

function SeletorStatusSegmentado({
  valor,
  aoStatus,
  className,
  mobile = false,
}: {
  valor: FiltrosUsuarios["ativo"];
  aoStatus: (ativo: FiltrosUsuarios["ativo"]) => void;
  className?: string;
  mobile?: boolean;
}) {
  return (
    <div
      role="group"
      aria-label="Status do usuário"
      className={cn("flex items-center h-7 p-0.5 rounded-md bg-muted border border-border-subtle", className)}
    >
      {OPCOES_STATUS.map(opcao => {
        const ativo = valor === opcao.valor;
        return (
          <button
            key={opcao.valor}
            type="button"
            aria-pressed={ativo}
            onClick={() => aoStatus(opcao.valor)}
            className={cn(
              "controle-compacto h-full inline-flex items-center justify-center rounded text-[11px] font-medium cursor-pointer transition-colors",
              mobile ? "px-1" : "px-2",
              ativo
                ? "bg-surface text-foreground font-semibold shadow-2xs"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {opcao.label}
          </button>
        );
      })}
    </div>
  );
}

export function ControlesUsuarios({ busca, filtros, filtrado, aoBuscar, aoPerfil, aoStatus, aoLimpar }: ControlesUsuariosProps) {
  const buscaDesktopRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const aoTeclar = (e: KeyboardEvent) => {
      if (e.key !== "/" || e.metaKey || e.ctrlKey || e.altKey) return;
      const alvo = e.target as HTMLElement | null;
      if (alvo && (["INPUT", "TEXTAREA", "SELECT"].includes(alvo.tagName) || alvo.isContentEditable)) return;
      if (!buscaDesktopRef.current || buscaDesktopRef.current.offsetParent === null) return;
      e.preventDefault();
      buscaDesktopRef.current.focus();
    };
    document.addEventListener("keydown", aoTeclar);
    return () => document.removeEventListener("keydown", aoTeclar);
  }, []);

  return (
    <search aria-label="Filtros de usuários" className="hidden lg:flex items-center gap-1.5 shrink-0">
      <CampoBuscaCompacto
        inputRef={buscaDesktopRef}
        busca={busca}
        aoBuscar={aoBuscar}
        placeholder="Buscar nome ou e-mail (/)"
        className="w-52"
      />
      <select
        value={filtros.perfil ?? ""}
        aria-label="Filtrar por perfil"
        onChange={e => aoPerfil(e.target.value ? (e.target.value as UsuarioItem["perfil"]) : undefined)}
        className="controle-compacto h-7 rounded-md border border-border-strong bg-surface px-2 text-xs text-foreground cursor-pointer"
      >
        <option value="">Todos os perfis</option>
        {NOMES_PERFIS.map(p => <option key={p} value={p}>{ROTULOS_PERFIS[p]}</option>)}
      </select>
      <SeletorStatusSegmentado valor={filtros.ativo} aoStatus={aoStatus} className="shrink-0" />
      <button
        type="button"
        onClick={aoLimpar}
        disabled={!filtrado}
        title="Limpar filtros"
        aria-label="Limpar filtros"
        className="controle-compacto w-7 h-7 inline-flex items-center justify-center rounded-md border border-border-subtle bg-surface hover:bg-muted text-foreground-muted disabled:opacity-35 disabled:hover:bg-surface disabled:cursor-default cursor-pointer shrink-0"
      >
        <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
      </button>
    </search>
  );
}

const ROTULOS_PERFIS_MOBILE: Record<UsuarioItem["perfil"], string> = {
  Administrador: "Admin",
  Engenharia: "Engenharia",
  Financeiro: "Financeiro",
  InstaladorCampo: "Instalador",
};

export function ControlesUsuariosMobile({ busca, filtros, filtrado, aoBuscar, aoPerfil, aoStatus, aoLimpar }: ControlesUsuariosProps) {
  return (
    <search aria-label="Filtros de usuários" className="basis-full w-full lg:hidden pt-1 space-y-1.5">
      <div className="flex items-center gap-1.5">
        <CampoBuscaCompacto
          busca={busca}
          aoBuscar={aoBuscar}
          placeholder="Buscar nome ou e-mail..."
          className="flex-1 min-w-0"
        />
        <select
          value={filtros.perfil ?? ""}
          aria-label="Filtrar por perfil"
          onChange={e => aoPerfil(e.target.value ? (e.target.value as UsuarioItem["perfil"]) : undefined)}
          className="controle-compacto h-7 w-28 shrink-0 rounded-md border border-border-strong bg-surface px-1.5 text-xs text-foreground"
        >
          <option value="">Perfis</option>
          {NOMES_PERFIS.map(p => <option key={p} value={p}>{ROTULOS_PERFIS_MOBILE[p]}</option>)}
        </select>
      </div>
      <div className="flex items-center justify-between gap-2">
        <SeletorStatusSegmentado
          valor={filtros.ativo}
          aoStatus={aoStatus}
          mobile
          className="flex-1 grid grid-cols-3"
        />
        <button
          type="button"
          onClick={aoLimpar}
          disabled={!filtrado}
          title="Limpar filtros"
          aria-label="Limpar filtros"
          className="controle-compacto w-7 h-7 inline-flex items-center justify-center rounded-md border border-border-subtle bg-surface text-foreground-muted disabled:opacity-35 disabled:cursor-default cursor-pointer shrink-0"
        >
          <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
        </button>
      </div>
    </search>
  );
}
