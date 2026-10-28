import { Fragment, useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { RotateCcw } from "lucide-react";
import type { AmbienteAplicacaoProps } from "@/shared/types/demonstracao";
import { CHAVE_CENARIO, EVENTO_CENARIO, iniciarCenario, lerBaseCenario, lerCenario, restaurarCenario } from "@/shared/api/mock/core/estadoCenario";
import { tokenDemonstracaoVigente } from "@/shared/lib/contextoDemonstracao";
import { invalidarSessaoOperacional } from "@/shared/lib/sessaoOperacao";
import { useAuthStore } from "@/features/auth/stores/useAuthStore";
import { useKanbanFilterStore } from "@/features/kanban/stores/useKanbanFilterStore";
import { useGanttStore } from "@/features/cronograma/stores/useGanttStore";
import { ConfirmDialog } from "@/shared/components/feedback/ConfirmDialog";
import FeedbackErro from "@/shared/components/feedback/FeedbackErro";
import FeedbackLoading from "@/shared/components/feedback/FeedbackLoading";

/** Montagem mock: acompanha o agregado sem importar features na infraestrutura. */
export function AmbienteDemonstracao({ children }: AmbienteAplicacaoProps) {
  const cliente = useQueryClient();
  const [geracao, setGeracao] = useState("");
  const [erro, setErro] = useState("");
  const [pronto, setPronto] = useState(false);
  const [confirmacao, setConfirmacao] = useState<{ base: string | null } | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [erroRestauro, setErroRestauro] = useState("");
  const ultima = useRef({ geracao: "", revisao: -1 });
  const trava = useRef(false);
  useEffect(() => {
    let vivo = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    function sincronizar() {
      if (!vivo) return;
      try {
        const cenario = lerCenario();
        const anterior = ultima.current;
        if (anterior.geracao !== cenario.geracao) {
          invalidarSessaoOperacional();
          const token = useAuthStore.getState().token;
          if (token && !tokenDemonstracaoVigente(token)) useAuthStore.getState().logout();
          cliente.clear();
          if (anterior.geracao) {
            toast.dismiss();
            useKanbanFilterStore.setState(useKanbanFilterStore.getInitialState(), true);
            useGanttStore.getState().limparFiltrosSalvos();
          }
          setGeracao(cenario.geracao);
        } else if (anterior.revisao !== cenario.revisao) {
          if (cliente.isMutating()) { clearTimeout(timer); timer = setTimeout(sincronizar, 100); return; }
          void cliente.invalidateQueries();
        }
        ultima.current = { geracao: cenario.geracao, revisao: cenario.revisao };
        setErro(""); setPronto(true);
      } catch (falha) { setErro(falha instanceof Error ? falha.message : "Não foi possível abrir a demonstração."); setPronto(true); }
    }
    void iniciarCenario().then(sincronizar, sincronizar);
    const storage = (evento: StorageEvent) => { if (evento.key === CHAVE_CENARIO || evento.key === null) sincronizar(); };
    window.addEventListener("storage", storage);
    window.addEventListener(EVENTO_CENARIO, sincronizar);
    window.addEventListener("focus", sincronizar);
    document.addEventListener("visibilitychange", sincronizar);
    return () => { vivo = false; clearTimeout(timer); window.removeEventListener("storage", storage); window.removeEventListener(EVENTO_CENARIO, sincronizar); window.removeEventListener("focus", sincronizar); document.removeEventListener("visibilitychange", sincronizar); };
  }, [cliente]);
  function abrir() {
    try { setErroRestauro(""); setConfirmacao({ base: lerBaseCenario() }); }
    catch { setErroRestauro("O navegador não permitiu ler a demonstração. Libere o armazenamento e tente novamente."); }
  }
  async function restaurar() {
    if (!confirmacao || trava.current) return;
    trava.current = true; setOcupado(true); setErroRestauro("");
    try {
      await restaurarCenario(confirmacao.base);
      setConfirmacao(null);
      toast.success("Demonstração restaurada. Entre novamente para continuar.");
    } catch (falha) {
      setErroRestauro(falha instanceof Error ? falha.message : "Não foi possível restaurar a demonstração.");
      // Uma confirmacao vencida exige um novo clique no controle de abertura.
      try { if (lerBaseCenario() !== confirmacao.base) setConfirmacao(null); } catch { /* Preserva a confirmacao e o acervo quando a leitura falha. */ }
    } finally { trava.current = false; setOcupado(false); }
  }
  return <>
    {!pronto ? <FeedbackLoading /> : erro ? <div className="min-h-screen bg-background-app p-6"><FeedbackErro titulo="Demonstração indisponível" mensagem={erro} /></div> : <Fragment key={geracao}>{children}</Fragment>}
    <div className="fixed bottom-14 right-4 z-40 max-w-[calc(100vw-2rem)] flex flex-col items-end pointer-events-auto">
      <button
        type="button"
        onClick={abrir}
        disabled={ocupado}
        aria-label="Restaurar demonstração"
        title="Restaurar demonstração"
        className="group flex h-8 w-8 items-center justify-center overflow-hidden rounded-full border border-border-strong bg-surface text-foreground-muted shadow-lg transition-all duration-200 ease-in-out hover:w-auto hover:border-primary hover:bg-surface-subtle hover:pr-3 hover:text-foreground focus:outline-none focus:ring-2 focus:ring-border-strong focus-visible:w-auto focus-visible:pr-3 select-none cursor-pointer disabled:opacity-50 disabled:pointer-events-none"
      >
        <span className="flex h-8 w-8 shrink-0 items-center justify-center">
          <RotateCcw className="h-3.5 w-3.5 transition-transform duration-200 group-hover:-rotate-90 group-hover:text-primary" />
        </span>
        <span className="max-w-0 overflow-hidden whitespace-nowrap text-xs font-semibold opacity-0 transition-all duration-200 ease-in-out group-hover:max-w-xs group-hover:opacity-100 group-focus-visible:max-w-xs group-focus-visible:opacity-100">
          Restaurar demonstração
        </span>
      </button>
      {erroRestauro && !confirmacao && (
        <p role="alert" className="mt-1.5 max-w-72 rounded-lg border border-destructive/20 bg-surface p-2 text-xs text-destructive shadow-md">
          {erroRestauro}
        </p>
      )}
    </div>
    <ConfirmDialog isOpen={confirmacao !== null} onClose={() => { if (!trava.current) setConfirmacao(null); }} onConfirm={() => { void restaurar(); }}
      titulo="Restaurar demonstração?" descricao="As alterações da demonstração neste navegador serão apagadas em todas as abas. Contas criadas, senhas alteradas e links serão removidos. Será necessário entrar novamente."
      labelConfirmar="Restaurar demonstração" labelCancelar="Cancelar" isLoading={ocupado} gerenciarFoco rolagemInterna
      conteudo={erroRestauro ? <p role="alert" className="mb-3 text-sm text-danger">{erroRestauro}</p> : undefined} />
  </>;
}
