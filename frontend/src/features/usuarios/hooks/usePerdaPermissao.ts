import { useEffect } from "react";
import { toast } from "sonner";
import { erroDaSessaoAnterior, sessaoOperacionalVigente, statusHttp } from "@/shared/lib/sessaoOperacao";
import { useSessaoUsuarios } from "./useSessaoUsuarios";

/** Descarta a interface da operação somente para uma negativa da sessão atual. */
export function usePerdaPermissao(erro: unknown, aoNegado: () => void) {
  const sessao = useSessaoUsuarios();
  useEffect(() => {
    if (statusHttp(erro) !== 403 || erroDaSessaoAnterior(erro)) return;
    const frame = requestAnimationFrame(() => { if (sessaoOperacionalVigente(sessao) && !erroDaSessaoAnterior(erro)) { toast.error("Você não possui permissão para visualizar este recurso.", { id: "acesso-proibido-403" }); aoNegado(); } });
    return () => cancelAnimationFrame(frame);
  }, [erro, sessao, aoNegado]);
}
