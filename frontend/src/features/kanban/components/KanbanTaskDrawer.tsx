import { deveExibirErroLocal } from "@/shared/lib/sessaoOperacao";
import { useState, useMemo, type ReactNode } from "react";
import {
  ExternalLink,
  Package,
  Trash2,
  FileText,
  History,
  MessageSquare,
  Send,
  Save,
  AlertCircle,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import axios from "axios";
import type { ObraCard, EditarObraPayload, Equipe, ObraDetalhe } from "@/types";
import { Button } from "@/shared/components/ui/Button";
import { Drawer } from "@/shared/components/ui/Drawer";
import { getCategoriaBadgeStyle, obterHojeLocalISO, obterValorObra } from "./kanbanUtils";
import { formatarMoeda, formatarDataBR } from "@/shared/lib/formatters";
import ModalExcluirObra from "./ModalExcluirObra";
import { useProgramacoes } from "@/features/cronograma/hooks/useProgramacoes";
import { useEquipes } from "@/features/cronograma/hooks/useEquipes";
import { AbaMateriais } from "./AbaMateriais";
import { useMateriais } from "@/features/kanban/hooks/useKanbanMateriais";
import { useObras, useExcluirObra } from "@/features/obras/hooks/useObras";
import {
  useObraDetalhe,
  useHistoricoObra,
  useComentariosObra,
  useAdicionarComentario,
  useEditarObra,
} from "@/features/obras/hooks/useObraDetalhe";
import { useAuthStore } from "@/features/auth/stores/useAuthStore";
import { cn } from "@/shared/lib/utils";

type AbaDrawer = "dados" | "materiais" | "historico" | "comentarios";

interface KanbanTaskDrawerProps {
  card: ObraCard | null;
  isOpen: boolean;
  onClose: () => void;
  renderizarAcoesObra?: (obraId: number) => ReactNode;
}

interface FormAbaDadosProps {
  card: ObraCard;
  detalhe: ObraDetalhe | undefined;
  canEdit: boolean;
  equipeAlocada: Equipe | null;
  loadingDetalhe: boolean;
  onSalvar: (dados: EditarObraPayload) => Promise<void>;
  isSalvando: boolean;
}

function FormAbaDados({
  card,
  detalhe,
  canEdit,
  equipeAlocada,
  loadingDetalhe,
  onSalvar,
  isSalvando,
}: FormAbaDadosProps) {
  const [formDados, setFormDados] = useState({
    endereco: detalhe?.endereco ?? card.endereco ?? "",
    quantidadePaineis: detalhe?.quantidadePaineis ?? card.quantidadePaineis,
    previsaoFim: detalhe?.dataFimEstimada
      ? String(detalhe.dataFimEstimada).split("T")[0]
      : card.dataFimEstimada
      ? String(card.dataFimEstimada).split("T")[0]
      : "",
    observacoes: detalhe?.descricao ?? card.observacoes ?? "",
  });

  const [erroEndereco, setErroEndereco] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEdit || loadingDetalhe) return;

    if (!formDados.endereco.trim()) {
      setErroEndereco(true);
      toast.error("O endereço da obra é obrigatório.");
      return;
    }

    try {
      await onSalvar({
        endereco: formDados.endereco.trim(),
        quantidadePaineis: Number(formDados.quantidadePaineis),
        dataFimEstimada: formDados.previsaoFim || undefined,
        descricao: formDados.observacoes.trim() || undefined,
      });
    } catch {
      // Erro gerenciado no onError do hook
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-semibold text-foreground-muted mb-1 block">
            Endereço <span className="text-destructive">*</span>
          </label>
          <input
            type="text"
            value={formDados.endereco}
            onChange={(e) => {
              setFormDados({ ...formDados, endereco: e.target.value });
              if (erroEndereco) setErroEndereco(false);
            }}
            disabled={!canEdit || loadingDetalhe}
            aria-invalid={erroEndereco}
            className={cn(
              "w-full text-xs px-2.5 py-1.5 bg-surface text-foreground border rounded-lg focus:outline-none focus:ring-1 disabled:bg-muted disabled:text-muted-foreground",
              erroEndereco
                ? "border-destructive focus:ring-destructive"
                : "border-border-strong focus:ring-info"
            )}
            placeholder="Endereço da instalação..."
          />
        </div>

        <div>
          <label className="text-xs font-semibold text-foreground-muted mb-1 block">Quantidade de Painéis</label>
          <input
            type="number"
            min="1"
            step="1"
            value={formDados.quantidadePaineis}
            onChange={(e) => setFormDados({ ...formDados, quantidadePaineis: Number(e.target.value) })}
            disabled={!canEdit || loadingDetalhe}
            className="w-full text-xs px-2.5 py-1.5 bg-surface text-foreground border border-border-strong rounded-lg focus:outline-none focus:ring-1 focus:ring-info disabled:bg-muted disabled:text-muted-foreground"
          />
        </div>

        <div>
          <label className="text-xs font-semibold text-foreground-muted mb-1 block">Previsão de Término</label>
          <input
            type="date"
            value={formDados.previsaoFim}
            onChange={(e) => setFormDados({ ...formDados, previsaoFim: e.target.value })}
            disabled={!canEdit || loadingDetalhe}
            className="w-full text-xs px-2.5 py-1.5 bg-surface text-foreground border border-border-strong rounded-lg focus:outline-none focus:ring-1 focus:ring-info disabled:bg-muted disabled:text-muted-foreground"
          />
        </div>

        <div>
          <label className="text-xs font-semibold text-foreground-muted mb-1 block">Equipe Alocada</label>
          <div className="w-full text-xs px-2.5 py-1.5 border border-border-subtle bg-surface-subtle rounded-lg text-foreground-muted">
            {equipeAlocada ? equipeAlocada.nome : "Nenhuma equipe vinculada"}
          </div>
        </div>
      </div>

      <div>
        <label className="text-xs font-semibold text-foreground-muted mb-1 block">Observações Técnicas</label>
        <textarea
          rows={3}
          value={formDados.observacoes}
          onChange={(e) => setFormDados({ ...formDados, observacoes: e.target.value })}
          disabled={!canEdit || loadingDetalhe}
          className="w-full text-xs px-2.5 py-1.5 bg-surface text-foreground border border-border-strong rounded-lg focus:outline-none focus:ring-1 focus:ring-info disabled:bg-muted disabled:text-muted-foreground placeholder-subtle-foreground"
          placeholder="Adicione observações relevantes sobre o projeto..."
        />
      </div>

      {canEdit && (
        <div className="flex justify-end pt-2">
          <Button
            type="submit"
            variant="primary"
            size="sm"
            disabled={isSalvando || loadingDetalhe}
            className="flex items-center gap-1.5"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{isSalvando ? "Salvando..." : "Salvar Alterações"}</span>
          </Button>
        </div>
      )}
    </form>
  );
}

