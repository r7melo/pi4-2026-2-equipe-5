import { useState, useMemo } from "react";
import {
  ExternalLink,
  Package,
  Trash2,
  FileText,
  History,
  MessageSquare,
  Send,
  Save,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import axios from "axios";
import type { ObraCard, EditarObraPayload, Equipe } from "@/types";
import { Button } from "@/components/ui/Button";
import { Drawer } from "@/components/ui/Drawer";
import { getCategoriaBadgeStyle, obterHojeLocalISO, obterValorObra } from "./kanbanUtils";
import { formatarMoeda, formatarDataBR } from "@/lib/formatters";
import ModalExcluirObra from "./ModalExcluirObra";
import { useProgramacoes } from "@/hooks/api/useProgramacoes";
import { useEquipes } from "@/hooks/api/useEquipes";
import { useMateriais } from "@/hooks/api/useMateriais";
import { useObras, useExcluirObra } from "@/hooks/api/useObras";
import {
  useHistoricoObra,
  useComentariosObra,
  useAdicionarComentario,
  useEditarObra,
} from "@/hooks/api/useObraDetalhe";
import { useAuthStore } from "@/stores/useAuthStore";
import { cn } from "@/lib/utils";

type AbaDrawer = "dados" | "materiais" | "historico" | "comentarios";

interface KanbanTaskDrawerProps {
  card: ObraCard | null;
  isOpen: boolean;
  onClose: () => void;
}

interface FormAbaDadosProps {
  card: ObraCard;
  canEdit: boolean;
  equipeAlocada: Equipe | null;
  onSalvar: (dados: EditarObraPayload) => Promise<void>;
  isSalvando: boolean;
}

function FormAbaDados({ card, canEdit, equipeAlocada, onSalvar, isSalvando }: FormAbaDadosProps) {
  const [formDados, setFormDados] = useState({
    clienteNome: card.clienteNome || "",
    endereco: card.endereco || "",
    valorTotal: obterValorObra(card),
    potenciaKwp:
      card.potenciaKwp != null
        ? card.potenciaKwp
        : Number(((card.quantidadePaineis * 550) / 1000).toFixed(1)),
    previsaoFim: card.dataFimEstimada ? String(card.dataFimEstimada).split("T")[0] : "",
    observacoes: card.observacoes || "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEdit) return;

    try {
      await onSalvar({
        clienteNome: formDados.clienteNome,
        endereco: formDados.endereco,
        valorTotal: Number(formDados.valorTotal),
        potenciaKwp: Number(formDados.potenciaKwp),
        previsaoFim: formDados.previsaoFim || undefined,
        observacoes: formDados.observacoes || undefined,
      });
    } catch {
      // Erro gerenciado no onError do hook
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-semibold text-foreground-muted mb-1 block">Nome do Cliente</label>
          <input
            type="text"
            value={formDados.clienteNome}
            onChange={(e) => setFormDados({ ...formDados, clienteNome: e.target.value })}
            disabled={!canEdit}
            className="w-full text-xs px-2.5 py-1.5 bg-surface text-foreground border border-border-strong rounded-lg focus:outline-none focus:ring-1 focus:ring-info disabled:bg-muted disabled:text-muted-foreground"
          />
        </div>

        <div>
          <label className="text-xs font-semibold text-foreground-muted mb-1 block">Endereço</label>
          <input
            type="text"
            value={formDados.endereco}
            onChange={(e) => setFormDados({ ...formDados, endereco: e.target.value })}
            disabled={!canEdit}
            className="w-full text-xs px-2.5 py-1.5 bg-surface text-foreground border border-border-strong rounded-lg focus:outline-none focus:ring-1 focus:ring-info disabled:bg-muted disabled:text-muted-foreground"
          />
        </div>

        <div>
          <label className="text-xs font-semibold text-foreground-muted mb-1 block">Potência (kWp)</label>
          <input
            type="number"
            step="0.1"
            value={formDados.potenciaKwp}
            onChange={(e) => setFormDados({ ...formDados, potenciaKwp: Number(e.target.value) })}
            disabled={!canEdit}
            className="w-full text-xs px-2.5 py-1.5 bg-surface text-foreground border border-border-strong rounded-lg focus:outline-none focus:ring-1 focus:ring-info disabled:bg-muted disabled:text-muted-foreground"
          />
        </div>

        <div>
          <label className="text-xs font-semibold text-foreground-muted mb-1 block">Valor Total (R$)</label>
          <input
            type="number"
            value={formDados.valorTotal}
            onChange={(e) => setFormDados({ ...formDados, valorTotal: Number(e.target.value) })}
            disabled={!canEdit}
            className="w-full text-xs px-2.5 py-1.5 bg-surface text-foreground border border-border-strong rounded-lg focus:outline-none focus:ring-1 focus:ring-info disabled:bg-muted disabled:text-muted-foreground"
          />
        </div>

        <div>
          <label className="text-xs font-semibold text-foreground-muted mb-1 block">Previsão de Término</label>
          <input
            type="date"
            value={formDados.previsaoFim}
            onChange={(e) => setFormDados({ ...formDados, previsaoFim: e.target.value })}
            disabled={!canEdit}
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
          disabled={!canEdit}
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
            disabled={isSalvando}
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

export default function KanbanTaskDrawer({ card, isOpen, onClose }: KanbanTaskDrawerProps) {
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
  const { data: programacoes } = useProgramacoes();
  const { data: equipes } = useEquipes();
  const { data: materiais, isLoading: loadingMateriais } = useMateriais(obraId);
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
              <span className="text-xs text-muted-foreground block">Valor da Obra</span>
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
              <FormAbaDados
                key={`${cardEfetivo.id}-${cardEfetivo.clienteNome}-${cardEfetivo.potenciaKwp}-${cardEfetivo.valorTotal}-${cardEfetivo.dataFimEstimada}-${cardEfetivo.endereco}-${isOpen}`}
                card={cardEfetivo}
                canEdit={canEdit}
                equipeAlocada={equipeAlocada}
                onSalvar={handleSalvarObra}
                isSalvando={editarObraMutation.isPending}
              />
            )}

            {/* ABA 2: MATERIAIS */}
            {abaAtiva === "materiais" && (
              <div className="space-y-3">
                {loadingMateriais && (
                  <div className="py-8 text-center text-xs text-muted-foreground">Carregando materiais da obra...</div>
                )}

                {!loadingMateriais && materiais && materiais.length > 0 && (
                  <div className="space-y-2">
                    {materiais.map((mat) => (
                      <div
                        key={mat.id}
                        className="p-2.5 bg-surface-subtle border border-border-subtle rounded-lg flex items-center justify-between"
                      >
                        <div>
                          <p className="text-xs font-semibold text-foreground-secondary">{mat.descricao || mat.tipo || "Material"}</p>
                          <span className="text-[10px] text-muted-foreground">
                            Qtd: <strong>{mat.quantidade} {mat.unidade || "un."}</strong> {mat.tipo ? `• ${mat.tipo}` : ""}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className={cn(
                            "text-[10px] font-semibold px-2 py-0.5 rounded-full border",
                            mat.statusLogistico === "Disponivel" && "bg-success-light text-success border-success-border",
                            mat.statusLogistico === "EmTransito" && "bg-info-light text-info border-info-border",
                            mat.statusLogistico === "Comprado" && "bg-warning-light text-warning border-warning-border",
                            mat.statusLogistico === "Utilizado" && "bg-muted text-foreground-muted border-border-subtle"
                          )}>
                            {mat.statusLogistico}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {!loadingMateriais && (!materiais || materiais.length === 0) && (
                  <div className="py-8 text-center text-xs text-muted-foreground border border-dashed border-border-subtle rounded-xl">
                    Nenhum material associado a esta obra.
                  </div>
                )}
              </div>
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
