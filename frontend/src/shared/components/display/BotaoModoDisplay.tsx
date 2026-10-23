import { useEffect, useRef } from "react";
import { Maximize2, Minimize2 } from "lucide-react";
import { Button, type ButtonProps } from "@/shared/components/ui/Button";
import { useModoDisplay } from "@/shared/contexts/ModoDisplayContext";
import { cn } from "@/shared/lib/utils";

export function BotaoModoDisplay({ className }: Pick<ButtonProps, "className">) {
  const { ativo, emTransicao, ativar, sair, deveRestaurarFoco, lerEpoch } = useModoDisplay();
  const botaoRef = useRef<HTMLButtonElement>(null);
  const focoPendenteRef = useRef(ativo);
  useEffect(() => {
    if (ativo) { focoPendenteRef.current = true; return; }
    if (!deveRestaurarFoco) { focoPendenteRef.current = false; return; }
    if (emTransicao || !focoPendenteRef.current) return;
    const epochFoco = lerEpoch();
    // Aguardar o commit dos controles restaurados e a conclusão da transição nativa.
    const frame = requestAnimationFrame(() => {
      const botao = botaoRef.current;
      if (lerEpoch() === epochFoco && botao?.isConnected && !botao.disabled &&
          botao.getClientRects().length > 0) {
        focoPendenteRef.current = false;
        botao.focus();
      }
    });
    return () => cancelAnimationFrame(frame);
  }, [ativo, emTransicao, deveRestaurarFoco, lerEpoch]);
  const Icone = ativo ? Minimize2 : Maximize2;
  return (
    <Button
      ref={botaoRef}
      variant="outline"
      size="icon"
      aria-label="Modo apresentação"
      aria-pressed={ativo}
      aria-busy={emTransicao}
      disabled={emTransicao}
      title={ativo ? "Sair do modo apresentação" : "Ativar modo apresentação"}
      onClick={() => { if (ativo) sair(); else ativar(); }}
      className={cn("size-9.5 shrink-0 focus-visible:ring-2 focus-visible:ring-info focus-visible:ring-offset-2 ring-offset-surface", className)}
    >
      <Icone className="h-4 w-4" aria-hidden="true" />
    </Button>
  );
}
