import { useState, useEffect, useRef, useCallback, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import {
  Zap,
  Calendar,
  Clock,
  ExternalLink,
  Trash2,
  Tag,
  Sun,
} from "lucide-react";
import type { ObraCard, Programacao } from "@/types";
import { COLUNAS_KANBAN } from "@/shared/constants/kanbanStatus";
import {
  formatarDiasUteis,
  formatarDataBR,
} from "@/shared/lib/formatters";
import { useHomologacao } from "@/features/obras/hooks/useObras";
import { ConfirmDialog } from "@/shared/components/feedback/ConfirmDialog";
import { Drawer } from "@/shared/components/ui/Drawer";
import { diasUteisCivis } from "@/shared/lib/datasCivis";
import type { TarefaAlocacaoBase, FaseReagendamento } from "@/features/cronograma/types/gavetaGantt";
import { FormularioReagendamento } from "@/features/cronograma/components/drawer/FormularioReagendamento";
import { ReatribuicaoEquipe } from "@/features/cronograma/components/drawer/ReatribuicaoEquipe";
import { PainelProntidao } from "@/features/cronograma/components/drawer/PainelProntidao";

export interface TarefaDetalhes extends TarefaAlocacaoBase {
  obra?: ObraCard;
}

interface GanttTaskDrawerProps {
  tarefa: TarefaDetalhes | null;
  onClose: () => void;
  canEdit: boolean;
  onDesalocar: (id: number) => void;
  equipes?: { id: number; nome: string }[];
  programacoes?: Programacao[];
  onMudarEquipe?: (id: number, novaEquipeId: number) => Promise<void>;
  renderizarAcoesObra?: (obraId: number) => ReactNode;
  onReagendar?: (id: number, novaDataInicio: string) => Promise<boolean | null>;
  reagendamentoBloqueado?: boolean;
  reagendamentoFase?: FaseReagendamento;
  avisoReagendamento?: string | null;
  focoRetorno?: () => HTMLElement | null;
}

const DEFAULT_PROGRAMACOES: Programacao[] = [];

export function GanttTaskDrawer({
  tarefa,
  onClose,
  canEdit,
  onDesalocar,
  equipes,
  programacoes = DEFAULT_PROGRAMACOES,
  onMudarEquipe,
  renderizarAcoesObra,
  onReagendar,
  reagendamentoBloqueado = false,
  reagendamentoFase = "livre",
  avisoReagendamento = null,
  focoRetorno,
}: GanttTaskDrawerProps) {
  const navigate = useNavigate();
  const [confirmarDesalocacao, setConfirmarDesalocacao] = useState(false);

  const botaoDesalocarRef = useRef<HTMLButtonElement>(null);
  const desalocandoRef = useRef(false);
  const podeRestaurarFocoDesalocacao = useCallback(() => !desalocandoRef.current, []);

  const { data: homologacao, isLoading: carregandoHomologacao } = useHomologacao(
    tarefa?.obraId
  );

  useEffect(() => {
    if (tarefa) {
      document.querySelectorAll(".gantt_tooltip").forEach((el) => el.remove());
    }
  }, [tarefa]);

  if (!tarefa) return null;

  const { obra } = tarefa;

  const statusObraLabel = obra
    ? COLUNAS_KANBAN.find((c) => c.id === obra.status)?.label ||
      (obra.status === "Assistencia" ? "Assistência / Manutenção" : obra.status)
    : "Obra não encontrada";

  return (
    <>
      <Drawer
        isOpen={Boolean(tarefa)}
        onClose={onClose}
        tamanho="md"
        gerenciarFoco={true}
        focoSuspenso={confirmarDesalocacao}
        focoRetorno={focoRetorno}
        ariaLabel={`Detalhes da alocação: ${tarefa.nomeCliente} — Equipe ${tarefa.nomeEquipe}`}
        acoesHeader={renderizarAcoesObra && tarefa?.obraId ? renderizarAcoesObra(tarefa.obraId) : undefined}
        headerCustomizado={
          <div className="flex items-center justify-between flex-1 pr-2">
            <div>
              <span className="text-[11px] font-semibold text-info tracking-wider uppercase">
                {tarefa.nomeEquipe}
              </span>
              <h2 className="text-base font-bold text-foreground-secondary leading-snug">
                {tarefa.nomeCliente}
              </h2>
            </div>
          </div>
        }
      >
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          <div className="bg-surface-subtle rounded-xl p-4 border border-border-subtle space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground font-medium">Status da Obra</span>
              <span className="px-2.5 py-1 bg-surface border border-border-subtle text-foreground-muted font-semibold rounded-full shadow-2xs">
                {statusObraLabel}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-border-subtle/60">
              <div className="flex items-center gap-2 text-xs">
                <Sun className="w-4 h-4 text-warning shrink-0" />
                <div>
                  <span className="text-muted-foreground block text-[10px]">Painéis</span>
                  <span className="font-bold text-foreground-muted">
                    {tarefa.paineis ?? "N/D"} un.
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 text-xs">
                <Tag className="w-4 h-4 text-info shrink-0" />
                <div>
                  <span className="text-muted-foreground block text-[10px]">Categoria</span>
                  <span className="font-bold text-foreground-muted">
                    {obra?.categoria ?? "N/D"}
                  </span>
                </div>
              </div>

              {obra?.dataFimEstimada && (
                <div className="col-span-2 flex items-center justify-between text-xs pt-2 border-t border-border-subtle/60 text-muted-foreground">
                  <span className="text-[11px] text-muted-foreground">Término Contratual:</span>
                  <strong className="text-foreground-secondary font-semibold">{formatarDataBR(obra.dataFimEstimada)}</strong>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="text-xs font-bold text-foreground-secondary uppercase tracking-wider flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              <span>Datas Programadas</span>
            </h3>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-surface border border-border-subtle rounded-xl shadow-2xs">
                <span className="text-muted-foreground block text-[10px] mb-0.5">Início</span>
                <span className="font-semibold text-foreground-secondary text-sm">
                  {formatarDataBR(tarefa.dataInicio)}
                </span>
              </div>

              <div className="p-3 bg-surface border border-border-subtle rounded-xl shadow-2xs">
                <span className="text-muted-foreground block text-[10px] mb-0.5">Término (Último dia)</span>
                <span className="font-semibold text-foreground-secondary text-sm">
                  {formatarDataBR(tarefa.dataFim)}
                </span>
              </div>
            </div>

            <div className="p-3 bg-info-light/60 border border-info-border rounded-xl flex items-center justify-between text-xs text-info">
              <span className="flex items-center gap-1.5 font-medium">
                <Clock className="w-4 h-4 text-info" /> Duração Útil (pelas datas):
              </span>
              <span className="font-bold">
                {formatarDiasUteis(
                  diasUteisCivis(tarefa.dataInicio, tarefa.dataFim)
                )}
              </span>
            </div>

            {/* Formulário Acessível de Edição da Data Inicial */}
            <FormularioReagendamento
              tarefaId={tarefa.id}
              dataInicio={tarefa.dataInicio}
              canEdit={canEdit}
              onCancelar={onClose}
              onReagendar={onReagendar}
              reagendamentoBloqueado={reagendamentoBloqueado}
              reagendamentoFase={reagendamentoFase}
              avisoReagendamento={avisoReagendamento}
            />
          </div>

          {/* Troca Rápida de Equipe */}
          <ReatribuicaoEquipe
            tarefaId={tarefa.id}
            equipeId={tarefa.equipeId}
            dataInicio={tarefa.dataInicio}
            dataFim={tarefa.dataFim}
            equipes={equipes}
            programacoes={programacoes}
            onMudarEquipe={onMudarEquipe}
            canEdit={canEdit}
          />

          {/* Prontidão para Execução */}
          <PainelProntidao
            materialStatus={obra?.status}
            carregandoHomologacao={carregandoHomologacao}
            parecerHomologacao={homologacao?.parecerAcesso}
            registroTecnico={homologacao?.artTrt}
            prazoVistoria={homologacao?.prazoVistoria}
          />
        </div>

        <div className="p-4 border-t border-border-subtle bg-surface-subtle/60 flex items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                onClose();
                void navigate(`/obras/${tarefa.obraId}`);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-foreground-muted bg-surface border border-border-subtle rounded-lg hover:bg-surface-subtle transition-colors shadow-2xs cursor-pointer"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Ver Obra</span>
            </button>

            {canEdit && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  void navigate(`/acompanharhomologacao?obraId=${tarefa.obraId}`);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-info bg-info-light border border-info-border rounded-lg hover:bg-info-border/40 transition-colors cursor-pointer"
                title="Acompanhar homologação na concessionária"
              >
                <Zap className="w-3.5 h-3.5" />
                <span>Homologação</span>
              </button>
            )}
          </div>

          {canEdit && (
            <button
              ref={botaoDesalocarRef}
              type="button"
              onClick={() => {
                desalocandoRef.current = false;
                setConfirmarDesalocacao(true);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-destructive bg-destructive-light hover:bg-destructive-border/40 border border-destructive-border rounded-lg transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Desalocar</span>
            </button>
          )}
        </div>
      </Drawer>

      <ConfirmDialog
        isOpen={confirmarDesalocacao}
        gerenciarFoco={true}
        origemFoco={botaoDesalocarRef}
        podeRestaurarFoco={podeRestaurarFocoDesalocacao}
        onClose={() => setConfirmarDesalocacao(false)}
        onConfirm={() => {
          desalocandoRef.current = true;
          onDesalocar(tarefa.id);
          setConfirmarDesalocacao(false);
          onClose();
        }}
        titulo="Confirmar Desalocação"
        descricao={`Deseja realmente remover a alocação da obra "${tarefa.nomeCliente}" da equipe ${tarefa.nomeEquipe}? A obra continuará cadastrada no sistema.`}
        labelConfirmar="Sim, Desalocar"
        variant="danger"
      />
    </>
  );
}

export default GanttTaskDrawer;
