import { Button } from "@/shared/components/ui/Button";
import FeedbackLoading from "@/shared/components/feedback/FeedbackLoading";
import FeedbackErro from "@/shared/components/feedback/FeedbackErro";
import { EmptyState } from "@/shared/components/feedback/EmptyState";
import { ROTULOS_PERFIS } from "@/shared/constants/perfis";
import { cn } from "@/shared/lib/utils";
import type { UsuarioItem } from "../types/gestaoUsuarios";
import type { ListaUsuariosProps } from "../types/gestaoUsuariosUI";

const BADGE_PERFIL: Record<UsuarioItem["perfil"], string> = {
  Administrador: "bg-accent-light text-accent",
  Engenharia: "bg-info-light text-info",
  Financeiro: "bg-success-light text-success",
  InstaladorCampo: "bg-muted text-foreground-secondary",
};

function iniciaisUsuario(nome: string): string {
  const partes = nome.trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return "US";
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
  return `${partes[0][0]}${partes[partes.length - 1][0]}`.toUpperCase();
}

function StatusIndicador({ ativo }: { ativo: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-[11px] font-medium shrink-0", ativo ? "text-success" : "text-muted-foreground")}>
      <span className={cn("w-1.5 h-1.5 rounded-full", ativo ? "bg-success" : "bg-border-strong")} aria-hidden="true" />
      {ativo ? "Ativo" : "Inativo"}
    </span>
  );
}

function BotoesLinha({
  usuario,
  proprio,
  compacto = false,
  aoEditar,
  aoStatus,
}: {
  usuario: UsuarioItem;
  proprio: boolean;
  compacto?: boolean;
  aoEditar: (u: UsuarioItem, origem: HTMLButtonElement) => void;
  aoStatus: (u: UsuarioItem, origem: HTMLButtonElement) => void;
}) {
  const acaoStatus = usuario.ativo ? "Inativar" : "Reativar";
  return (
    <div className="inline-flex items-center justify-end gap-1.5 shrink-0">
      <Button
        size="sm"
        variant="outline"
        aria-label={`Editar ${usuario.nome}`}
        className={cn("controle-compacto h-7 py-0 text-[11px] font-medium", compacto ? "px-2" : "px-2.5")}
        onClick={e => aoEditar(usuario, e.currentTarget)}
      >
        Editar
      </Button>
      <Button
        size="sm"
        variant="outline"
        disabled={proprio}
        title={proprio ? "Você não pode inativar a própria conta" : undefined}
        aria-label={`${acaoStatus} ${usuario.nome}`}
        className={cn(
          "controle-compacto h-7 py-0 text-[11px] font-medium",
          compacto ? "px-2" : "px-2.5",
          usuario.ativo ? "text-destructive hover:text-destructive" : "text-info hover:text-info"
        )}
        onClick={e => aoStatus(usuario, e.currentTarget)}
      >
        {acaoStatus}
      </Button>
    </div>
  );
}

