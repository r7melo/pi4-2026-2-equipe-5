import { useState, useId, useRef, useCallback, useLayoutEffect } from "react";
import { ExternalLink, Package, Trash2, FileText, History, MessageSquare, AlertCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";
import { deveExibirErroLocal } from "@/shared/lib/sessaoOperacao";
import { Button } from "@/shared/components/ui/Button";
import { Drawer } from "@/shared/components/ui/Drawer";
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
  { id: "historico", label: "Histórico" },
  { id: "comentarios", label: "Comentários" },
];

export default function KanbanTaskDrawer({
  card, isOpen, onClose, renderizarAcoesObra, detalheObra,
  carregandoDetalhe = false, erroDetalhe = false, equipeAlocada = null, temAlocacaoAtiva = false,
  historico = HISTORICO_VAZIO, carregandoHistorico = false,
  comentarios = COMENTARIOS_VAZIOS, carregandoComentarios = false,
  onSalvarObra, isSalvandoObra = false, onExcluirObra, isExcluindoObra = false,
  onAdicionarComentario, isEnviandoComentario = false, focoRetorno,
  totalMateriais = 0, renderAbaMateriais,
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

  return (
    <>
      <Drawer
        isOpen={isOpen} onClose={onClose} titulo={`Obra #${card.id}`}
        acoesHeader={renderizarAcoesObra ? renderizarAcoesObra(card.id) : undefined}
        tamanho="lg"
        focoSuspenso={modalExcluirAberto || (isOpen && modalFilhoAberto)} focoRetorno={focoRetorno}
      >
        <div className="flex-1 min-h-0 flex flex-col space-y-4 p-5 overflow-hidden">
          <div className="flex items-start justify-between pb-3 border-b border-border-subtle">
            <div>
              <h2 className="text-base font-bold text-foreground-secondary">{card.clienteNome}</h2>
              <div className="flex items-center gap-2 mt-1">
                <span className={cn("text-xs font-semibold px-2 py-0.5 rounded-full border", getCategoriaBadgeStyle(card.categoria))}>
                  {card.categoria}
                </span>
                <span className="text-xs text-muted-foreground">Status: <strong>{card.status}</strong></span>
              </div>
            </div>
          </div>

          <div
            ref={tabsListRef} role="tablist" aria-label="Abas da obra" onKeyDown={handleKeyDownTabs}
            className="flex items-center border-b border-border-subtle gap-1 overflow-x-auto pb-px"
          >
            {ABAS_DRAWER.map((aba) => {
              const isAtiva = abaAtiva === aba.id;
              return (
                <button
                  key={aba.id} id={`tab-${baseId}-${aba.id}`} role="tab" type="button"
                  aria-selected={isAtiva} aria-controls={`tabpanel-${baseId}-${aba.id}`}
                  tabIndex={isAtiva ? 0 : -1} onClick={() => setAbaAtiva(aba.id)}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-2 text-xs font-semibold border-b-2 transition-colors whitespace-nowrap cursor-pointer",
                    isAtiva ? "border-info text-info bg-info-light/50" : "border-transparent text-muted-foreground hover:text-foreground-muted"
                  )}
                >
                  {aba.id === "dados" && <FileText className="w-3.5 h-3.5" />}
                  {aba.id === "materiais" && <Package className="w-3.5 h-3.5" />}
                  {aba.id === "historico" && <History className="w-3.5 h-3.5" />}
                  {aba.id === "comentarios" && <MessageSquare className="w-3.5 h-3.5" />}
                  <span>{aba.label}</span>
                  {aba.id === "materiais" && totalMateriais > 0 && (
                    <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-muted text-foreground-muted font-bold">{totalMateriais}</span>
                  )}
                  {aba.id === "comentarios" && comentarios.length > 0 && (
                    <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-muted text-foreground-muted font-bold">{comentarios.length}</span>
                  )}
                </button>
              );
            })}
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain pr-1 custom-scrollbar">
            <div
              id={`tabpanel-${baseId}-${abaAtiva}`} role="tabpanel"
              aria-labelledby={`tab-${baseId}-${abaAtiva}`} tabIndex={0} className="outline-hidden"
            >
              {abaAtiva === "dados" && (
                <>
                  {erroDetalhe && (
                    <div className="flex items-center gap-2 p-2.5 mb-3 bg-warning/10 border border-warning/20 rounded-lg text-xs text-warning">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>Não foi possível carregar os detalhes complementares da obra.</span>
                    </div>
                  )}
                  <AbaDadosObra
                    key={`${card.id}-${detalheObra?.id ?? "carregando"}-${isOpen}`}
                    card={card} detalhe={detalheObra} canEdit={canEdit} equipeAlocada={equipeAlocada}
                    loadingDetalhe={carregandoDetalhe} onSalvar={onSalvarObra} isSalvando={isSalvandoObra}
                  />
                </>
              )}
              {abaAtiva === "materiais" && (renderAbaMateriais ? renderAbaMateriais(obraId) : null)}
              {abaAtiva === "historico" && <AbaHistoricoObra historico={historico} carregandoHistorico={carregandoHistorico} />}
              {abaAtiva === "comentarios" && (
                <AbaComentariosObra
                  obraId={obraId} canEdit={canEdit} comentarios={comentarios}
                  carregandoComentarios={carregandoComentarios}
                  onAdicionarComentario={onAdicionarComentario} isEnviandoComentario={isEnviandoComentario}
                />
              )}
            </div>
          </div>

          <div className="pt-3 border-t border-border-subtle flex items-center justify-between">
            {canDelete ? (
              <Button
                variant="outline" size="sm" onClick={() => setModalExcluirAberto(true)} disabled={temAlocacaoAtiva}
                className="text-destructive hover:bg-destructive-light border-destructive-border flex items-center gap-1.5"
                title={temAlocacaoAtiva ? "Obra com alocação ativa na equipe não pode ser excluída" : "Excluir obra"}
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Excluir Obra</span>
              </Button>
            ) : <div />}

            <Button variant="outline" size="sm" onClick={() => void navigate(`/obras/${card.id}`)} className="flex items-center gap-1.5">
              <span>Página da Obra</span>
              <ExternalLink className="w-3.5 h-3.5" />
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
