import { useRef, useState } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/shared/components/feedback/ConfirmDialog";
import { Button } from "@/shared/components/ui/Button";
import { ApiErro } from "@/shared/api/api";
import { capturarSessaoOperacional, sessaoOperacionalVigente, erroDaSessaoAnterior } from "@/shared/lib/sessaoOperacao";
import { useStatusUsuario, useConsultaUsuario, usePerdaPermissao } from "../hooks/useGestaoUsuarios";
import { mensagemGestao } from "../services/gestaoUsuarios";
import type { StatusUsuarioProps } from "../types/gestaoUsuarios";
export function ConfirmarStatusUsuario({ usuario, onFechar, onConcluido }: StatusUsuarioProps) {
  const [base, setBase] = useState(usuario);
  const [erro, setErro] = useState(""); const [conflito, setConflito] = useState(false);
  const trava = useRef(false); const mutacao = useStatusUsuario(base.id);
  const atual = useConsultaUsuario(usuario.id, usuario.email);
  usePerdaPermissao(atual.error, onFechar);
  const acao = base.ativo ? "Inativar" : "Reativar";
  async function confirmar() {
    if (trava.current || conflito) return; trava.current = true;
    const sessao = capturarSessaoOperacional();
    try {
      await mutacao.mutateAsync({ ativo: !base.ativo, revisao: base.revisao });
      if (!sessaoOperacionalVigente(sessao)) return;
      toast.success("Status do usuário atualizado."); onConcluido();
    } catch (e) {
      if (!sessaoOperacionalVigente(sessao) || erroDaSessaoAnterior(e)) return;
      if (e instanceof ApiErro && e.status === 403) { onFechar(); return; }
      setErro(mensagemGestao(e)); if (e instanceof ApiErro && e.codigo === "USER_VERSION_CONFLICT") setConflito(true);
    } finally { trava.current = false; }
  }
  async function recarregar() {
    const sessao = capturarSessaoOperacional(); const r = await atual.refetch();
    if (!sessaoOperacionalVigente(sessao)) return;
    const u = r.data;
    if (r.isError || !u) { setErro("Não foi possível recarregar o usuário."); return; }
    setBase(u); setErro(""); setConflito(false);
  }
  return <ConfirmDialog isOpen gerenciarFoco rolagemInterna onClose={onFechar} onConfirm={() => void confirmar()} isLoading={mutacao.isPending} confirmarBloqueado={conflito}
    titulo={acao + " usuário"} labelConfirmar={acao + " usuário"} variant={base.ativo ? "danger" : "info"}
    descricao={base.ativo ? "Inativar " + base.nome + "? Novos acessos serão bloqueados e sessões anteriores serão recusadas na próxima solicitação ao sistema. Vínculos, responsabilidades e programações serão mantidos; revise-os na gestão de equipes." : "Reativar " + base.nome + "? Será necessário fazer login novamente."}
    conteudo={<div className="w-full">{erro && <p role="alert" className="text-sm text-destructive">{erro}</p>}{conflito && <Button variant="outline" onClick={() => void recarregar()}>Recarregar dados</Button>}</div>} />;
}
