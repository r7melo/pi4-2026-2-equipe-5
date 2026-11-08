import { useLayoutEffect, useRef, useState } from "react";
import { Monitor } from "lucide-react";
import { Button } from "@/shared/components/ui/Button";
import { useModoDisplay } from "@/shared/contexts/ModoDisplayContext";

const TEMPO_INATIVIDADE_MS = 5000;

export function SeloModoDisplay() {
  const { sair, definirAlturaSelo } = useModoDisplay();
  const seloRef = useRef<HTMLDivElement>(null);
  const sairRef = useRef<HTMLButtonElement>(null);
  const [visivel, setVisivel] = useState(true);
  useLayoutEffect(() => {
    const selo = seloRef.current;
    if (!selo) return;
    const medir = () => definirAlturaSelo(selo.getBoundingClientRect().height);
    medir();
    const observer = new ResizeObserver(medir);
    observer.observe(selo);
    const foco = document.activeElement;
    if (!foco || foco === document.body || !foco.isConnected) sairRef.current?.focus();
    return () => observer.disconnect();
  }, [definirAlturaSelo]);
  useLayoutEffect(() => {
    const selo = seloRef.current;
    if (!selo) return;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let ponteiroSobreSelo = selo.matches(":hover");
    let focoNoSelo = selo.contains(document.activeElement);
    const cancelarTimer = () => {
      if (timer !== null) clearTimeout(timer);
      timer = null;
    };
    const registrarAtividade = () => {
      cancelarTimer();
      setVisivel(true);
      if (ponteiroSobreSelo || focoNoSelo) return;
      timer = setTimeout(() => {
        timer = null;
        if (!ponteiroSobreSelo && !selo.contains(document.activeElement)) setVisivel(false);
      }, TEMPO_INATIVIDADE_MS);
    };
    const aoEntrarPonteiro = (evento: PointerEvent) => {
      if (evento.pointerType === "touch") return;
      ponteiroSobreSelo = true;
      registrarAtividade();
    };
    const aoSairPonteiro = () => {
      ponteiroSobreSelo = false;
      registrarAtividade();
    };
    const aoEntrarFoco = () => {
      focoNoSelo = true;
      registrarAtividade();
    };
    const aoSairFoco = (evento: FocusEvent) => {
      focoNoSelo = evento.relatedTarget instanceof Node && selo.contains(evento.relatedTarget);
      registrarAtividade();
    };
    selo.addEventListener("pointerenter", aoEntrarPonteiro);
    selo.addEventListener("pointerleave", aoSairPonteiro);
    selo.addEventListener("focusin", aoEntrarFoco);
    selo.addEventListener("focusout", aoSairFoco);
    window.addEventListener("pointermove", registrarAtividade, { passive: true });
    window.addEventListener("pointerdown", registrarAtividade, { passive: true });
    window.addEventListener("touchstart", registrarAtividade, { passive: true });
    window.addEventListener("keydown", registrarAtividade, true);
    registrarAtividade();
    return () => {
      cancelarTimer();
      selo.removeEventListener("pointerenter", aoEntrarPonteiro);
      selo.removeEventListener("pointerleave", aoSairPonteiro);
      selo.removeEventListener("focusin", aoEntrarFoco);
      selo.removeEventListener("focusout", aoSairFoco);
      window.removeEventListener("pointermove", registrarAtividade);
      window.removeEventListener("pointerdown", registrarAtividade);
      window.removeEventListener("touchstart", registrarAtividade);
      window.removeEventListener("keydown", registrarAtividade, true);
    };
  }, []);
  return (
    <div ref={seloRef} inert={!visivel} aria-hidden={!visivel}
      className={`fixed bottom-4 right-4 z-40 flex max-w-[calc(100vw-2rem)] items-center gap-3 rounded-lg border border-border-strong bg-surface p-3 shadow-sm${visivel ? "" : " invisible"}`}>
      <Monitor className="h-5 w-5 shrink-0 text-foreground-muted" aria-hidden="true" />
      <div role="status" aria-live="polite" className="text-sm text-foreground">
        <p className="font-semibold">Modo apresentação</p>
        <p>Somente leitura</p>
        <p className="text-foreground-muted">Esc ou Sair encerra</p>
      </div>
      <Button ref={sairRef} variant="outline" onClick={() => sair()}
        className="focus-visible:ring-2 focus-visible:ring-info focus-visible:ring-offset-2 ring-offset-surface">
        Sair
      </Button>
    </div>
  );
}
