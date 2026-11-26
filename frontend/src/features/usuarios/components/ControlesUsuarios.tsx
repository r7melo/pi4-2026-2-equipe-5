import { useEffect, useRef } from "react";
import { RotateCcw } from "lucide-react";
import { NOMES_PERFIS, ROTULOS_PERFIS } from "@/shared/constants/perfis";
import { IconActionButton } from "@/shared/components/ui/IconActionButton";
import { SearchInput } from "@/shared/components/ui/SearchInput";
import { SegmentedControl, type OpcaoSegmentedControl } from "@/shared/components/ui/SegmentedControl";
import type { FiltrosUsuarios, UsuarioItem } from "../types/gestaoUsuarios";
import type { ControlesUsuariosProps } from "../types/gestaoUsuariosUI";

const OPCOES_STATUS: ReadonlyArray<OpcaoSegmentedControl<FiltrosUsuarios["ativo"]>> = [
  { valor: "true", rotulo: "Ativos" },
  { valor: "false", rotulo: "Inativos" },
  { valor: "todos", rotulo: "Todos" },
];

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
    <div role="region" aria-label="Filtros de usuários" className="hidden lg:flex items-center gap-1.5 shrink-0">
      <SearchInput
        ref={buscaDesktopRef}
        valor={busca}
        onChange={aoBuscar}
        placeholder="Buscar nome ou e-mail (/)"
        ariaLabel="Buscar por nome ou e-mail"
        tamanho="xs"
        maxLength={200}
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
      <SegmentedControl
        opcoes={OPCOES_STATUS}
        valor={filtros.ativo}
        onChange={aoStatus}
        ariaLabel="Status do usuário"
        tamanho="xs"
      />
      <IconActionButton
        size="sm"
        onClick={aoLimpar}
        disabled={!filtrado}
        label="Limpar filtros"
        className="border border-border-subtle bg-surface text-foreground-muted disabled:opacity-35 disabled:hover:bg-surface"
      >
        <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
      </IconActionButton>
    </div>
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
    <div role="region" aria-label="Filtros de usuários" className="basis-full w-full lg:hidden pt-1 space-y-1.5">
      <div className="flex items-center gap-1.5">
        <SearchInput
          valor={busca}
          onChange={aoBuscar}
          placeholder="Buscar nome ou e-mail..."
          ariaLabel="Buscar por nome ou e-mail"
          tamanho="xs"
          maxLength={200}
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
        <SegmentedControl
          opcoes={OPCOES_STATUS}
          valor={filtros.ativo}
          onChange={aoStatus}
          ariaLabel="Status do usuário"
          tamanho="xs"
          larguraTotal
          className="flex-1 h-7"
        />
        <IconActionButton
          size="sm"
          onClick={aoLimpar}
          disabled={!filtrado}
          label="Limpar filtros"
          className="border border-border-subtle bg-surface text-foreground-muted disabled:opacity-35 disabled:hover:bg-surface"
        >
          <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
        </IconActionButton>
      </div>
    </div>
  );
}
