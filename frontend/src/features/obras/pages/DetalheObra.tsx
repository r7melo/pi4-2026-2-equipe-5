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
import FeedbackLoading from "@/shared/components/feedback/FeedbackLoading";
import FeedbackErro from "@/shared/components/feedback/FeedbackErro";
import { EmptyState } from "@/shared/components/feedback/EmptyState";
import { ConfirmDialog } from "@/shared/components/feedback/ConfirmDialog";
import { ModalEditarObra } from "../components/ModalEditarObra";
import { ExportarDetalhesInstalacao } from "../components/ExportarDetalhesInstalacao";
import type { ComentarioObra, HistoricoObra } from "../types/obras";
import {
  Calendar,
  MapPin,
  CreditCard,
  Send,
  Clock,
  User,
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

function descreverEventoHistorico(h: HistoricoObra & { tipoAcao?: string }): {
  titulo: string;
  destaque?: string;
} {
  if (h.tipoAcao === "ManutencaoConcluida") {
    return { titulo: "Manutenção concluída em campo" };
  }
  if (h.tipoAcao === "Comentario") {
    return { titulo: "Comentário registrado na linha do tempo" };
  }
  if (h.tipoAcao === "CadastroObra") {
    return { titulo: "Obra cadastrada no sistema" };
  }
  if (h.tipoAcao === "EdicaoObra") {
    return { titulo: "Dados cadastrais da obra atualizados" };
  }
  if (h.statusNovo) {
    return {
      titulo: `Status alterado de ${h.statusAnterior || "Início"} para`,
      destaque: h.statusNovo,
    };
  }
  return { titulo: "Atualização registrada na obra" };
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
    } finally {
      salvandoComentarioRef.current = false;
    }
  };

  const confirmarExclusaoComentario = async () => {
    if (!comentarioParaExcluir || excluirComentarioMutation.isPending) return;
    await excluirComentarioMutation.mutateAsync({
      id: comentarioParaExcluir.id,
      obraId,
    });
    setComentarioParaExcluir(null);
  };

  const confirmarExclusaoObra = async () => {
    if (!obra || excluirObraMutation.isPending) return;
    await excluirObraMutation.mutateAsync(obra.id);
    setConfirmExcluirObraAberto(false);
    void navigate("/kanban", { replace: true });
  };

  // 1. ESTADO DE CARREGAMENTO
  if (loadingObra) {
    return (
      <div className="flex-1 flex flex-col h-full overflow-hidden bg-background-app">
        <PageHeader title="Detalhes da Obra" subtitle="Consultando informações no servidor..." backTo={paginaOrigem} backState={backState} />
        <FeedbackLoading mensagem="Carregando dados da obra e cliente no banco de dados..." />
      </div>
    );
  }

  // 2. ESTADO DE ERRO
  if (errorObra) {
    return (
      <div className="flex-1 flex flex-col h-full overflow-hidden bg-background-app">
        <PageHeader title="Detalhes da Obra" subtitle="Falha de conexão" backTo={paginaOrigem} backState={backState} />
        <FeedbackErro
          titulo="Falha ao carregar detalhes da obra"
          mensagem={error instanceof Error ? error.message : "Não foi possível buscar as informações da obra. Verifique se o servidor está ativo."}
          onTentarNovamente={() => { void refetch(); }}
        />
      </div>
    );
  }

  // 3. ESTADO VAZIO (Obra inexistente / 404)
  if (!obra) {
    return (
      <div className="flex-1 flex flex-col h-full overflow-hidden bg-background-app">
        <PageHeader title="Detalhes da Obra" subtitle="Obra não encontrada" backTo={paginaOrigem} backState={backState} />
        <EmptyState
          icone={FileQuestion}
          titulo="Obra não encontrada"
          descricao={`Não encontramos nenhum registro de obra com o identificador #${obraId} no banco de dados.`}
          acao={{
            label: "Voltar para o Funil Kanban",
            onClick: () => { void navigate("/kanban"); },
          }}
        />
      </div>
    );
  }

  const clienteNome = obra.cliente?.nome || "Cliente sem identificação";
  const obraEmAndamento = obra.status === "EmAndamento";

  // 4. ESTADO COM DADOS (SUCESSO)
  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-background-app">
      <PageHeader
        title={`Obra: ${clienteNome}`}
        subtitle={`#${obra.id} • Status: ${obra.status}`}
        backTo={paginaOrigem}
        backState={backState}
      >
        <div className="flex items-center gap-2">
          {podeEditarObra && (
            <>
              <Button
                onClick={() => setModalEditarAberto(true)}
                className="flex items-center gap-2 text-xs"
              >
                <Edit3 className="w-4 h-4" />
                Editar Obra
              </Button>
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
                className="flex items-center gap-1.5 text-xs border border-border-subtle"
              >
                <Trash2 className="w-4 h-4" />
                <span className="hidden sm:inline">Excluir</span>
              </Button>
            </>
          )}

          {podeExportarInstalacao && (
            <ExportarDetalhesInstalacao
              obraId={obra.id}
              contextoValido={() => true}
            />
          )}
        </div>
      </PageHeader>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* COLUNA ESQUERDA: Dados Técnicos e Contratuais */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-surface p-5 rounded-xl border border-border-subtle space-y-5">
              <div className="flex items-center justify-between border-b border-border-subtle pb-3">
                <h2 className="text-xs font-bold text-foreground-muted uppercase tracking-wider">
                  Dados do Contrato e Local
                </h2>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-surface-subtle font-semibold border border-border-subtle text-foreground-secondary">
                  {obra.categoria || "Residencial"}
                </span>
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
                    <p className="text-sm font-semibold text-foreground">
                      {obra.quantidadePaineis ?? 0} módulos solares
                    </p>
                    {obra.quantidadeInversores ? (
                      <p className="text-xs text-muted-foreground mt-0.5">
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
                    <p className="text-sm font-semibold text-foreground">
                      Início: {obra.dataInicioEstimada ? formatarDataBR(obra.dataInicioEstimada) : "A definir"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Conclusão: {obra.dataFimEstimada ? formatarDataBR(obra.dataFimEstimada) : "A definir"}
                    </p>
                  </div>
                </div>

                {podeVerFaturamento && obra.pagamento && (
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-surface-subtle text-foreground-muted shrink-0">
                      <CreditCard className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground font-medium">Faturamento e Prazos</p>
                      <p className="text-sm font-semibold text-foreground">
                        Prazo: {obra.pagamento.prazoContratualDias} dias
                      </p>
                      {obra.pagamento.dataConfirmacao && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Confirmado em: {formatarDataBR(obra.pagamento.dataConfirmacao)}
                        </p>
                      )}
                    </div>
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
                <span className="text-xs text-muted-foreground font-mono">
                  {(historico?.length || 0) + (comentarios?.length || 0)} eventos
                </span>
              </div>

              <div className="flex-1 overflow-y-auto custom-scrollbar p-5 space-y-4">
                {loadingHist || loadingComent ? (
                  <FeedbackLoading mensagem="Atualizando eventos da obra..." />
                ) : (
                  <>
                    {/* Exibe comentários */}
                    {comentarios?.map((c) => {
                      const editandoEste = comentarioEmEdicaoId === c.id;
                      return (
                        <div key={`c-${c.id}`} className="flex gap-3">
                          <div className="w-8 h-8 rounded-full bg-info-light text-info flex items-center justify-center shrink-0 border border-info-border">
                            <User className="w-4 h-4" />
                          </div>
                          <div className="flex-1 bg-surface-subtle p-3 rounded-xl border border-border-subtle">
                            <div className="flex items-center justify-between gap-2 mb-1">
                              <span className="text-xs font-bold text-foreground">
                                {c.usuario?.nome || "Colaborador"}
                              </span>
                              <div className="flex items-center gap-2">
                                <span className="text-[11px] text-muted-foreground font-mono">
                                  {formatarDataHoraEvento(c.dataRegistro)}
                                </span>
                                {podeGerenciarComentarios && !editandoEste && (
                                  <div className="inline-flex items-center gap-1">
                                    <button
                                      type="button"
                                      onClick={() => iniciarEdicaoComentario(c)}
                                      title="Editar comentário"
                                      aria-label={`Editar comentário de ${c.usuario?.nome || "Colaborador"}`}
                                      className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-surface transition-colors cursor-pointer"
                                    >
                                      <Pencil className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setComentarioParaExcluir(c)}
                                      title="Excluir comentário"
                                      aria-label={`Excluir comentário de ${c.usuario?.nome || "Colaborador"}`}
                                      className="p-1 rounded text-muted-foreground hover:text-destructive hover:bg-destructive-light/30 transition-colors cursor-pointer"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
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
                                  className="flex-1 bg-surface border border-border-subtle rounded-lg px-3 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-border-strong"
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
                    })}

                    {/* Exibe histórico de movimentações */}
                    {historico?.map((h) => {
                      const infoEvento = descreverEventoHistorico(h);
                      return (
                        <div key={`h-${h.id}`} className="flex gap-3">
                          <div className="w-8 h-8 rounded-full bg-muted text-subtle-foreground flex items-center justify-center shrink-0 border border-border-subtle">
                            <Clock className="w-4 h-4" />
                          </div>
                          <div className="flex-1 bg-surface-subtle/60 p-3 rounded-xl border border-border-subtle">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-xs font-semibold text-foreground-muted">
                                {h.usuario?.nome || "Sistema"}
                              </span>
                              <span className="text-[11px] text-muted-foreground font-mono">
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
                    })}

                    {!historico?.length && !comentarios?.length && (
                      <EmptyState
                        icone={MessageSquare}
                        titulo="Nenhum evento registrado"
                        descricao="Ainda não existem comentários ou alterações gravadas para esta obra."
                      />
                    )}
                  </>
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
                    className="flex-1 bg-surface border border-border-subtle rounded-lg px-4 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-border-strong focus:border-border-strong transition-colors"
                    disabled={addComentario.isPending}
                  />
                  <Button
                    type="submit"
                    disabled={!novoComentario.trim() || addComentario.isPending}
                    className="px-4"
                  >
                    {addComentario.isPending ? "Enviando..." : <Send className="w-4 h-4" />}
                  </Button>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal de Edição */}
      <ModalEditarObra
        isOpen={modalEditarAberto}
        onClose={() => setModalEditarAberto(false)}
        obra={obra}
      />

      {/* Confirmação de Exclusão Lógica da Obra */}
      <ConfirmDialog
        isOpen={confirmExcluirObraAberto}
        onClose={() => setConfirmExcluirObraAberto(false)}
        onConfirm={() => void confirmarExclusaoObra()}
        isLoading={excluirObraMutation.isPending}
        variant="danger"
        titulo="Excluir esta obra?"
        descricao={`Tem certeza que deseja excluir a obra de "${clienteNome}" (#${obra.id})? Ela deixará de aparecer no funil operacional.`}
        labelConfirmar="Excluir obra"
      />

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
