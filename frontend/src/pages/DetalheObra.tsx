import { useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useObraDetalhe, useHistoricoObra, useComentariosObra, useAdicionarComentario } from "@/hooks/api/useObraDetalhe";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import FeedbackLoading from "@/components/feedback/FeedbackLoading";
import FeedbackErro from "@/components/feedback/FeedbackErro";
import { EmptyState } from "@/components/feedback/EmptyState";
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
} from "lucide-react";
import { formatarDataBR } from "@/lib/formatters";

export default function DetalheObra() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const obraId = Number(id);

  const stateFrom = location.state as { from?: string; selectedObraId?: number } | null;
  const paginaOrigem = stateFrom?.from ?? "/kanban";
  const backState = paginaOrigem === "/financeiro" ? { selectedObraId: obraId } : undefined;

  const { data: obra, isLoading: loadingObra, isError: errorObra, error, refetch } = useObraDetalhe(obraId);
  const { data: historico, isLoading: loadingHist } = useHistoricoObra(obraId);
  const { data: comentarios, isLoading: loadingComent } = useComentariosObra(obraId);
  const addComentario = useAdicionarComentario();

  const [novoComentario, setNovoComentario] = useState("");

  const handleComentar = (e: React.FormEvent) => {
    e.preventDefault();
    if (!novoComentario.trim()) return;
    addComentario.mutate(
      { obraId, descricao: novoComentario.trim() },
      {
        onSuccess: () => setNovoComentario(""),
      }
    );
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
          mensagem={(error as Error)?.message || "Não foi possível buscar as informações da obra. Verifique se o servidor está ativo."}
          onTentarNovamente={() => void refetch()}
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
            onClick: () => navigate("/kanban"),
          }}
        />
      </div>
    );
  }

  const clienteNome = obra.cliente?.nome || "Cliente sem identificação";

  // 4. ESTADO COM DADOS (SUCESSO)
  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-background-app">
      <PageHeader
        title={`Obra: ${clienteNome}`}
        subtitle={`#${obra.id} • Status: ${obra.status}`}
        backTo={paginaOrigem}
        backState={backState}
      />

      <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* COLUNA ESQUERDA: Dados Técnicos e Contratuais */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-surface p-5 rounded-xl border border-border-subtle shadow-xs space-y-5">
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
                      {obra.quantidadePaineis} módulos solares
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

                {obra.pagamento && (
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
                    navigate(`/obras/${obra.id}/materiais`, {
                      state: { from: paginaOrigem, selectedObraId: obraId },
                    })
                  }
                  className="w-full flex items-center justify-center gap-2 cursor-pointer shadow-xs"
                >
                  <Package className="w-4 h-4" />
                  Gerenciar Materiais da Obra
                </Button>
              </div>
            </div>
          </div>

          {/* COLUNA DIREITA: Feed (Histórico e Comentários) */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-surface rounded-xl border border-border-subtle shadow-xs flex flex-col h-[620px]">
              <div className="p-4 border-b border-border-subtle flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-foreground-muted" />
                  <h2 className="text-xs font-bold text-foreground-muted uppercase tracking-wider">
                    Linha do Tempo e Comentários
                  </h2>
                </div>
                <span className="text-xs text-muted-foreground">
                  {(historico?.length || 0) + (comentarios?.length || 0)} eventos
                </span>
              </div>

              <div className="flex-1 overflow-y-auto custom-scrollbar p-5 space-y-4">
                {loadingHist || loadingComent ? (
                  <FeedbackLoading mensagem="Atualizando eventos da obra..." />
                ) : (
                  <>
                    {/* Exibe comentários */}
                    {comentarios?.map((c) => (
                      <div key={`c-${c.id}`} className="flex gap-3">
                        <div className="w-8 h-8 rounded-full bg-info-light text-info flex items-center justify-center shrink-0 border border-info-border">
                          <User className="w-4 h-4" />
                        </div>
                        <div className="flex-1 bg-surface-subtle p-3 rounded-xl border border-border-subtle">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-bold text-foreground">
                              {c.usuario?.nome || "Colaborador"}
                            </span>
                            <span className="text-[11px] text-muted-foreground">
                              {new Date(c.dataRegistro).toLocaleDateString()} {new Date(c.dataRegistro).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <p className="text-sm text-foreground-secondary leading-relaxed">{c.descricao}</p>
                        </div>
                      </div>
                    ))}

                    {/* Exibe histórico de movimentações */}
                    {historico?.map((h) => (
                      <div key={`h-${h.id}`} className="flex gap-3">
                        <div className="w-8 h-8 rounded-full bg-muted text-subtle-foreground flex items-center justify-center shrink-0 border border-border-subtle">
                          <Clock className="w-4 h-4" />
                        </div>
                        <div className="flex-1 bg-surface-subtle/60 p-3 rounded-xl border border-border-subtle">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-semibold text-foreground-muted">
                              {h.usuario?.nome || "Sistema"}
                            </span>
                            <span className="text-[11px] text-muted-foreground">
                              {new Date(h.dataAlteracao).toLocaleDateString()} {new Date(h.dataAlteracao).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <p className="text-xs text-foreground-secondary">
                            Status alterado de <span className="font-semibold text-foreground">{h.statusAnterior || "Início"}</span> para{" "}
                            <span className="font-semibold text-info">{h.statusNovo}</span>
                          </p>
                          {h.observacao && (
                            <p className="text-xs text-muted-foreground mt-1.5 italic bg-surface/60 p-2 rounded-lg border border-border-subtle">
                              "{h.observacao}"
                            </p>
                          )}
                        </div>
                      </div>
                    ))}

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
                    placeholder="Adicionar um comentário ou observação na obra..."
                    className="flex-1 bg-surface border border-border-subtle rounded-lg px-4 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-info/20 focus:border-info transition-colors"
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
    </div>
  );
}

