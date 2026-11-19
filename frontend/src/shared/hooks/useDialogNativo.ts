import { useLayoutEffect, useRef, type RefObject } from "react";

let consumidores = 0;
let ultimoAcionador: { elemento: HTMLElement; instante: number } | null = null;
function registrarAcionador(e: Event) {
  const el = e.target instanceof Element ? e.target.closest<HTMLElement>('button, a[href], [role="button"]') : null;
  ultimoAcionador = el ? { elemento: el, instante: performance.now() } : null;
}

/** O navegador controla top layer, inert e foco; só reparamos um invocador removido. */
export function useDialogNativo(ref: RefObject<HTMLDialogElement | null>, aberto: boolean, retorno?: () => HTMLElement | null, permitirRetorno?: () => boolean) {
  const fallback = useRef(retorno);
  const permitir = useRef(permitirRetorno);
  useLayoutEffect(() => { fallback.current = retorno; });
  useLayoutEffect(() => { permitir.current = permitirRetorno; });
  useLayoutEffect(() => {
    if (consumidores++ === 0) document.addEventListener("click", registrarAcionador, true);
    return () => {
      if (--consumidores === 0) { document.removeEventListener("click", registrarAcionador, true); ultimoAcionador = null; }
    };
  }, []);
  useLayoutEffect(() => {
    const dialogo = ref.current;
    if (!aberto || !dialogo) return;
    // WebKit não foca botões ao clicar: captura o acionador real antes do evento React.
    const origem = ultimoAcionador && performance.now() - ultimoAcionador.instante < 1000 && !dialogo.contains(ultimoAcionador.elemento)
      && (document.activeElement === document.body || document.activeElement?.contains(ultimoAcionador.elemento))
      ? ultimoAcionador.elemento : document.activeElement;
    if (!dialogo.open) dialogo.showModal();
    const inicial = dialogo.querySelector<HTMLElement>("[data-autofocus]:not([disabled])");
    inicial?.focus();
    return () => {
      // No unmount, React remove o dialogo; close() antecipado restauraria foco apesar do veto.
      if (permitir.current?.() !== false) dialogo.close();
      // React pode remover o nó antes do cleanup: nessa ordem o navegador perde o invocador.
      queueMicrotask(() => {
        if (permitir.current?.() === false) return;
        if (document.activeElement === document.body && origem instanceof HTMLElement && origem.isConnected && origem.getClientRects().length > 0 && !origem.matches(":disabled") && !origem.closest("[inert]")) {
          const modais = document.querySelectorAll<HTMLDialogElement>("dialog[open]");
          const topo = modais.item(modais.length - 1);
          if (!topo || topo.contains(origem)) origem.focus();
        }
      });
      if (!(origem instanceof HTMLElement) || !origem.isConnected || origem.getClientRects().length === 0) {
        queueMicrotask(() => {
          if (permitir.current?.() === false) return;
          if (!document.querySelector("dialog[open]")) {
            (fallback.current?.() ?? document.querySelector<HTMLElement>("[data-kanban-board], #conteudo-principal"))?.focus();
          }
        });
      }
    };
  }, [aberto, ref]);
}
