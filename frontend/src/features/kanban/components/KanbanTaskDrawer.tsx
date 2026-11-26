import { useState, useId, useRef, useCallback, useLayoutEffect } from "react";
import { ExternalLink, Package, Trash2, FileText, History, MessageSquare, AlertCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";
import { deveExibirErroLocal } from "@/shared/lib/sessaoOperacao";
import { isoParaDataBR } from "@/shared/lib/datasBrasileiras";
import { Button } from "@/shared/components/ui/Button";
import { AlertBanner } from "@/shared/components/ui/AlertBanner";
import { Drawer } from "@/shared/components/ui/Drawer";
import { COLUNAS_KANBAN, TRANSICOES_VALIDAS, type StatusObra } from "@/shared/constants/kanbanStatus";
import { useAuthStore } from "@/shared/stores/useAuthStore";
import { getCategoriaBadgeStyle } from "./kanbanUtils";
import ModalExcluirObra from "./ModalExcluirObra";
import { AbaDadosObra } from "./drawer/AbaDadosObra";
import { AbaHistoricoObra } from "./drawer/AbaHistoricoObra";
import { AbaComentariosObra } from "./drawer/AbaComentariosObra";
import type { KanbanTaskDrawerProps, AbaDrawerKanban, HistoricoItemKanban, ComentarioItemKanban } from "../types/gavetaKanban";

export type { KanbanTaskDrawerProps } from "../types/gavetaKanban";
import { cn } from "@/shared/lib/utils";

const HISTORICO_VAZIO: HistoricoItemKanban[] = [];
const COMENTARIOS_VAZIOS: ComentarioItemKanban[] = [];

const ABAS_DRAWER: { id: AbaDrawerKanban; label: string }[] = [
  { id: "dados", label: "Dados" },
  { id: "materiais", label: "Materiais" },
  { id: "historico", label: "Linha do tempo" },
  { id: "comentarios", label: "Comentários" },
];

export default function KanbanTaskDrawer({
  card, isOpen, onClose, onMoverCard, renderizarAcoesObra, detalheObra,
  carregandoDetalhe = false, erroDetalhe = false, equipeAlocada = null, temAlocacaoAtiva = false,
  historico = HISTORICO_VAZIO, carregandoHistorico = false,
  comentarios = COMENTARIOS_VAZIOS, carregandoComentarios = false,
  onSalvarObra, isSalvandoObra = false, onExcluirObra, isExcluindoObra = false,
  onAdicionarComentario, isEnviandoComentario = false, focoRetorno,
  onEditarComentario, onExcluirComentario, erroComentarios, onRecarregarComentarios,
  totalMateriais = 0, renderAbaMateriais, renderSecaoEquipe,
}: KanbanTaskDrawerProps) {
  const navigate = useNavigate();
  const [abaAtiva, setAbaAtiva] = useState<AbaDrawerKanban>("dados");
  const [modalExcluirAberto, setModalExcluirAberto] = useState(false);
  const [modalFilhoAberto, setModalFilhoAberto] = useState(false);

  const obraId = card?.id ? Number(card.id) : 0;
  const chaveSessao = `${isOpen}-${obraId}`;
  const [chaveAnterior, setChaveAnterior] = useState(chaveSessao);
  if (chaveAnterior !== chaveSessao) {
    setChaveAnterior(chaveSessao);
    if (isOpen) {
      setAbaAtiva("dados");
      setModalExcluirAberto(false);
    }
  }

  const perfil = useAuthStore((s) => s.usuario?.perfil?.nomePerfil);
  const canEdit = perfil === "Administrador" || perfil === "Engenharia";
  const canDelete = canEdit && Boolean(onExcluirObra);
  const tabsListRef = useRef<HTMLDivElement>(null);
  const baseId = useId();

  useLayoutEffect(() => {
    if (!isOpen || typeof document === "undefined") return;
    const checarModais = () => {
      const dialogs = document.querySelectorAll('dialog[open], [role="dialog"][aria-modal="true"]');
      setModalFilhoAberto(dialogs.length > 1);
    };
    const interceptarFocoModalFilho = (e: FocusEvent) => {
      if (!(e.target instanceof Element)) return;
      const dialogAlvo = e.target.closest('dialog[open], [role="dialog"][aria-modal="true"]');
      const dialogs = document.querySelectorAll('dialog[open], [role="dialog"][aria-modal="true"]');
      if (dialogAlvo && dialogs.length > 1 && dialogAlvo !== dialogs[0]) {
        e.stopImmediatePropagation();
        setModalFilhoAberto(true);
      }
    };
    const controller = new AbortController();
    const observer = new MutationObserver(checarModais);
    observer.observe(document.body, { childList: true });
    window.addEventListener("focusin", interceptarFocoModalFilho, { capture: true, signal: controller.signal });
    return () => {
      observer.disconnect();
      controller.abort();
    };
  }, [isOpen]);

  const handleKeyDownTabs = useCallback((e: React.KeyboardEvent) => {
    const abas = ABAS_DRAWER.map((a) => a.id);
    const indexAtual = abas.indexOf(abaAtiva);
    let proximoIndex = -1;
    if (e.key === "ArrowRight") proximoIndex = (indexAtual + 1) % abas.length;
    else if (e.key === "ArrowLeft") proximoIndex = (indexAtual - 1 + abas.length) % abas.length;
    else if (e.key === "Home") proximoIndex = 0;
    else if (e.key === "End") proximoIndex = abas.length - 1;

    if (proximoIndex >= 0) {
      e.preventDefault();
      const proximaAba = abas[proximoIndex];
      setAbaAtiva(proximaAba);
      const botao = document.getElementById(`tab-${baseId}-${proximaAba}`) as HTMLButtonElement | null;
      botao?.focus();
    }
  }, [abaAtiva, baseId]);

  const handleConfirmarExclusao = async () => {
    if (!card || !onExcluirObra) return;
    try {
      await onExcluirObra(card.id);
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

  if (!card) return null;

  const statusAtual = detalheObra?.status ?? card.status;
  const destinosValidos = TRANSICOES_VALIDAS[statusAtual] ?? [];
  const opcoesEtapa = [statusAtual, ...destinosValidos];
  const qtdPaineis = detalheObra?.quantidadePaineis ?? card.quantidadePaineis;
  const qtdInversores = detalheObra?.quantidadeInversores;
  const inversoresResumo =
    typeof qtdInversores === "number"
      ? `${qtdInversores} ${qtdInversores === 1 ? "inversor" : "inversores"}`
      : "";
  const inicioCurto = isoParaDataBR(detalheObra?.dataInicioEstimada).slice(0, 5);
  const fimCurto = isoParaDataBR(detalheObra?.dataFimEstimada ?? card.dataFimEstimada).slice(0, 5);
  const janelaResumo =
    inicioCurto && fimCurto ? `${inicioCurto} – ${fimCurto}` : fimCurto || inicioCurto;
  const subtituloResumo = [card.cidade, `${qtdPaineis} painéis`, inversoresResumo, janelaResumo]
    .filter(Boolean)
    .join(" · ");

  const headerGaveta = (
    <div className="flex items-center gap-2 flex-wrap min-w-0 min-h-8">
      <h2 className="text-base font-semibold text-foreground truncate">{card.clienteNome}</h2>
      <span className={cn("px-2 py-0.5 rounded-full text-[11px] font-semibold border shrink-0", getCategoriaBadgeStyle(card.categoria))}>
        {card.categoria}
      </span>
    </div>
  );

  return (
    <>
      <Drawer
        isOpen={isOpen}
        onClose={onClose}
        headerCustomizado={headerGaveta}
        ariaLabel={card.clienteNome}
        labelFechar="Fechar gaveta"
        acoesHeader={renderizarAcoesObra ? renderizarAcoesObra(card.id) : undefined}
        tamanho="lg"
        focoSuspenso={modalExcluirAberto || (isOpen && modalFilhoAberto)}
        focoRetorno={focoRetorno}
      >
        <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
          <div className="px-5 pt-2.5 pb-1 bg-surface-subtle flex flex-wrap items-center justify-between gap-2 shrink-0">
            <p className="text-xs text-muted-foreground min-w-0 wrap-anywhere tabular-nums">
              {subtituloResumo}
            </p>

            <select
              aria-label="Etapa da obra"
              value={statusAtual}
              disabled={!canEdit || !onMoverCard || destinosValidos.length === 0}
              onChange={(e) => {
                const novoStatus = e.target.value as StatusObra;
                if (novoStatus !== statusAtual && onMoverCard) {
                  onMoverCard(card, novoStatus);
                }
              }}
              className="controle-compacto h-7 pl-2.5 pr-6 rounded-full text-xs font-semibold border border-border-strong bg-surface text-foreground cursor-pointer disabled:cursor-default disabled:opacity-75 shrink-0"
            >
              {opcoesEtapa.map((st) => {
                const rotulo = COLUNAS_KANBAN.find((c) => c.id === st)?.label ?? st;
                return (
                  <option key={st} value={st}>
                    {rotulo}
                  </option>
                );
              })}
            </select>
          </div>

          <div
            ref={tabsListRef} role="tablist" aria-label="Abas da obra" onKeyDown={handleKeyDownTabs}
            className="px-4 sm:px-5 border-b border-border-subtle flex items-center gap-3 overflow-x-auto text-xs font-medium shrink-0 bg-surface-subtle"
          >
            {ABAS_DRAWER.map((aba) => {
              const isAtiva = abaAtiva === aba.id;
              return (
                <button
                  key={aba.id} id={`tab-${baseId}-${aba.id}`} role="tab" type="button"
                  aria-selected={isAtiva} aria-controls={`tabpanel-${baseId}-${aba.id}`}
                  tabIndex={isAtiva ? 0 : -1} onClick={() => setAbaAtiva(aba.id)}
                  className={cn(
                    "controle-compacto py-2 px-0.5 border-b-2 whitespace-nowrap transition-colors inline-flex items-center gap-1.5 cursor-pointer shrink-0",
                    isAtiva ? "border-info text-info font-semibold" : "border-transparent text-muted-foreground hover:text-foreground"
                  )}
                >
                  {aba.id === "dados" && <FileText className="w-3.5 h-3.5" aria-hidden="true" />}
                  {aba.id === "materiais" && <Package className="w-3.5 h-3.5" aria-hidden="true" />}
                  {aba.id === "historico" && <History className="w-3.5 h-3.5" aria-hidden="true" />}
                  {aba.id === "comentarios" && <MessageSquare className="w-3.5 h-3.5" aria-hidden="true" />}
                  <span>{aba.label}</span>
                  {aba.id === "materiais" && totalMateriais > 0 && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-foreground-secondary font-bold tabular-nums">{totalMateriais}</span>
                  )}
                  {aba.id === "historico" && historico.length > 0 && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-foreground-secondary font-bold tabular-nums">{historico.length}</span>
                  )}
                  {aba.id === "comentarios" && comentarios.length > 0 && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-foreground-secondary font-bold tabular-nums">{comentarios.length}</span>
                  )}
                </button>
              );
            })}
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-5 custom-scrollbar">
            <div
              id={`tabpanel-${baseId}-${abaAtiva}`} role="tabpanel"
              aria-labelledby={`tab-${baseId}-${abaAtiva}`} tabIndex={0} className="outline-hidden"
            >
              {abaAtiva === "dados" && (
                <>
                  {erroDetalhe && (
                    <AlertBanner
                      variante="warning"
                      icone={<AlertCircle className="w-4 h-4" />}
                      className="p-2.5 mb-3"
                    >
                      Não foi possível carregar os detalhes complementares da obra.
                    </AlertBanner>
                  )}
                  <AbaDadosObra
                    key={`${card.id}-${detalheObra?.id ?? "carregando"}-${isOpen}`}
                    card={card} detalhe={detalheObra} canEdit={canEdit} equipeAlocada={equipeAlocada}
                    loadingDetalhe={carregandoDetalhe} onSalvar={onSalvarObra} isSalvando={isSalvandoObra}
                    renderSecaoEquipe={renderSecaoEquipe}
                  />
                </>
              )}
              {abaAtiva === "materiais" && (renderAbaMateriais ? renderAbaMateriais(obraId) : null)}
              {abaAtiva === "historico" && <AbaHistoricoObra historico={historico} carregandoHistorico={carregandoHistorico} />}
              {abaAtiva === "comentarios" && (
                <AbaComentariosObra
                  key={`${obraId}-${isOpen}`} obraId={obraId} comentarios={comentarios}
                  carregandoComentarios={carregandoComentarios}
                  onAdicionarComentario={onAdicionarComentario} isEnviandoComentario={isEnviandoComentario}
                  onEditarComentario={onEditarComentario} onExcluirComentario={onExcluirComentario}
                  erroComentarios={erroComentarios} onRecarregarComentarios={onRecarregarComentarios}
                />
              )}
            </div>
          </div>

          <div className="px-5 py-3 border-t border-border-subtle bg-surface-subtle flex items-center justify-between gap-2 shrink-0">
            {canDelete ? (
              <Button
                variant="outline" size="sm" onClick={() => setModalExcluirAberto(true)} disabled={temAlocacaoAtiva}
                className="h-7 px-2.5 controle-compacto border-destructive-border bg-surface text-destructive hover:bg-destructive-light flex items-center gap-1.5"
                title={temAlocacaoAtiva ? "Obra com alocação ativa na equipe não pode ser excluída" : "Excluir obra"}
              >
                <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Excluir Obra</span>
              </Button>
            ) : <div />}

            <Button variant="outline" size="sm" onClick={() => void navigate(`/obras/${card.id}`)} className="h-7 px-3 controle-compacto border-border-strong bg-surface hover:bg-muted text-foreground flex items-center gap-1.5">
              <span>Página da Obra</span>
              <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
            </Button>
          </div>
        </div>
      </Drawer>

      <ModalExcluirObra
        obra={card} isOpen={modalExcluirAberto} onClose={() => setModalExcluirAberto(false)}
        onConfirm={handleConfirmarExclusao} isLoading={isExcluindoObra} temAlocacaoAtiva={temAlocacaoAtiva}
      />
    </>
  );
}
