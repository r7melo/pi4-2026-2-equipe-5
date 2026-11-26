import { useState, type KeyboardEvent, type FocusEvent } from "react";
import { Clock, ShoppingCart, Truck, CheckCircle, Wrench, Trash2, X } from "lucide-react";
import type { StatusLogistico } from "@/shared/types/materiais";
import { STATUS_LOGISTICO_OPCOES } from "@/shared/constants/statusLogistico";

interface BarraLoteMateriaisProps {
  podeAlterarStatus: boolean;
  onAplicarStatus: (status: StatusLogistico) => void;
  onSolicitarExclusao: () => void;
  onLimparSelecao: () => void;
}

const ICONE_POR_STATUS: Partial<Record<StatusLogistico, typeof ShoppingCart>> = {
  EmSolicitacao: Clock,
  Comprado: ShoppingCart,
  EmTransito: Truck,
  Disponivel: CheckCircle,
  Utilizado: Wrench,
};

export function BarraLoteMateriais({
  podeAlterarStatus,
  onAplicarStatus,
  onSolicitarExclusao,
  onLimparSelecao,
}: BarraLoteMateriaisProps) {
  const [indiceFoco, setIndiceFoco] = useState(0);
  const suportaFocusgroupNativo =
    typeof HTMLElement !== "undefined" && "focusGroup" in HTMLElement.prototype;
  const etapasLote = podeAlterarStatus ? STATUS_LOGISTICO_OPCOES : [];
  const totalBotoes = etapasLote.length + 2;
  const indiceAtivo = indiceFoco < totalBotoes ? indiceFoco : 0;

  const tabIndexFallback = (idx: number) =>
    suportaFocusgroupNativo ? undefined : indiceAtivo === idx ? 0 : -1;

  const handleFocusCapture = (e: FocusEvent<HTMLDivElement>) => {
    if (e.target instanceof HTMLButtonElement && !e.target.disabled) {
      const idx = Number(e.target.dataset.toolbarIndex);
      if (!Number.isNaN(idx)) setIndiceFoco(idx);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const botoes = Array.from(
      e.currentTarget.querySelectorAll<HTMLButtonElement>("button:not(:disabled)")
    );
    if (botoes.length === 0) return;

    const atual = botoes.indexOf(document.activeElement as HTMLButtonElement);
    let proximo = -1;
    if (e.key === "ArrowRight") {
      proximo = atual === -1 ? 0 : (atual + 1) % botoes.length;
    } else if (e.key === "ArrowLeft") {
      proximo = atual === -1 ? botoes.length - 1 : (atual - 1 + botoes.length) % botoes.length;
    } else if (e.key === "Home") {
      proximo = 0;
    } else if (e.key === "End") {
      proximo = botoes.length - 1;
    }

    if (proximo === -1) return;
    e.preventDefault();
    e.stopPropagation();

    const destino = botoes[proximo];
    const idx = Number(destino.dataset.toolbarIndex);
    if (!Number.isNaN(idx)) setIndiceFoco(idx);
    destino.focus();
  };

  const indiceExcluir = etapasLote.length;
  const indiceLimpar = etapasLote.length + 1;

  return (
    <div
      className="sticky bottom-1 mx-auto mt-4 w-fit max-w-full overflow-x-auto bg-surface text-foreground border border-border-strong rounded-full px-2.5 py-1.5 flex items-center gap-1.5 shadow-lg z-30 animate-in fade-in slide-in-from-bottom-2 duration-150 whitespace-nowrap"
      role="toolbar"
      aria-label="Ações em lote para insumos selecionados"
      focusgroup="toolbar wrap"
      onFocusCapture={suportaFocusgroupNativo ? undefined : handleFocusCapture}
      onKeyDown={suportaFocusgroupNativo ? undefined : handleKeyDown}
    >
      {podeAlterarStatus && (
        <>
          <div
            role="group"
            aria-label="Alterar status dos insumos selecionados"
            className="flex items-center gap-1"
          >
            {etapasLote.map(({ valor, rotulo, classeBotaoLote }, idx) => {
              const Icone = ICONE_POR_STATUS[valor] ?? ShoppingCart;
              const tituloAcao = `Definir selecionados como ${rotulo}`;
              return (
                <button
                  key={valor}
                  type="button"
                  data-toolbar-index={idx}
                  tabIndex={tabIndexFallback(idx)}
                  onClick={() => onAplicarStatus(valor)}
                  className={`controle-compacto w-7 h-7 rounded-full border flex items-center justify-center transition-all motion-safe:hover:scale-105 cursor-pointer ${classeBotaoLote}`}
                  title={tituloAcao}
                  aria-label={tituloAcao}
                >
                  <Icone className="w-3.5 h-3.5" aria-hidden="true" />
                </button>
              );
            })}
          </div>

          <span
            role="separator"
            aria-orientation="vertical"
            className="h-4 border-l border-border-subtle mx-0.5 shrink-0"
          />
        </>
      )}

      <div
        role="group"
        aria-label="Exclusão e limpeza da seleção"
        className="flex items-center gap-1"
      >
        <button
          type="button"
          data-toolbar-index={indiceExcluir}
          tabIndex={tabIndexFallback(indiceExcluir)}
          onClick={onSolicitarExclusao}
          className="controle-compacto w-7 h-7 rounded-full border border-destructive-border bg-surface text-destructive hover:bg-destructive-light flex items-center justify-center transition-all motion-safe:hover:scale-105 cursor-pointer"
          title="Excluir insumos selecionados"
          aria-label="Excluir insumos selecionados"
        >
          <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
        </button>

        <button
          type="button"
          data-toolbar-index={indiceLimpar}
          tabIndex={tabIndexFallback(indiceLimpar)}
          onClick={onLimparSelecao}
          className="controle-compacto w-7 h-7 rounded-full border border-border-subtle bg-surface text-muted-foreground hover:text-foreground hover:bg-surface-subtle flex items-center justify-center transition-all motion-safe:hover:scale-105 cursor-pointer"
          title="Desmarcar seleção"
          aria-label="Desmarcar seleção"
        >
          <X className="w-3.5 h-3.5 stroke-[2.5]" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
