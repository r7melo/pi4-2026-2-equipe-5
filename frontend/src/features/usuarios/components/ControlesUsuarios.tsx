import { Button } from "@/shared/components/ui/Button";
import { NOMES_PERFIS, ROTULOS_PERFIS } from "@/shared/constants/perfis";
import type { FiltrosUsuarios, UsuarioItem } from "../types/gestaoUsuarios";
import type { ControlesUsuariosProps } from "../types/gestaoUsuariosUI";

export function ControlesUsuarios({ busca, filtros, filtrado, aoBuscar, aoPerfil, aoStatus, aoLimpar }: ControlesUsuariosProps) {
  return (<div className="flex flex-wrap items-end gap-3 text-sm">
        <label className="grow min-w-0">Buscar por nome ou e-mail<input value={busca} maxLength={200} onChange={e => aoBuscar(e.target.value)} className="block w-full p-2 bg-surface border border-border-subtle rounded-lg" /></label>
        <label>Perfil<select value={filtros.perfil ?? ""} onChange={e => aoPerfil(e.target.value ? e.target.value as UsuarioItem["perfil"] : undefined)} className="block p-2 bg-surface border border-border-subtle rounded-lg"><option value="">Todos os perfis</option>{NOMES_PERFIS.map(p => <option key={p} value={p}>{ROTULOS_PERFIS[p]}</option>)}</select></label>
        <label>Status<select value={filtros.ativo} onChange={e => aoStatus(e.target.value as FiltrosUsuarios["ativo"])} className="block p-2 bg-surface border border-border-subtle rounded-lg"><option value="true">Ativos</option><option value="false">Inativos</option><option value="todos">Todos</option></select></label>
        {filtrado && <Button variant="outline" onClick={aoLimpar}>Limpar filtros</Button>}
      </div>);
}