export default function KanbanTaskDrawer({
  card,
  isOpen,
  onClose,
  renderizarAcoesObra,
}: KanbanTaskDrawerProps) {
  const navigate = useNavigate();
  const [abaAtiva, setAbaAtiva] = useState<AbaDrawer>("dados");
  const [modalExcluirAberto, setModalExcluirAberto] = useState(false);
  const [novoComentario, setNovoComentario] = useState("");

  const perfil = useAuthStore((s) => s.usuario?.perfil?.nomePerfil);
  const canEdit = perfil === "Administrador" || perfil === "Engenharia";
  const canDelete = perfil === "Administrador" || perfil === "Engenharia";

  const { data: obrasData } = useObras();
  const cardAtualizado = useMemo(() => {
    if (!card) return null;
    return obrasData?.itens.find((o) => Number(o.id) === Number(card.id)) || card;
  }, [card, obrasData]);

  const cardEfetivo = cardAtualizado || card;

  // Hooks de Dados Especializados
  const obraId = cardEfetivo?.id ? Number(cardEfetivo.id) : 0;
  const { data: detalhe, isLoading: loadingDetalhe, isError: erroDetalhe } = useObraDetalhe(obraId);
  const { data: programacoes } = useProgramacoes();
  const { data: equipes } = useEquipes();
  const { data: materiais } = useMateriais(obraId);
  const { data: historico, isLoading: loadingHistorico } = useHistoricoObra(obraId);
  const { data: comentarios, isLoading: loadingComentarios } = useComentariosObra(obraId);

  // Mutações
  const excluirObraMutation = useExcluirObra();
  const editarObraMutation = useEditarObra();
  const adicionarComentarioMutation = useAdicionarComentario();

  const alocacao = useMemo(() => {
    if (!cardEfetivo || !programacoes) return null;
    return programacoes.find((p) => Number(p.obraId) === Number(cardEfetivo.id)) || null;
  }, [cardEfetivo, programacoes]);

  const equipeAlocada = useMemo(() => {
    if (!alocacao || !equipes) return null;
    return equipes.find((e) => e.id === alocacao.equipeId) || null;
  }, [alocacao, equipes]);

  const temAlocacaoAtiva = useMemo(() => {
    if (!cardEfetivo || !programacoes) return false;
    const hojeStr = obterHojeLocalISO();
    return programacoes.some((p) => {
      if (Number(p.obraId) !== Number(cardEfetivo.id)) return false;
      const fimStr = p.dataFim ? String(p.dataFim).split("T")[0] : "";
      return fimStr >= hojeStr;
    });
  }, [cardEfetivo, programacoes]);

  if (!cardEfetivo) return null;

  const handleSalvarObra = async (payload: EditarObraPayload) => {
    await editarObraMutation.mutateAsync({
      id: cardEfetivo.id,
      payload,
    });
  };

  const handleEnviarComentario = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!novoComentario.trim()) return;

    try {
      await adicionarComentarioMutation.mutateAsync({
        obraId: cardEfetivo.id,
        descricao: novoComentario.trim(),
      });
      setNovoComentario("");
    } catch {
      // Erro gerenciado no hook
    }
  };

  const handleConfirmarExclusao = async () => {
    try {
      await excluirObraMutation.mutateAsync(cardEfetivo.id);
      toast.success("Obra excluída com sucesso.");
      setModalExcluirAberto(false);
      onClose();
    } catch (err: unknown) {
      if (!deveExibirErroLocal(err)) return;
      let msg = "Não foi possível excluir a obra.";
      if (axios.isAxiosError<{ error?: { message?: string } }>(err)) {
        msg = err.response?.data?.error?.message || err.message;
      } else if (err instanceof Error) {
        msg = err.message;
      }
      toast.error(msg);
    }
  };

  return (
    <>
      <Drawer
        isOpen={isOpen}
        onClose={onClose}
        titulo={`Obra #${cardEfetivo.id}`}
        acoesHeader={renderizarAcoesObra ? renderizarAcoesObra(cardEfetivo.id) : undefined}
        tamanho="lg"
      >
        <div className="flex-1 min-h-0 flex flex-col space-y-4 p-5 overflow-hidden">
          {/* Cabeçalho da Obra */}
          <div className="flex items-start justify-between pb-3 border-b border-border-subtle">
            <div>
              <h2 className="text-base font-bold text-foreground-secondary">
                {cardEfetivo.clienteNome}
              </h2>
              <div className="flex items-center gap-2 mt-1">
                <span className={cn("text-xs font-semibold px-2 py-0.5 rounded-full border", getCategoriaBadgeStyle(cardEfetivo.categoria))}>
                  {cardEfetivo.categoria}
                </span>
                <span className="text-xs text-muted-foreground">
                  Status: <strong>{cardEfetivo.status}</strong>
                </span>
              </div>
            </div>
            <div className="text-right">
              <span className="text-xs text-muted-foreground block">Valor Estimado</span>
              <span className="text-sm font-bold text-foreground-secondary">
                {formatarMoeda(obterValorObra(cardEfetivo), { semCentavos: true })}
              </span>
            </div>
          </div>

          {/* Barra de Navegação das 4 Abas Canônicas (RF-04 / UX-05) */}
          <div className="flex items-center border-b border-border-subtle gap-1">
            <button
              type="button"
              onClick={() => setAbaAtiva("dados")}
              className={cn(
                "flex items-center gap-1.5 px-3 py-2 text-xs font-semibold border-b-2 transition-colors",
                abaAtiva === "dados"
                  ? "border-info text-info bg-info-light/50"
                  : "border-transparent text-muted-foreground hover:text-foreground-muted"
              )}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Dados</span>
            </button>

            <button
              type="button"
              onClick={() => setAbaAtiva("materiais")}
              className={cn(
                "flex items-center gap-1.5 px-3 py-2 text-xs font-semibold border-b-2 transition-colors",
                abaAtiva === "materiais"
                  ? "border-info text-info bg-info-light/50"
                  : "border-transparent text-muted-foreground hover:text-foreground-muted"
              )}
            >
              <Package className="w-3.5 h-3.5" />
              <span>Materiais</span>
              {materiais && materiais.length > 0 && (
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-muted text-foreground-muted font-bold">
                  {materiais.length}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setAbaAtiva("historico")}
              className={cn(
                "flex items-center gap-1.5 px-3 py-2 text-xs font-semibold border-b-2 transition-colors",
                abaAtiva === "historico"
                  ? "border-info text-info bg-info-light/50"
                  : "border-transparent text-muted-foreground hover:text-foreground-muted"
              )}
            >
              <History className="w-3.5 h-3.5" />
              <span>Histórico</span>
            </button>

            <button
              type="button"
              onClick={() => setAbaAtiva("comentarios")}
              className={cn(
                "flex items-center gap-1.5 px-3 py-2 text-xs font-semibold border-b-2 transition-colors",
                abaAtiva === "comentarios"
                  ? "border-info text-info bg-info-light/50"
                  : "border-transparent text-muted-foreground hover:text-foreground-muted"
              )}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Comentários</span>
              {comentarios && comentarios.length > 0 && (
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-muted text-foreground-muted font-bold">
                  {comentarios.length}
                </span>
              )}
            </button>
          </div>

          {/* Conteúdo das Abas */}
          <div className="flex-1 min-h-0 overflow-y-auto pr-1">
            {/* ABA 1: DADOS */}
            {abaAtiva === "dados" && (
              <>
                {erroDetalhe && (
                  <div className="flex items-center gap-2 p-2.5 mb-3 bg-warning/10 border border-warning/20 rounded-lg text-xs text-warning">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>Não foi possível carregar os detalhes complementares da obra.</span>
                  </div>
                )}
                <FormAbaDados
                  key={`${cardEfetivo.id}-${detalhe?.id ?? "carregando"}-${isOpen}`}
                  card={cardEfetivo}
                  detalhe={detalhe}
                  canEdit={canEdit}
                  equipeAlocada={equipeAlocada}
                  loadingDetalhe={loadingDetalhe}
                  onSalvar={handleSalvarObra}
                  isSalvando={editarObraMutation.isPending}
                />
              </>
            )}

            {/* ABA 2: MATERIAIS */}
            {abaAtiva === "materiais" && (
              <AbaMateriais obraId={obraId} somenteLeitura={!canEdit} />
            )}

            {/* ABA 3: HISTÓRICO */}
            {abaAtiva === "historico" && (
              <div className="space-y-3">
                {loadingHistorico && (
                  <div className="py-8 text-center text-xs text-muted-foreground">Carregando histórico de alterações...</div>
                )}

                {!loadingHistorico && historico && historico.length > 0 && (
                  <div className="relative pl-4 space-y-4 before:absolute before:left-1.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-border-subtle">
                    {historico.map((h) => (
                      <div key={h.id} className="relative">
                        <span className="absolute -left-4 top-1 w-2.5 h-2.5 rounded-full bg-info ring-4 ring-surface" />
                        <div className="bg-surface-subtle border border-border-subtle rounded-lg p-2.5">
                          <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-1">
                            <span className="font-semibold text-foreground-muted">{h.usuario?.nome || "Sistema"}</span>
                            <span>{formatarDataBR(h.dataAlteracao)}</span>
                          </div>
                          <p className="text-xs text-foreground-secondary">
                            De <strong>{h.statusAnterior}</strong> para <strong>{h.statusNovo}</strong>
                          </p>
                          {h.observacao && (
                            <p className="text-[11px] text-muted-foreground mt-1 italic">
                              "{h.observacao}"
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {!loadingHistorico && (!historico || historico.length === 0) && (
                  <div className="py-8 text-center text-xs text-muted-foreground border border-dashed border-border-subtle rounded-xl">
                    Nenhuma movimentação de status registrada no histórico.
                  </div>
                )}
              </div>
            )}

            {/* ABA 4: COMENTÁRIOS */}
            {abaAtiva === "comentarios" && (
              <div className="space-y-4">
                {canEdit ? (
                  <form onSubmit={handleEnviarComentario} className="flex gap-2">
                    <input
                      type="text"
                      value={novoComentario}
                      onChange={(e) => setNovoComentario(e.target.value)}
                      placeholder="Adicionar nota interna sobre a obra..."
                      className="flex-1 text-xs px-3 py-2 bg-surface text-foreground border border-border-strong rounded-lg focus:outline-none focus:ring-1 focus:ring-info placeholder-subtle-foreground"
                    />
                    <Button
                      type="submit"
                      variant="primary"
                      size="sm"
                      disabled={!novoComentario.trim() || adicionarComentarioMutation.isPending}
                      className="shrink-0"
                    >
                      <Send className="w-3.5 h-3.5" />
                    </Button>
                  </form>
                ) : (
                  <div className="p-2 text-xs text-muted-foreground bg-surface-subtle border border-border-subtle rounded-lg text-center">
                    Comentários habilitados apenas para Administrador e Engenharia.
                  </div>
                )}

                {loadingComentarios && (
                  <div className="py-8 text-center text-xs text-muted-foreground">Carregando comentários...</div>
                )}

                {!loadingComentarios && comentarios && comentarios.length > 0 && (
                  <div className="space-y-2.5">
                    {comentarios.map((c) => (
                      <div key={c.id} className="p-2.5 bg-surface-subtle border border-border-subtle rounded-lg">
                        <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-1">
                          <span className="font-semibold text-foreground-muted">{c.usuario?.nome || "Colaborador"}</span>
                          <span>{formatarDataBR(c.dataRegistro)}</span>
                        </div>
                        <p className="text-xs text-foreground-muted leading-relaxed whitespace-pre-wrap">
                          {c.descricao}
                        </p>
                      </div>
                    ))}
                  </div>
                )}

                {!loadingComentarios && (!comentarios || comentarios.length === 0) && (
                  <div className="py-8 text-center text-xs text-muted-foreground border border-dashed border-border-subtle rounded-xl">
                    Nenhum comentário cadastrado para esta obra.
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Rodapé com Ações Globais */}
          <div className="pt-3 border-t border-border-subtle flex items-center justify-between">
            {canDelete ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setModalExcluirAberto(true)}
                disabled={temAlocacaoAtiva}
                className="text-destructive hover:bg-destructive-light border-destructive-border flex items-center gap-1.5"
                title={temAlocacaoAtiva ? "Obra com alocação ativa na equipe não pode ser excluída" : "Excluir obra"}
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Excluir Obra</span>
              </Button>
            ) : <div />}

            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(`/obras/${cardEfetivo.id}`)}
              className="flex items-center gap-1.5"
            >
              <span>Página da Obra</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </Drawer>

      <ModalExcluirObra
        obra={cardEfetivo}
        isOpen={modalExcluirAberto}
        onClose={() => setModalExcluirAberto(false)}
        onConfirm={handleConfirmarExclusao}
        isLoading={excluirObraMutation.isPending}
        temAlocacaoAtiva={temAlocacaoAtiva}
      />
    </>
  );
}
