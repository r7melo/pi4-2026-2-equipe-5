import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { useAuthStore } from "@/shared/stores/useAuthStore";
import { capturarSessaoOperacional, deveExibirErroLocal, sessaoOperacionalVigente } from "@/shared/lib/sessaoOperacao";
import { Button } from "@/shared/components/ui/Button";
import { ConfirmDialog } from "@/shared/components/feedback/ConfirmDialog";
import FeedbackLoading from "@/shared/components/feedback/FeedbackLoading";
import FeedbackErro from "@/shared/components/feedback/FeedbackErro";
import { EmptyState } from "@/shared/components/feedback/EmptyState";
import { formatarDataBR } from "@/shared/lib/formatters";
import { TIPOS_COMENTARIO, ROTULOS_COMENTARIO, type TipoComentario } from "../../types/comentarios";
import type { ComentarioItemKanban, ComentariosObraProps } from "../../types/gavetaKanban";

const COMENTARIOS_VAZIOS: ComentarioItemKanban[] = [];

export function AbaComentariosObra({ obraId, comentarios = COMENTARIOS_VAZIOS, carregandoComentarios = false,
  onAdicionarComentario, onEditarComentario, onExcluirComentario, isEnviandoComentario = false,
  erroComentarios, onRecarregarComentarios }: ComentariosObraProps) {
  const id = useId();
  const perfil = useAuthStore(s => s.usuario?.perfil.nomePerfil);
  const administrador = perfil === "Administrador";
  const podeComentar = administrador || perfil === "Engenharia" || perfil === "Financeiro";
  const tipoNovo: TipoComentario = perfil === "Financeiro" ? "Timeline" : "Cartao";
  const [filtro, setFiltro] = useState<TipoComentario | "todos">("todos");
  const [texto, setTexto] = useState("");
  const [edicao, setEdicao] = useState<ComentarioItemKanban | null>(null);
  const [textoEdicao, setTextoEdicao] = useState("");
  const [exclusao, setExclusao] = useState<ComentarioItemKanban | null>(null);
  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState("");
  const origemFoco = useRef<HTMLElement | null>(null);
  const filtroRef = useRef<HTMLSelectElement | null>(null);
  const retornarAoFiltro = useRef(false);
  const montado = useRef(true);
  const trava = useRef(false);
  useEffect(() => { montado.current = true; return () => { montado.current = false; }; }, []);
  useLayoutEffect(() => {
    if (!exclusao && retornarAoFiltro.current) {
      retornarAoFiltro.current = false;
      filtroRef.current?.focus();
    }
  }, [exclusao]);
  async function executar(acao: () => Promise<void>, concluir: () => void) {
    if (trava.current || isEnviandoComentario) return;
    trava.current = true;
    const sessao = capturarSessaoOperacional();
    setErro(""); setSucesso("");
    try {
      await acao();
      if (montado.current && sessaoOperacionalVigente(sessao)) { concluir(); setSucesso("Comentário atualizado."); }
    } catch (falha) {
      if (montado.current && sessaoOperacionalVigente(sessao) && deveExibirErroLocal(falha)) setErro(falha instanceof Error ? falha.message : "Não foi possível confirmar a operação.");
    } finally { trava.current = false; }
  }
  const controle = "w-full rounded-md border border-border-strong bg-surface px-3 py-2 text-sm text-foreground";
  const visiveis = comentarios.filter(c => filtro === "todos" || (c.tipo ?? "Cartao") === filtro);
  if (carregandoComentarios) return <FeedbackLoading mensagem="Carregando comentários..." />;
  if (erroComentarios) return <FeedbackErro mensagem={erroComentarios.message} onTentarNovamente={onRecarregarComentarios} />;
  return <div className="space-y-4">
    {podeComentar && onAdicionarComentario && <form className="space-y-2" onSubmit={e => {
      e.preventDefault();
      if (texto.trim()) void executar(() => onAdicionarComentario(obraId, texto.trim(), tipoNovo), () => setTexto(""));
    }}>
      <label htmlFor={`${id}-novo`} className="block text-xs font-medium text-foreground-secondary">{tipoNovo === "Timeline" ? "Comentário na linha do tempo" : "Adicionar nota interna sobre a obra"}</label>
      <textarea id={`${id}-novo`} value={texto} onChange={e => setTexto(e.target.value)} required rows={3} disabled={isEnviandoComentario} className={controle} />
      <Button type="submit" size="sm" disabled={!texto.trim() || isEnviandoComentario}>Enviar comentário</Button>
    </form>}
    <div className="space-y-1"><label htmlFor={`${id}-tipo`} className="block text-xs font-medium text-foreground-secondary">Tipo de comentário</label>
      <select ref={filtroRef} id={`${id}-tipo`} value={filtro} disabled={Boolean(edicao) || isEnviandoComentario} onChange={e => setFiltro(e.target.value as TipoComentario | "todos")} className={controle}>
        <option value="todos">Todos os comentários</option>{TIPOS_COMENTARIO.map(t => <option key={t} value={t}>{ROTULOS_COMENTARIO[t]}</option>)}
      </select></div>
    {erro && !exclusao && <p role="alert" className="text-sm text-destructive">{erro}</p>}
    {sucesso && <p role="status" className="text-sm text-success">{sucesso}</p>}
    {visiveis.length === 0 ? <EmptyState titulo="Nenhum comentário encontrado" descricao="Os comentários deste tipo aparecerão aqui." /> :
      <ul className="space-y-3">{visiveis.map(c => <li key={c.id} className="rounded-lg border border-border-subtle bg-surface-subtle p-3 space-y-2">
        <div className="flex flex-wrap justify-between gap-2 text-xs text-muted-foreground"><span className="font-medium">{c.usuarioNome}</span><time dateTime={c.dataHora}>{formatarDataBR(c.dataHora)}</time></div>
        <p className="text-xs text-muted-foreground">{ROTULOS_COMENTARIO[c.tipo ?? "Cartao"]}</p>
        {edicao?.id === c.id ? <form className="space-y-2" onSubmit={e => {
          e.preventDefault();
          if (administrador && textoEdicao.trim() && onEditarComentario) void executar(() => onEditarComentario(c.id, textoEdicao.trim()), () => setEdicao(null));
        }}>
          <label htmlFor={`${id}-editar-${c.id}`} className="block text-xs font-medium">Editar comentário</label>
          <textarea id={`${id}-editar-${c.id}`} autoFocus required rows={3} value={textoEdicao} onChange={e => setTextoEdicao(e.target.value)} disabled={isEnviandoComentario} className={controle} />
          <div className="flex gap-2"><Button type="submit" size="sm" disabled={isEnviandoComentario || !textoEdicao.trim()}>Salvar comentário</Button><Button type="button" size="sm" variant="outline" disabled={isEnviandoComentario} onClick={() => setEdicao(null)}>Cancelar edição</Button></div>
        </form> : <p className="text-sm text-foreground whitespace-pre-wrap break-words">{c.texto}</p>}
        {administrador && !edicao && <div className="flex gap-2">
          {onEditarComentario && <Button type="button" variant="outline" size="sm" disabled={isEnviandoComentario} aria-label={`Editar comentário de ${c.usuarioNome}`} onClick={() => { setEdicao(c); setTextoEdicao(c.texto); setErro(""); }}>Editar</Button>}
          {onExcluirComentario && <Button type="button" variant="outline" size="sm" disabled={isEnviandoComentario} aria-label={`Excluir comentário de ${c.usuarioNome}`} className="text-destructive" onClick={e => { origemFoco.current = e.currentTarget; setExclusao(c); setErro(""); }}>Excluir</Button>}
        </div>}
      </li>)}</ul>}
    <ConfirmDialog isOpen={Boolean(exclusao)} titulo="Excluir comentário" descricao="O comentário será excluído. Os registros do histórico da obra serão preservados."
      labelConfirmar="Excluir comentário" origemFoco={origemFoco} isLoading={isEnviandoComentario}
      conteudo={erro ? <p role="alert" className="text-sm text-destructive">{erro}</p> : undefined}
      onClose={() => { if (!isEnviandoComentario) { setExclusao(null); setErro(""); } }}
      onConfirm={() => { if (administrador && exclusao && onExcluirComentario) void executar(() => onExcluirComentario(exclusao.id), () => { retornarAoFiltro.current = true; setExclusao(null); }); }} />
  </div>;
}
