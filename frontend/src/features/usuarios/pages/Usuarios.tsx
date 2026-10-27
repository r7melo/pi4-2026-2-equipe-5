import { useEffect, useRef, useState } from "react";
import { PageHeader } from "@/shared/components/ui/PageHeader";
import { Button } from "@/shared/components/ui/Button";
import { Modal } from "@/shared/components/ui/Modal";
import FeedbackLoading from "@/shared/components/feedback/FeedbackLoading";
import FeedbackErro from "@/shared/components/feedback/FeedbackErro";
import { EmptyState } from "@/shared/components/feedback/EmptyState";
import { useListaUsuarios, usePerdaPermissao } from "../hooks/useGestaoUsuarios";
import { PERFIS_GESTAO } from "../types/gestaoUsuarios";
import type { UsuariosProps, UsuarioItem, FiltrosUsuarios } from "../types/gestaoUsuarios";
import FormularioCadastrarUsuario from "../components/FormularioCadastrarUsuario";
import { EditorUsuario } from "../components/EditorUsuario";
import { ConfirmarStatusUsuario } from "../components/ConfirmarStatusUsuario";
export default function Usuarios({ usuarioId }: UsuariosProps) {
  const [busca, setBusca] = useState("");
  const [filtros, setFiltros] = useState<FiltrosUsuarios>({ page: 1, pageSize: 20, busca: "", ativo: "true" });
  const [editor, setEditor] = useState<UsuarioItem | null>(null);
  const [status, setStatus] = useState<UsuarioItem | null>(null);
  const [cadastro, setCadastro] = useState(false); const [ocupado, setOcupado] = useState(false);
  const origem = useRef<HTMLElement | null>(null); const novo = useRef<HTMLButtonElement>(null);
  const lista = useListaUsuarios(filtros);
  useEffect(() => { const t = setTimeout(() => setFiltros(f => f.busca === busca.trim() ? f : { ...f, busca: busca.trim(), page: 1 }), 300); return () => clearTimeout(t); }, [busca]);
  useEffect(() => {
    if (!lista.data || lista.data.itens.length || filtros.page === 1) return;
    const page = Math.max(1, Math.ceil(lista.data.total / filtros.pageSize));
    if (page < filtros.page) { const frame = requestAnimationFrame(() => setFiltros(f => ({ ...f, page }))); return () => cancelAnimationFrame(frame); }
  }, [lista.data, filtros.page, filtros.pageSize]);
  useEffect(() => {
    if (!lista.data) return;
    const frame = requestAnimationFrame(() => {
      if (!editor && !status && !cadastro && origem.current && !origem.current.isConnected && document.activeElement === document.body) novo.current?.focus();
    });
    return () => cancelAnimationFrame(frame);
  }, [lista.data, editor, status, cadastro]);
  function fechar() {
    setEditor(null); setStatus(null); setCadastro(false); setOcupado(false);
    requestAnimationFrame(() => { if (!document.querySelector('[role="dialog"][aria-labelledby]')) (origem.current?.isConnected ? origem.current : novo.current)?.focus(); });
  }
  usePerdaPermissao(lista.error, fechar);
  function concluido() { fechar(); void lista.refetch(); }
  function limpar() { setBusca(""); setFiltros({ page: 1, pageSize: 20, busca: "", ativo: "true" }); }
  const filtrado = !!(busca || filtros.perfil || filtros.ativo !== "true");
  return <div className="flex-1 flex flex-col h-full min-w-0 overflow-hidden">
    <PageHeader title="Gestão de usuários" ><Button ref={novo} onClick={e => { origem.current = e.currentTarget; setCadastro(true); }}>Novo usuário</Button></PageHeader>
    <div className="flex-1 min-w-0 overflow-y-auto p-4 md:p-6 bg-background-app space-y-4">
      <div className="flex flex-wrap items-end gap-3 text-sm">
        <label className="grow min-w-0">Buscar por nome ou e-mail<input value={busca} maxLength={200} onChange={e => setBusca(e.target.value)} className="block w-full p-2 bg-surface border border-border-subtle rounded-lg" /></label>
        <label>Perfil<select value={filtros.perfil ?? ""} onChange={e => setFiltros(f => ({ ...f, page: 1, perfil: e.target.value ? e.target.value as UsuarioItem["perfil"] : undefined }))} className="block p-2 bg-surface border border-border-subtle rounded-lg"><option value="">Todos os perfis</option>{PERFIS_GESTAO.map(p => <option key={p} value={p}>{p === "InstaladorCampo" ? "Instalador de Campo" : p}</option>)}</select></label>
        <label>Status<select value={filtros.ativo} onChange={e => setFiltros(f => ({ ...f, page: 1, ativo: e.target.value as FiltrosUsuarios["ativo"] }))} className="block p-2 bg-surface border border-border-subtle rounded-lg"><option value="true">Ativos</option><option value="false">Inativos</option><option value="todos">Todos</option></select></label>
        {filtrado && <Button variant="outline" onClick={limpar}>Limpar filtros</Button>}
      </div>
      {lista.isPending ? <FeedbackLoading mensagem="Carregando usuários..." /> : lista.isError ? <FeedbackErro mensagem="Não foi possível atualizar a lista de usuários." onTentarNovamente={() => void lista.refetch()} /> : !lista.data.itens.length ? <EmptyState titulo={filtrado ? "Nenhum usuário encontrado para os filtros." : "Nenhum usuário ativo."} acao={filtrado ? { label: "Limpar filtros", onClick: limpar } : undefined} /> : <>
        <div className="overflow-x-auto rounded-lg border border-border-subtle bg-surface"><table className="w-full min-w-[800px] table-fixed text-sm text-left"><caption className="sr-only">Usuários cadastrados</caption><thead><tr>{["Nome", "E-mail", "Perfil", "Equipe", "Status", "Ações"].map(t => <th scope="col" key={t} className={"p-3 font-medium text-muted-foreground" + (t === "Nome" ? " sticky left-0 bg-surface w-40" : t === "Ações" ? " w-48" : "")}>{t}</th>)}</tr></thead><tbody>{lista.data.itens.map(u => <tr key={u.id} className="border-t border-border-subtle">
          <td className="sticky left-0 bg-surface p-3 break-all">{u.nome}</td><td className="p-3 break-all">{u.email}</td><td className="p-3">{u.perfil === "InstaladorCampo" ? "Instalador de Campo" : u.perfil}</td><td className="p-3">{u.equipeNome ?? "-"}</td><td className="p-3"><span className={u.ativo ? "text-success" : "text-muted-foreground"}>{u.ativo ? "Ativo" : "Inativo"}</span></td><td className="p-3"><div className="flex gap-2"><Button size="sm" variant="outline" onClick={e => { origem.current = e.currentTarget; setEditor(u); }}>Editar</Button><Button size="sm" variant="outline" disabled={u.id === usuarioId} title={u.id === usuarioId ? "Você não pode inativar a própria conta" : undefined} onClick={e => { origem.current = e.currentTarget; setStatus(u); }}>{u.ativo ? "Inativar" : "Reativar"}</Button></div>{u.id === usuarioId && <p className="text-xs text-muted-foreground">Você não pode inativar a própria conta</p>}</td>
        </tr>)}</tbody></table></div>
        <nav aria-label="Paginação de usuários" className="flex flex-wrap gap-3 items-center text-sm"><span>{lista.data.total} usuários · Página {filtros.page}</span><Button variant="outline" disabled={filtros.page <= 1 || lista.isFetching} onClick={() => setFiltros(f => ({ ...f, page: f.page-1 }))}>Anterior</Button><Button variant="outline" disabled={filtros.page * filtros.pageSize >= lista.data.total || lista.isFetching} onClick={() => setFiltros(f => ({ ...f, page: f.page+1 }))}>Próxima</Button></nav>
      </>}
    </div>
    {cadastro && <Modal isOpen titulo="Cadastrar usuário" onClose={fechar} fecharBloqueado={ocupado} gerenciarFoco className="max-h-[90dvh] overflow-y-auto"><FormularioCadastrarUsuario onConcluido={concluido} onSemPermissao={fechar} onOcupado={setOcupado} /></Modal>}
    {editor && <EditorUsuario usuario={editor} proprio={editor.id === usuarioId} onFechar={fechar} onConcluido={concluido} />}
    {status && <ConfirmarStatusUsuario usuario={status} onFechar={fechar} onConcluido={concluido} />}
  </div>;
}
