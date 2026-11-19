import { useLayoutEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

/** Mantém uma única região de avisos dentro do modal ativo, sem remontar seus estados. */
export function PortalAvisos({ children }: { children: ReactNode }) {
  const [host] = useState(() => typeof document === "undefined" ? null : document.createElement("div"));
  useLayoutEffect(() => {
    if (!host) return;
    const sincronizar = () => {
      const modais = document.querySelectorAll<HTMLDialogElement>("dialog:modal");
      const destino = modais.item(modais.length - 1) ?? document.body;
      if (host.parentElement !== destino) destino.appendChild(host);
    };
    const observer = new MutationObserver(sincronizar);
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["open"] });
    sincronizar();
    return () => { observer.disconnect(); host.remove(); };
  }, [host]);
  return host ? createPortal(children, host) : null;
}
