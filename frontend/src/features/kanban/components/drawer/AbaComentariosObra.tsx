import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { useAuthStore } from "@/shared/stores/useAuthStore";
import { capturarSessaoOperacional, deveExibirErroLocal, sessaoOperacionalVigente } from "@/shared/lib/sessaoOperacao";
import { Button } from "@/shared/components/ui/Button";
import { IconActionButton } from "@/shared/components/ui/IconActionButton";
import { AvatarIniciais } from "@/shared/components/ui/AvatarIniciais";
import { ConfirmDialog } from "@/shared/components/feedback/ConfirmDialog";
import FeedbackLoading from "@/shared/components/feedback/FeedbackLoading";
import FeedbackErro from "@/shared/components/feedback/FeedbackErro";
import { EmptyState } from "@/shared/components/feedback/EmptyState";
import { formatarDataBR } from "@/shared/lib/formatters";
import { cn } from "@/shared/lib/utils";
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
  const seletorFiltro = (
    <select
      ref={filtroRef}
      id={`${id}-tipo`}
      aria-label="Filtrar tipo de comentário"
      value={filtro}
      disabled={Boolean(edicao) || isEnviandoComentario}
      onChange={e => setFiltro(e.target.value as TipoComentario | "todos")}
      className="controle-compacto h-8 w-auto rounded-lg border border-border-strong bg-surface-subtle focus:bg-surface px-2.5 text-xs text-foreground"
    >
      <option value="todos">Todos os comentários</option>
      {TIPOS_COMENTARIO.map(t => <option key={t} value={t}>{ROTULOS_COMENTARIO[t]}</option>)}
    </select>
  );
  const visiveis = comentarios.filter(c => filtro === "todos" || (c.tipo ?? "Cartao") === filtro);
  if (carregandoComentarios) return <FeedbackLoading mensagem="Carregando comentários..." />;
  if (erroComentarios) return <FeedbackErro mensagem={erroComentarios.message} onTentarNovamente={onRecarregarComentarios} />;
  return <div className="space-y-4">
    {podeComentar && onAdicionarComentario ? (
      <form className="space-y-2.5" onSubmit={e => {
        e.preventDefault();
        if (texto.trim()) void executar(() => onAdicionarComentario(obraId, texto.trim(), tipoNovo), () => setTexto(""));
      }}>
        <label htmlFor={`${id}-novo`} className="block text-xs font-semibold text-foreground-secondary">
          {tipoNovo === "Timeline" ? "Comentário na linha do tempo" : "Adicionar nota interna sobre a obra"}
        </label>
        <textarea
          id={`${id}-novo`}
          value={texto}
          onChange={e => setTexto(e.target.value)}
          required
          rows={3}
          disabled={isEnviandoComentario}
          placeholder="Escreva um comentário ou atualização para a equipe..."
          className="w-full rounded-lg border border-border-strong bg-surface-subtle focus:bg-surface p-2.5 text-xs text-foreground placeholder:text-muted-foreground"
        />
        <div className="flex flex-wrap items-center justify-between gap-2">
          {seletorFiltro}
          <Button type="submit" size="sm" disabled={!texto.trim() || isEnviandoComentario} className="controle-compacto h-8 px-3.5">
            Enviar comentário
          </Button>
        </div>
      </form>
    ) : (
      <div className="flex items-center justify-between gap-2">
        <label htmlFor={`${id}-tipo`} className="text-xs font-semibold text-foreground-secondary">Tipo de comentário</label>
        {seletorFiltro}
      </div>
    )}
    {erro && !exclusao && <p role="alert" className="text-xs text-destructive">{erro}</p>}
    {sucesso && <p role="status" className="text-xs text-success">{sucesso}</p>}
    {visiveis.length === 0 ? <EmptyState titulo="Nenhum comentário encontrado" descricao="Os comentários deste tipo aparecerão aqui." /> :
      <ul className="space-y-2.5">{visiveis.map((c, idx) => {
        const tipo = c.tipo ?? "Cartao";
        const classeTipoBadge = tipo === "Timeline"
          ? "bg-info-light text-info"
          : tipo === "Manutencao"
            ? "bg-warning-light text-warning"
            : "bg-surface text-foreground-muted";
        return <li key={c.id} className={cn("rounded-xl p-3.5 space-y-2 text-xs", idx % 2 === 0 ? "bg-surface-subtle" : "bg-muted")}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <AvatarIniciais nome={c.usuarioNome} size="xs" tone="primary" />
              <span className="font-semibold text-foreground truncate">{c.usuarioNome}</span>
              <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-semibold shrink-0", classeTipoBadge)}>
                {ROTULOS_COMENTARIO[tipo]}
              </span>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <time dateTime={c.dataHora} className="text-[11px] text-muted-foreground tabular-nums mr-1">{formatarDataBR(c.dataHora)}</time>
              {administrador && !edicao && <>
                {onEditarComentario && (
                  <IconActionButton
                    size="sm"
                    disabled={isEnviandoComentario}
                    title="Editar comentário"
                    label={`Editar comentário de ${c.usuarioNome}`}
                    onClick={() => { setEdicao(c); setTextoEdicao(c.texto); setErro(""); }}
                    className="hover:bg-surface"
                  >
                    <Pencil className="w-3.5 h-3.5" aria-hidden="true" />
                  </IconActionButton>
                )}
                {onExcluirComentario && (
                  <IconActionButton
                    size="sm"
                    tone="destructive"
                    disabled={isEnviandoComentario}
                    title="Excluir comentário"
                    label={`Excluir comentário de ${c.usuarioNome}`}
                    onClick={e => { origemFoco.current = e.currentTarget; setExclusao(c); setErro(""); }}
                  >
                    <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                  </IconActionButton>
                )}
              </>}
            </div>
          </div>
          {edicao?.id === c.id ? <form className="space-y-2 pt-1" onSubmit={e => {
            e.preventDefault();
            if (administrador && textoEdicao.trim() && onEditarComentario) void executar(() => onEditarComentario(c.id, textoEdicao.trim()), () => setEdicao(null));
          }}>
            <label htmlFor={`${id}-editar-${c.id}`} className="block text-xs font-medium text-foreground-secondary">Editar comentário</label>
            <textarea id={`${id}-editar-${c.id}`} autoFocus required rows={3} value={textoEdicao} onChange={e => setTextoEdicao(e.target.value)} disabled={isEnviandoComentario}
              className="w-full rounded-lg border border-border-strong bg-surface p-2.5 text-xs text-foreground" />
            <div className="flex items-center justify-end gap-1.5">
              <Button type="button" size="sm" variant="outline" disabled={isEnviandoComentario} onClick={() => setEdicao(null)} className="controle-compacto h-8 px-3">Cancelar</Button>
              <Button type="submit" size="sm" disabled={isEnviandoComentario || !textoEdicao.trim()} className="controle-compacto h-8 px-3.5">Salvar</Button>
            </div>
          </form> : <p className="text-xs text-foreground-secondary leading-relaxed whitespace-pre-wrap wrap-anywhere">{c.texto}</p>}
        </li>;
      })}</ul>}
    <ConfirmDialog isOpen={Boolean(exclusao)} titulo="Excluir comentário" descricao="O comentário será excluído. Os registros do histórico da obra serão preservados."
      labelConfirmar="Excluir comentário" origemFoco={origemFoco} isLoading={isEnviandoComentario}
      conteudo={erro ? <p role="alert" className="text-sm text-destructive">{erro}</p> : undefined}
      onClose={() => { if (!isEnviandoComentario) { setExclusao(null); setErro(""); } }}
      onConfirm={() => { if (administrador && exclusao && onExcluirComentario) void executar(() => onExcluirComentario(exclusao.id), () => { retornarAoFiltro.current = true; setExclusao(null); }); }} />
  </div>;
}
