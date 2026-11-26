import { useState, type ReactNode } from "react";
import { Save } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/shared/components/ui/Button";
import { Badge } from "@/shared/components/ui/Badge";
import { DateInputBR } from "@/shared/components/ui/DateInputBR";
import { dataBRParaIso, isoParaDataBR } from "@/shared/lib/datasBrasileiras";
import { cn } from "@/shared/lib/utils";
import type {
  ObraKanbanCard,
  ObraDetalheKanban,
  EditarObraKanbanPayload,
  EquipeAlocadaResumo,
} from "../../types/gavetaKanban";

interface AbaDadosObraProps {
  card: ObraKanbanCard;
  detalhe?: ObraDetalheKanban;
  canEdit: boolean;
  equipeAlocada: EquipeAlocadaResumo | null;
  loadingDetalhe: boolean;
  onSalvar?: (id: number, payload: EditarObraKanbanPayload) => Promise<void>;
  isSalvando?: boolean;
  renderSecaoEquipe?: (canEdit: boolean) => ReactNode;
}

export function AbaDadosObra({
  card,
  detalhe,
  canEdit,
  equipeAlocada,
  loadingDetalhe,
  onSalvar,
  isSalvando = false,
  renderSecaoEquipe,
}: AbaDadosObraProps) {
  const [formDados, setFormDados] = useState({
    endereco: detalhe?.endereco ?? card.endereco ?? "",
    quantidadePaineis: detalhe?.quantidadePaineis ?? card.quantidadePaineis ?? 0,
    quantidadeInversores:
      detalhe?.quantidadeInversores !== undefined ? String(detalhe.quantidadeInversores) : "",
    previsaoFim: isoParaDataBR(detalhe?.dataFimEstimada ?? card.dataFimEstimada),
    observacoes: detalhe?.descricao ?? detalhe?.observacoes ?? card.observacoes ?? "",
  });

  const [erroEndereco, setErroEndereco] = useState(false);
  const [erroPrevisao, setErroPrevisao] = useState(false);

  const integrantes = equipeAlocada?.integrantes ?? [];
  const previstas = equipeAlocada?.pessoasPrevistas ?? 0;
  const alocados = equipeAlocada?.pessoasAlocadas ?? integrantes.length;
  const faltantes = equipeAlocada?.pessoasFaltantes ?? Math.max(0, previstas - alocados);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEdit || loadingDetalhe || !onSalvar) return;

    if (!formDados.endereco.trim()) {
      setErroEndereco(true);
      document.getElementById("endereco-kanban")?.focus();
      toast.error("O endereço da obra é obrigatório.");
      return;
    }

    let previsaoISO: string | undefined;
    const previsaoLimpa = formDados.previsaoFim.trim();
    if (previsaoLimpa) {
      const convertida = dataBRParaIso(previsaoLimpa);
      if (!convertida) {
        setErroPrevisao(true);
        document.getElementById("campo-abadadosobra-2")?.focus();
        toast.error("Informe uma data válida no formato dd/mm/aaaa.");
        return;
      }
      previsaoISO = convertida;
    }

    const inversoresLimpo = formDados.quantidadeInversores.trim();
    const inversoresNum = inversoresLimpo !== "" ? Number(inversoresLimpo) : undefined;

    try {
      await onSalvar(card.id, {
        endereco: formDados.endereco.trim(),
        quantidadePaineis: Number(formDados.quantidadePaineis),
        ...(inversoresNum !== undefined && Number.isFinite(inversoresNum)
          ? { quantidadeInversores: inversoresNum }
          : {}),
        dataFimEstimada: previsaoISO,
        descricao: formDados.observacoes.trim() || undefined,
      });
    } catch {
      // Erro gerenciado no onError do hook
    }
  };

  return (
    <div className="space-y-4">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="sm:col-span-3 space-y-1">
            <label htmlFor="endereco-kanban" className="text-xs font-semibold text-foreground-muted block">
              Endereço <span className="text-destructive">*</span>
            </label>
            <input
              id="endereco-kanban"
              name="endereco"
              aria-describedby={erroEndereco ? "erro-endereco-kanban" : undefined}
              type="text"
              autoComplete="street-address"
              value={formDados.endereco}
              onChange={(e) => {
                setFormDados({ ...formDados, endereco: e.target.value });
                if (erroEndereco) setErroEndereco(false);
              }}
              disabled={!canEdit || loadingDetalhe}
              aria-invalid={erroEndereco}
              className={cn(
                "w-full h-9 text-xs px-2.5 bg-surface-subtle focus:bg-surface text-foreground border rounded-lg disabled:bg-muted disabled:text-muted-foreground",
                erroEndereco ? "border-destructive" : "border-border-strong"
              )}
              placeholder="Endereço da instalação..."
            />
            {erroEndereco && (
              <p id="erro-endereco-kanban" className="text-xs text-destructive">
                O endereço da obra é obrigatório.
              </p>
            )}
          </div>

          <div className="space-y-1">
            <label htmlFor="campo-abadadosobra-1" className="text-xs font-semibold text-foreground-muted block">
              Painéis
            </label>
            <input
              id="campo-abadadosobra-1"
              type="number"
              min="1"
              step="1"
              value={formDados.quantidadePaineis}
              onChange={(e) => setFormDados({ ...formDados, quantidadePaineis: Number(e.target.value) })}
              disabled={!canEdit || loadingDetalhe}
              className="w-full h-9 text-xs px-2.5 bg-surface-subtle focus:bg-surface text-foreground border border-border-strong rounded-lg tabular-nums disabled:bg-muted disabled:text-muted-foreground"
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="campo-abadadosobra-inversores" className="text-xs font-semibold text-foreground-muted block">
              Inversores
            </label>
            <input
              id="campo-abadadosobra-inversores"
              type="number"
              min="0"
              step="1"
              placeholder="—"
              value={formDados.quantidadeInversores}
              onChange={(e) => setFormDados({ ...formDados, quantidadeInversores: e.target.value })}
              disabled={!canEdit || loadingDetalhe}
              className="w-full h-9 text-xs px-2.5 bg-surface-subtle focus:bg-surface text-foreground border border-border-strong rounded-lg tabular-nums disabled:bg-muted disabled:text-muted-foreground"
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="campo-abadadosobra-2" className="text-xs font-semibold text-foreground-muted block">
              Previsão de Término
            </label>
            <DateInputBR
              id="campo-abadadosobra-2"
              valor={formDados.previsaoFim}
              onChange={(valor) => {
                setFormDados({ ...formDados, previsaoFim: valor });
                if (erroPrevisao) setErroPrevisao(false);
              }}
              tamanho="md"
              invalido={erroPrevisao}
              aria-describedby={erroPrevisao ? "erro-previsao-kanban" : undefined}
              disabled={!canEdit || loadingDetalhe}
              className={cn(
                !erroPrevisao && "border-border-strong",
                "disabled:bg-muted disabled:text-muted-foreground"
              )}
            />
            {erroPrevisao && (
              <p id="erro-previsao-kanban" className="text-xs text-destructive">
                Data inválida. Use dd/mm/aaaa.
              </p>
            )}
          </div>
        </div>

        <div className="space-y-1">
          <label htmlFor="campo-abadadosobra-obs" className="text-xs font-semibold text-foreground-muted block">
            Observações de campo
          </label>
          <textarea
            id="campo-abadadosobra-obs"
            rows={3}
            value={formDados.observacoes}
            onChange={(e) => setFormDados({ ...formDados, observacoes: e.target.value })}
            disabled={!canEdit || loadingDetalhe}
            className="w-full text-xs p-2.5 bg-surface-subtle focus:bg-surface text-foreground border border-border-strong rounded-lg disabled:bg-muted disabled:text-muted-foreground placeholder-subtle-foreground"
            placeholder="Adicione observações de acesso, telhado ou orientações para a equipe..."
          />
        </div>

        {canEdit && onSalvar ? (
          <div className="flex justify-end">
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={isSalvando || loadingDetalhe}
              className="h-8 px-3.5 controle-compacto flex items-center gap-1.5 shrink-0"
            >
              <Save className="w-3.5 h-3.5" aria-hidden="true" />
              <span>{isSalvando ? "Salvando..." : "Salvar Alterações"}</span>
            </Button>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">
            Edição cadastral indisponível para o seu perfil (use Comentários para observações).
          </p>
        )}
      </form>

      {renderSecaoEquipe ? (
        renderSecaoEquipe(canEdit)
      ) : (
        <section className="space-y-2.5 pt-3 border-t border-border-subtle">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-xs font-semibold text-foreground">Equipe temporal</h3>
            {equipeAlocada ? (
              faltantes > 0 ? (
                <Badge variante="warning" tamanho="sm" className="tabular-nums">
                  {alocados}/{previstas} · Falta {faltantes}
                </Badge>
              ) : (
                <Badge variante="success" tamanho="sm" className="tabular-nums">
                  {alocados}/{previstas} · Completa
                </Badge>
              )
            ) : (
              <Badge variante="neutral" tamanho="sm">
                Sem programação
              </Badge>
            )}
          </div>

          {integrantes.length > 0 ? (
            <div className="rounded-lg bg-surface-subtle divide-y divide-border-subtle text-xs">
              {integrantes.map((inst) => {
                const entCurto = isoParaDataBR(inst.dataEntrada).slice(0, 5);
                const saiCurto = isoParaDataBR(inst.dataSaida).slice(0, 5);
                const janelaInst = entCurto && saiCurto ? `${entCurto} – ${saiCurto}` : entCurto || saiCurto;
                return (
                  <div key={inst.usuarioId} className="px-3.5 py-2.5 flex items-center justify-between gap-2">
                    <span className="font-medium text-foreground truncate">{inst.nome}</span>
                    {janelaInst && (
                      <span className="text-[11px] text-muted-foreground tabular-nums shrink-0">{janelaInst}</span>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground rounded-lg bg-surface-subtle px-3.5 py-2.5">
              Nenhum instalador alocado para esta obra no cronograma.
            </p>
          )}
        </section>
      )}
    </div>
  );
}
