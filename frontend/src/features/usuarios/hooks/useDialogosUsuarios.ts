import { useCallback, useEffect, useRef, useState } from "react";
import type { UsuariosResposta } from "../types/gestaoUsuarios";
import type { DialogoUsuario } from "../types/gestaoUsuariosUI";

export function useDialogosUsuarios(dados: UsuariosResposta | undefined) {
  const [dialogo, setDialogo] = useState<DialogoUsuario>(null);
  const [ocupado, setOcupado] = useState(false);
  const origem = useRef<HTMLElement | null>(null);
  const novo = useRef<HTMLButtonElement>(null);
  const focoFechar = useRef<number | null>(null);
  useEffect(() => () => {
    if (focoFechar.current !== null) cancelAnimationFrame(focoFechar.current);
  }, []);
  useEffect(() => {
    if (!dados) return;
    const frame = requestAnimationFrame(() => {
      if (!dialogo && origem.current && !origem.current.isConnected && document.activeElement === document.body) novo.current?.focus();
    });
    return () => cancelAnimationFrame(frame);
  }, [dados, dialogo]);
  function abrir(proximo: Exclude<DialogoUsuario, null>, acionador: HTMLElement) {
    if (focoFechar.current !== null) cancelAnimationFrame(focoFechar.current);
    origem.current = acionador;
    setDialogo(proximo);
  }
  const fechar = useCallback(() => {
    setDialogo(null);
    setOcupado(false);
    if (focoFechar.current !== null) cancelAnimationFrame(focoFechar.current);
    focoFechar.current = requestAnimationFrame(() => {
      focoFechar.current = null;
      if (!document.querySelector('dialog[open], [role="dialog"][aria-labelledby]')) (origem.current?.isConnected ? origem.current : novo.current)?.focus();
    });
  }, []);
  return { dialogo, ocupado, setOcupado, novo, abrir, fechar };
}
