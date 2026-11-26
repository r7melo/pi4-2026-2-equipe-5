import { useRef, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import {
  useObraDetalhe,
  useHistoricoObra,
  useComentariosObra,
  useAdicionarComentario,
  useEditarComentario,
  useExcluirComentario,
  useExcluirObraDetalhe,
} from "@/features/obras/hooks/useObraDetalhe";
import { useAuthStore } from "@/shared/stores/useAuthStore";
import { PageHeader } from "@/shared/components/ui/PageHeader";
import { Button } from "@/shared/components/ui/Button";
import { Badge } from "@/shared/components/ui/Badge";
import { AvatarIniciais } from "@/shared/components/ui/AvatarIniciais";
import { IconActionButton } from "@/shared/components/ui/IconActionButton";
import FeedbackLoading from "@/shared/components/feedback/FeedbackLoading";
import FeedbackErro from "@/shared/components/feedback/FeedbackErro";
import { EmptyState } from "@/shared/components/feedback/EmptyState";
import { ConfirmDialog } from "@/shared/components/feedback/ConfirmDialog";
import { ModalEditarObra } from "../components/ModalEditarObra";
import { ExportarDetalhesInstalacao } from "../components/ExportarDetalhesInstalacao";
import type { ComentarioObra } from "../types/obras";
import { COLUNAS_KANBAN } from "@/shared/constants/kanbanStatus";
import { descreverEventoHistorico, montarTimelineCronologica } from "../lib/timelineObra";
import {
  Calendar,
  MapPin,
  CreditCard,
  Send,
  Clock,
  MessageSquare,
  Package,
  Zap,
  FileQuestion,
  Edit3,
  Trash2,
  Pencil,
  Check,
  X,
} from "lucide-react";
import { formatarDataBR } from "@/shared/lib/formatters";

function formatarDataHoraEvento(iso?: string | null): string {
  if (!iso) return "—";
  const dt = new Date(iso);
  if (Number.isNaN(dt.getTime())) return "—";
  const data = new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(dt);
  const hora = new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(dt);
  return `${data} às ${hora}`;
}

export default function DetalheObra() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const obraId = Number(id);

  const perfil = useAuthStore((s) => s.usuario?.perfil?.nomePerfil);
  const podeEditarObra = perfil === "Administrador" || perfil === "Engenharia";
  const podeExportarInstalacao = perfil === "Administrador";
  const podeGerenciarComentarios = perfil === "Administrador";
  const podeVerFaturamento = perfil === "Administrador" || perfil === "Financeiro";

  const stateFrom = location.state as { from?: string; selectedObraId?: number } | null;
  const paginaOrigem = stateFrom?.from ?? "/kanban";
  const backState = paginaOrigem === "/financeiro" ? { selectedObraId: obraId } : undefined;

  const { data: obra, isLoading: loadingObra, isError: errorObra, error, refetch } = useObraDetalhe(obraId);
  const { data: historico, isLoading: loadingHist } = useHistoricoObra(obraId);
  const { data: comentarios, isLoading: loadingComent } = useComentariosObra(obraId);
  const addComentario = useAdicionarComentario();
  const editarComentarioMutation = useEditarComentario();
  const excluirComentarioMutation = useExcluirComentario();
  const excluirObraMutation = useExcluirObraDetalhe();

  const [novoComentario, setNovoComentario] = useState("");
  const [modalEditarAberto, setModalEditarAberto] = useState(false);
  const [confirmExcluirObraAberto, setConfirmExcluirObraAberto] = useState(false);

  const [comentarioEmEdicaoId, setComentarioEmEdicaoId] = useState<number | null>(null);
  const [textoEdicaoComentario, setTextoEdicaoComentario] = useState("");
  const [comentarioParaExcluir, setComentarioParaExcluir] = useState<ComentarioObra | null>(null);
  const salvandoComentarioRef = useRef(false);

  const handleComentar = (e: React.FormEvent) => {
    e.preventDefault();
    if (!novoComentario.trim() || addComentario.isPending) return;
    addComentario.mutate(
      { obraId, descricao: novoComentario.trim() },
      {
        onSuccess: () => setNovoComentario(""),
      }
    );
  };

  const iniciarEdicaoComentario = (comentario: ComentarioObra) => {
    setComentarioEmEdicaoId(comentario.id);
    setTextoEdicaoComentario(comentario.descricao);
  };

  const salvarEdicaoComentario = async (comentarioId: number) => {
    const limpo = textoEdicaoComentario.trim();
    if (!limpo || editarComentarioMutation.isPending || salvandoComentarioRef.current) return;
    salvandoComentarioRef.current = true;
    try {
      await editarComentarioMutation.mutateAsync({
        id: comentarioId,
        obraId,
        descricao: limpo,
      });
      setComentarioEmEdicaoId(null);
      setTextoEdicaoComentario("");
    } catch {
      // O hook useEditarComentario já exibe o toast de erro tratado
    } finally {
      salvandoComentarioRef.current = false;
    }
  };

  const confirmarExclusaoComentario = async () => {
    if (!comentarioParaExcluir || excluirComentarioMutation.isPending) return;
    try {
      await excluirComentarioMutation.mutateAsync({
        id: comentarioParaExcluir.id,
        obraId,
      });
      setComentarioParaExcluir(null);
    } catch {
      // O hook useExcluirComentario já exibe o toast de erro tratado
    }
  };

  const confirmarExclusaoObra = async () => {
    if (!obra || excluirObraMutation.isPending) return;
    try {
      await excluirObraMutation.mutateAsync(obra.id);
      setConfirmExcluirObraAberto(false);
      void navigate("/kanban", { replace: true });
    } catch {
      // O hook useExcluirObraDetalhe já exibe o toast de erro tratado
    }
  };

  const clienteNome = obra?.cliente?.nome || "Cliente sem identificação";
  const obraEmAndamento = obra?.status === "EmAndamento";
  const rotuloStatus = obra
    ? COLUNAS_KANBAN.find((c) => c.id === obra.status)?.label ?? obra.status
    : "";
  const tituloHeader = !loadingObra && !errorObra && obra ? `Obra: ${clienteNome}` : "Detalhes da Obra";
  const subtituloHeader = loadingObra
    ? "Consultando informações no servidor..."
    : errorObra
      ? "Falha de conexão"
      : !obra
        ? "Obra não encontrada"
        : `${obra.categoria || "Residencial"} · ${obra.cliente?.cidade || "Cidade não informada"} · ${rotuloStatus}`;
  const eventosTimeline = montarTimelineCronologica(comentarios, historico);

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-background-app">
      <PageHeader
        title={tituloHeader}
        subtitle={subtituloHeader}
        backTo={paginaOrigem}
        backState={backState}
      >
        {!loadingObra && !errorObra && obra ? (
          <div className="flex items-center gap-1.5">
            {podeExportarInstalacao && (
              <ExportarDetalhesInstalacao
                obraId={obra.id}
                contextoValido={() => true}
              />
            )}

            {podeEditarObra && (
              <>
                <Button
                  variant="danger"
                  disabled={obraEmAndamento || excluirObraMutation.isPending}
                  onClick={() => setConfirmExcluirObraAberto(true)}
                  title={
                    obraEmAndamento
                      ? "Obras em execução não podem ser excluídas"
                      : "Excluir obra"
                  }
                  aria-label="Excluir obra"
                  className="controle-compacto h-7 px-2.5 text-xs font-medium flex items-center gap-1.5 border border-border-subtle"
                >
                  <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                  <span className="hidden sm:inline">Excluir</span>
                </Button>
                <Button
                  variant="primary"
                  onClick={() => setModalEditarAberto(true)}
                  className="controle-compacto h-7 px-2.5 text-xs font-medium flex items-center gap-1.5"
                >
                  <Edit3 className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Editar Obra</span>
                </Button>
              </>
            )}
          </div>
        ) : null}
      </PageHeader>

      {loadingObra ? (
        <FeedbackLoading mensagem="Carregando dados da obra e cliente no banco de dados..." />
      ) : errorObra ? (
        <FeedbackErro
          titulo="Falha ao carregar detalhes da obra"
          mensagem={error instanceof Error ? error.message : "Não foi possível buscar as informações da obra. Verifique se o servidor está ativo."}
          onTentarNovamente={() => { void refetch(); }}
        />
      ) : !obra ? (
        <EmptyState
          icone={FileQuestion}
          titulo="Obra não encontrada"
          descricao="Não encontramos nenhum registro de obra para o endereço solicitado no sistema."
          acao={{
            label: "Voltar para o Funil Kanban",
            onClick: () => { void navigate("/kanban"); },
          }}
        />
      ) : (
        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 sm:p-6">
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* COLUNA ESQUERDA: Dados Técnicos e Contratuais */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-surface p-5 rounded-xl border border-border-subtle space-y-5">
              <div className="flex items-center justify-between border-b border-border-subtle pb-3">
                <h2 className="text-xs font-bold text-foreground-muted uppercase tracking-wider">
                  Dados do Contrato e Local
                </h2>
                <Badge variante="neutral" tamanho="sm" comBorda>
                  {obra.categoria || "Residencial"}
                </Badge>
              </div>

              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-surface-subtle text-foreground-muted shrink-0">
                    <MapPin className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground font-medium">Localização</p>
                    <p className="text-sm font-semibold text-foreground">{obra.cliente?.cidade || "Cidade não informada"}</p>
                    {obra.endereco && <p className="text-xs text-muted-foreground mt-0.5">{obra.endereco}</p>}
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-surface-subtle text-foreground-muted shrink-0">
                    <Zap className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground font-medium">Capacidade Instalada</p>
                    <p className="text-sm font-semibold text-foreground tabular-nums">
                      {obra.quantidadePaineis ?? 0} módulos solares
                    </p>
                    {obra.quantidadeInversores ? (
                      <p className="text-xs text-muted-foreground mt-0.5 tabular-nums">
                        {obra.quantidadeInversores} inversor(es)
                      </p>
                    ) : null}
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-surface-subtle text-foreground-muted shrink-0">
                    <Calendar className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground font-medium">Cronograma Previsto</p>
                    <p className="text-sm font-semibold text-foreground tabular-nums">
                      Início: {obra.dataInicioEstimada ? formatarDataBR(obra.dataInicioEstimada) : "A definir"}
                    </p>
                    <p className="text-xs text-muted-foreground tabular-nums">
                      Conclusão: {obra.dataFimEstimada ? formatarDataBR(obra.dataFimEstimada) : "A definir"}
                    </p>
                  </div>
                </div>

                {obra.pagamento && (
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-surface-subtle text-foreground-muted shrink-0">
                      <CreditCard className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground font-medium">
                        {podeVerFaturamento ? "Faturamento e Prazos" : "Prazo Contratual"}
                      </p>
                      <p className="text-sm font-semibold text-foreground font-mono tabular-nums">
                        Prazo: {obra.pagamento.prazoContratualDias} dias
                      </p>
                      {podeVerFaturamento && obra.pagamento.dataConfirmacao && (
                        <p className="text-xs text-muted-foreground mt-0.5 tabular-nums">
                          Confirmado em: {formatarDataBR(obra.pagamento.dataConfirmacao)}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {obra.descricao && (
                  <div className="rounded-lg border border-border-subtle bg-surface-subtle p-3">
                    <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
                      Descrição da obra
                    </p>
                    <p className="text-xs text-foreground-secondary mt-1 leading-relaxed whitespace-pre-line">
                      {obra.descricao}
                    </p>
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-border-subtle">
                <Button
                  onClick={() =>
                    void navigate(`/obras/${obra.id}/materiais`, {
                      state: { from: paginaOrigem, selectedObraId: obraId },
                    })
                  }
                  className="w-full flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Package className="w-4 h-4" />
                  Gerenciar Materiais da Obra
                </Button>
              </div>
            </div>
          </div>

          {/* COLUNA DIREITA: Feed (Histórico e Comentários) */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-surface rounded-xl border border-border-subtle flex flex-col h-[620px]">
              <div className="p-4 border-b border-border-subtle flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-foreground-muted" />
                  <h2 className="text-xs font-bold text-foreground-muted uppercase tracking-wider">
                    Linha do Tempo e Comentários
                  </h2>
                </div>
                <Badge variante="neutral" tamanho="sm" className="font-mono tabular-nums">
                  {(historico?.length || 0) + (comentarios?.length || 0)} eventos
                </Badge>
              </div>

              <div className="flex-1 overflow-y-auto custom-scrollbar p-5 space-y-4">
                {loadingHist || loadingComent ? (
                  <FeedbackLoading mensagem="Atualizando eventos da obra..." />
                ) : eventosTimeline.length === 0 ? (
                  <EmptyState
                    icone={MessageSquare}
                    titulo="Nenhum evento registrado"
                    descricao="Ainda não existem comentários ou alterações gravadas para esta obra."
                  />
                ) : (
                  eventosTimeline.map((item) => {
                    if (item.tipo === "comentario") {
                      const c = item.comentario;
                      const editandoEste = comentarioEmEdicaoId === c.id;
                      return (
                        <div key={item.id} className="flex gap-3">
                          <AvatarIniciais nome={c.usuario?.nome || "Colaborador"} size="md" tone="primary" />
                          <div className="flex-1 min-w-0 bg-surface-subtle p-3.5 rounded-xl border border-border-subtle">
                            <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                              <div className="flex items-center gap-2 min-w-0">
                                <span className="text-xs font-bold text-foreground truncate">
                                  {c.usuario?.nome || "Colaborador"}
                                </span>
                                <Badge
                                  variante={c.tipo === "Timeline" ? "accent" : "info"}
                                  tamanho="xs"
                                >
                                  {c.tipo === "Timeline" ? "Financeiro / Timeline" : "Comentário"}
                                </Badge>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-[11px] text-muted-foreground font-mono tabular-nums">
                                  {formatarDataHoraEvento(c.dataRegistro)}
                                </span>
                                {podeGerenciarComentarios && !editandoEste && (
                                  <div className="inline-flex items-center gap-1">
                                    <IconActionButton
                                      size="sm"
                                      onClick={() => iniciarEdicaoComentario(c)}
                                      title="Editar comentário"
                                      label={`Editar comentário de ${c.usuario?.nome || "Colaborador"}`}
                                      className="hover:bg-surface"
                                    >
                                      <Pencil className="w-3.5 h-3.5" />
                                    </IconActionButton>
                                    <IconActionButton
                                      size="sm"
                                      tone="destructive"
                                      onClick={() => setComentarioParaExcluir(c)}
                                      title="Excluir comentário"
                                      label={`Excluir comentário de ${c.usuario?.nome || "Colaborador"}`}
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </IconActionButton>
                                  </div>
                                )}
                              </div>
                            </div>

                            {editandoEste ? (
                              <div className="flex items-center gap-2 mt-1.5">
                                <input
                                  type="text"
                                  aria-label="Editar texto do comentário"
                                  value={textoEdicaoComentario}
                                  disabled={editarComentarioMutation.isPending}
                                  onChange={(e) => setTextoEdicaoComentario(e.target.value)}
                                  className="flex-1 bg-surface border border-border-strong rounded-lg px-3 py-1.5 text-xs text-foreground focus-visible:outline-none focus-visible:border-info focus-visible:ring-2 focus-visible:ring-info/25"
                                />
                                <button
                                  type="button"
                                  disabled={
                                    !textoEdicaoComentario.trim() ||
                                    editarComentarioMutation.isPending
                                  }
                                  onClick={() => void salvarEdicaoComentario(c.id)}
                                  title="Salvar comentário"
                                  aria-label="Salvar comentário"
                                  className="p-1.5 rounded-md bg-primary text-primary-foreground hover:bg-primary-hover disabled:opacity-50 cursor-pointer"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  disabled={editarComentarioMutation.isPending}
                                  onClick={() => {
                                    setComentarioEmEdicaoId(null);
                                    setTextoEdicaoComentario("");
                                  }}
                                  title="Cancelar edição"
                                  aria-label="Cancelar edição"
                                  className="p-1.5 rounded-md border border-border-subtle bg-surface text-muted-foreground hover:text-foreground cursor-pointer"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ) : (
                              <p className="text-sm text-foreground-secondary leading-relaxed">
                                {c.descricao}
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    }

                    const h = item.historico;
                    const infoEvento = descreverEventoHistorico(h);
                    return (
                      <div key={item.id} className="flex gap-3">
                        <div className="w-8 h-8 rounded-full bg-muted text-subtle-foreground flex items-center justify-center shrink-0 border border-border-subtle">
                          <Clock className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0 bg-surface-subtle/60 p-3.5 rounded-xl border border-border-subtle">
                          <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-semibold text-foreground-muted">
                                {h.usuario?.nome || "Sistema"}
                              </span>
                              <Badge variante="neutral" tamanho="xs">
                                Avanço automático
                              </Badge>
                            </div>
                            <span className="text-[11px] text-muted-foreground font-mono tabular-nums">
                              {formatarDataHoraEvento(h.dataAlteracao)}
                            </span>
                          </div>
                          <p className="text-xs text-foreground-secondary">
                            {infoEvento.titulo}{" "}
                            {infoEvento.destaque ? (
                              <span className="font-semibold text-info">
                                {infoEvento.destaque}
                              </span>
                            ) : null}
                          </p>
                          {h.observacao && (
                            <p className="text-xs text-muted-foreground mt-1.5 italic bg-surface/60 p-2 rounded-lg border border-border-subtle">
                              "{h.observacao}"
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Formulário de Envio de Comentário */}
              <div className="p-4 border-t border-border-subtle bg-surface-subtle/50 shrink-0 rounded-b-xl">
                <form onSubmit={handleComentar} className="flex gap-2">
                  <input
                    type="text"
                    value={novoComentario}
                    onChange={(e) => setNovoComentario(e.target.value)}
                    aria-label="Comentário sobre a obra"
                    placeholder="Adicionar um comentário ou observação na obra..."
                    className="flex-1 h-10 bg-surface border border-border-strong rounded-lg px-3.5 text-sm text-foreground focus-visible:outline-none focus-visible:border-info focus-visible:ring-2 focus-visible:ring-info/25 transition-colors"
                    disabled={addComentario.isPending}
                  />
                  <Button
                    type="submit"
                    disabled={!novoComentario.trim() || addComentario.isPending}
                    className="h-10 px-4"
                  >
                    {addComentario.isPending ? "Enviando..." : <Send className="w-4 h-4" />}
                  </Button>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
      )}

      {/* Modal de Edição e Confirmação de Exclusão Lógica da Obra */}
      {obra && (
        <>
          <ModalEditarObra
            isOpen={modalEditarAberto}
            onClose={() => setModalEditarAberto(false)}
            obra={obra}
          />

          <ConfirmDialog
            isOpen={confirmExcluirObraAberto}
            onClose={() => setConfirmExcluirObraAberto(false)}
            onConfirm={() => void confirmarExclusaoObra()}
            isLoading={excluirObraMutation.isPending}
            variant="danger"
            titulo="Excluir esta obra?"
            descricao={`Tem certeza que deseja excluir a obra de "${clienteNome}"? Ela deixará de aparecer no funil operacional.`}
            labelConfirmar="Excluir obra"
          />
        </>
      )}

      {/* Confirmação de Exclusão de Comentário (Exclusivo Administrador) */}
      <ConfirmDialog
        isOpen={Boolean(comentarioParaExcluir)}
        onClose={() => setComentarioParaExcluir(null)}
        onConfirm={() => void confirmarExclusaoComentario()}
        isLoading={excluirComentarioMutation.isPending}
        variant="danger"
        titulo="Excluir comentário?"
        descricao="Tem certeza que deseja remover este comentário da linha do tempo da obra?"
        labelConfirmar="Excluir comentário"
      />
    </div>
  );
}