export function ListaUsuarios({ lista, filtros, filtrado, usuarioId, aoLimpar, aoPagina, aoEditar, aoStatus }: ListaUsuariosProps) {
  if (lista.isPending) return <FeedbackLoading mensagem="Carregando usuários..." />;
  if (lista.isError) {
    return <FeedbackErro mensagem="Não foi possível atualizar a lista de usuários." onTentarNovamente={() => void lista.refetch()} />;
  }
  if (!lista.data.itens.length) {
    return (
      <EmptyState
        titulo={filtrado ? "Nenhum usuário encontrado para os filtros." : "Nenhum usuário ativo."}
        acao={filtrado ? { label: "Limpar filtros", onClick: aoLimpar } : undefined}
      />
    );
  }

  const total = lista.data.total;
  const totalPaginas = Math.max(1, Math.ceil(total / filtros.pageSize));
  const inicio = (filtros.page - 1) * filtros.pageSize + 1;
  const fim = Math.min(inicio - 1 + lista.data.itens.length, total);

  return (
    <>
      <section className="rounded-xl border border-border-subtle bg-surface overflow-hidden">
        <div
          className="hidden lg:block overflow-x-auto"
          tabIndex={0}
          role="region"
          aria-labelledby="usuarios-tabela-caption"
        >
          <table className="w-full text-xs text-left">
            <caption id="usuarios-tabela-caption" className="sr-only">Usuários cadastrados</caption>
            <thead className="bg-surface-subtle text-muted-foreground border-b border-border-subtle">
              <tr>
                <th scope="col" className="px-4 py-2.5 font-semibold">Usuário</th>
                <th scope="col" className="px-3 py-2.5 font-semibold w-44">Perfil</th>
                <th scope="col" className="px-3 py-2.5 font-semibold w-44">Equipe</th>
                <th scope="col" className="px-3 py-2.5 font-semibold w-28">Status</th>
                <th scope="col" className="px-4 py-2.5 font-semibold text-right w-40">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle">
              {lista.data.itens.map(u => {
                const proprio = u.id === usuarioId;
                return (
                  <tr key={u.id} className="hover:bg-surface-subtle transition-colors">
                    <th scope="row" className="px-4 py-2.5 font-normal">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="w-7 h-7 rounded-full bg-muted text-foreground flex items-center justify-center text-[11px] font-semibold shrink-0" aria-hidden="true">
                          {iniciaisUsuario(u.nome)}
                        </span>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold text-foreground truncate">{u.nome}</span>
                            {proprio && (
                              <span className="rounded-full bg-info-light px-1.5 py-0.5 text-[10px] font-semibold text-info shrink-0">
                                Você
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-muted-foreground truncate">{u.email}</p>
                        </div>
                      </div>
                    </th>
                    <td className="px-3 py-2.5">
                      <span className={cn("inline-block rounded-full px-2 py-0.5 text-[11px] font-medium", BADGE_PERFIL[u.perfil])}>
                        {ROTULOS_PERFIS[u.perfil]}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-foreground-muted truncate">{u.equipeNome ?? "—"}</td>
                    <td className="px-3 py-2.5"><StatusIndicador ativo={u.ativo} /></td>
                    <td className="px-4 py-2.5 text-right">
                      <BotoesLinha usuario={u} proprio={proprio} aoEditar={aoEditar} aoStatus={aoStatus} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <ul aria-label="Lista de usuários" className="lg:hidden divide-y divide-border-subtle">
          {lista.data.itens.map(u => {
            const proprio = u.id === usuarioId;
            return (
              <li key={u.id} className="p-3 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-7 h-7 rounded-full bg-muted text-foreground flex items-center justify-center text-[11px] font-semibold shrink-0" aria-hidden="true">
                      {iniciaisUsuario(u.nome)}
                    </span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-semibold text-foreground truncate">{u.nome}</span>
                        {proprio && (
                          <span className="rounded-full bg-info-light px-1.5 text-[10px] font-semibold text-info shrink-0">
                            Você
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-muted-foreground truncate">{u.email}</p>
                    </div>
                  </div>
                  <StatusIndicador ativo={u.ativo} />
                </div>

                <div className="flex items-center justify-between gap-2 pt-0.5">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-medium shrink-0", BADGE_PERFIL[u.perfil])}>
                      {ROTULOS_PERFIS[u.perfil]}
                    </span>
                    {u.equipeNome && (
                      <span className="text-[11px] text-muted-foreground truncate">· {u.equipeNome}</span>
                    )}
                  </div>
                  <BotoesLinha usuario={u} proprio={proprio} compacto aoEditar={aoEditar} aoStatus={aoStatus} />
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      <nav aria-label="Paginação de usuários" className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
        <span className="tabular-nums">Mostrando {inicio}–{fim} de {total} {total === 1 ? "usuário" : "usuários"}</span>
        <div className="flex items-center gap-1.5">
          <Button
            size="sm"
            variant="outline"
            className="controle-compacto h-7 py-0 px-2.5 text-xs font-medium"
            disabled={filtros.page <= 1 || lista.isFetching}
            onClick={() => aoPagina(filtros.page - 1)}
          >
            Anterior
          </Button>
          <span className="px-1.5 text-[11px] font-semibold tabular-nums text-foreground">
            {filtros.page}/{totalPaginas}
          </span>
          <Button
            size="sm"
            variant="outline"
            className="controle-compacto h-7 py-0 px-2.5 text-xs font-medium"
            disabled={filtros.page * filtros.pageSize >= total || lista.isFetching}
            onClick={() => aoPagina(filtros.page + 1)}
          >
            Próxima
          </Button>
        </div>
      </nav>
    </>
  );
}
