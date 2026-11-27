import { Pencil, Power } from "lucide-react";
import { Button } from "@/shared/components/ui/Button";
import { AvatarIniciais } from "@/shared/components/ui/AvatarIniciais";
import { Badge, type BadgeVariante } from "@/shared/components/ui/Badge";
import { IconActionButton } from "@/shared/components/ui/IconActionButton";
import FeedbackLoading from "@/shared/components/feedback/FeedbackLoading";
import FeedbackErro from "@/shared/components/feedback/FeedbackErro";
import { EmptyState } from "@/shared/components/feedback/EmptyState";
import { ROTULOS_PERFIS } from "@/shared/constants/perfis";
import { cn } from "@/shared/lib/utils";
import type { UsuarioItem } from "../types/gestaoUsuarios";
import type { ListaUsuariosProps } from "../types/gestaoUsuariosUI";

const VARIANTE_PERFIL: Record<UsuarioItem["perfil"], BadgeVariante> = {
  Administrador: "accent",
  Engenharia: "info",
  Financeiro: "success",
  InstaladorCampo: "neutral",
};

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
  aoEditar,
  aoStatus,
}: {
  usuario: UsuarioItem;
  proprio: boolean;
  aoEditar: (u: UsuarioItem, origem: HTMLButtonElement) => void;
  aoStatus: (u: UsuarioItem, origem: HTMLButtonElement) => void;
}) {
  const acaoStatus = usuario.ativo ? "Inativar" : "Reativar";
  return (
    <div className="inline-flex items-center justify-end gap-1 shrink-0">
      <IconActionButton
        size="sm"
        label={`Editar ${usuario.nome}`}
        title="Editar"
        onClick={e => aoEditar(usuario, e.currentTarget)}
      >
        <Pencil className="w-3.5 h-3.5" aria-hidden="true" />
      </IconActionButton>
      <IconActionButton
        size="sm"
        tone={usuario.ativo ? "destructive" : "neutral"}
        disabled={proprio}
        title={proprio ? "Você não pode inativar a própria conta" : acaoStatus}
        label={`${acaoStatus} ${usuario.nome}`}
        className={!usuario.ativo ? "hover:text-info hover:bg-info-light" : undefined}
        onClick={e => aoStatus(usuario, e.currentTarget)}
      >
        <Power className="w-3.5 h-3.5" aria-hidden="true" />
      </IconActionButton>
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
                        <AvatarIniciais nome={u.nome} fallback="US" size="sm" tone="muted" className="text-[11px]" />
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold text-foreground truncate">{u.nome}</span>
                            {proprio && (
                              <Badge variante="info" tamanho="xs">
                                Você
                              </Badge>
                            )}
                          </div>
                          <p className="text-[11px] text-muted-foreground truncate">{u.email}</p>
                        </div>
                      </div>
                    </th>
                    <td className="px-3 py-2.5">
                      <Badge variante={VARIANTE_PERFIL[u.perfil]} tamanho="sm" className="font-medium">
                        {ROTULOS_PERFIS[u.perfil]}
                      </Badge>
                    </td>
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
                    <AvatarIniciais nome={u.nome} fallback="US" size="sm" tone="muted" className="text-[11px]" />
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-semibold text-foreground truncate">{u.nome}</span>
                        {proprio && (
                          <Badge variante="info" tamanho="xs">
                            Você
                          </Badge>
                        )}
                      </div>
                      <p className="text-[11px] text-muted-foreground truncate">{u.email}</p>
                    </div>
                  </div>
                  <StatusIndicador ativo={u.ativo} />
                </div>

                <div className="flex items-center justify-between gap-2 pt-0.5">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <Badge variante={VARIANTE_PERFIL[u.perfil]} tamanho="xs" className="font-medium">
                      {ROTULOS_PERFIS[u.perfil]}
                    </Badge>
                  </div>
                  <BotoesLinha usuario={u} proprio={proprio} aoEditar={aoEditar} aoStatus={aoStatus} />
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
