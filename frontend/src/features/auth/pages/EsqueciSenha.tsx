import { useEffect, useState } from "react";
import { Mail } from "lucide-react";
import { PaginaAcesso } from "../components/PaginaAcesso";
import { Button } from "@/shared/components/ui/Button";
import { useOperacaoSenha, useGeracaoSenha } from "../hooks/useOperacaoSenha";
import { solicitarRecuperacaoSenha } from "../services/senhas";
import { MENSAGEM_RECUPERACAO } from "../lib/politicaSenha";

export default function EsqueciSenha() {
  const geracao = useGeracaoSenha();
  return <Solicitacao key={geracao} />;
}
function Solicitacao() {
  const [email, setEmail] = useState("");
  const [ate, setAte] = useState(0);
  const [agora, setAgora] = useState(0);
  const [mensagem, setMensagem] = useState("");
  const [erro, setErro] = useState("");
  const [enviado, setEnviado] = useState(false);
  const operacao = useOperacaoSenha();
  useEffect(() => {
    if (!ate) return;
    const atualizar = () => setAgora(Date.now());
    const timer = window.setInterval(atualizar, 250);
    window.addEventListener("focus", atualizar);
    return () => { clearInterval(timer); window.removeEventListener("focus", atualizar); };
  }, [ate]);
  const segundos = Math.max(0, Math.ceil((ate - agora) / 1000));

  function enviarSolicitacao() {
    if (segundos || operacao.pendente) return;
    setErro("");
    void operacao.executar(signal => solicitarRecuperacaoSenha({ email }, { signal })).then(resposta => {
      if (!resposta) return;
      const inicio = Date.now();
      setAte(inicio + 30000);
      setAgora(inicio);
      setMensagem(MENSAGEM_RECUPERACAO);
      setEnviado(true);
    }).catch(() => {
      if (operacao.vigente()) setErro("Não foi possível confirmar a solicitação. Tente novamente.");
    });
  }

  return (
    <PaginaAcesso titulo="Recuperar senha" subtitulo="Enviaremos um link de redefinição para seu e-mail.">
      {enviado ? (
        <div className="space-y-4">
          <div role="status" className="rounded-lg border border-success-border bg-success-light px-3.5 py-3 text-xs text-foreground-secondary leading-relaxed space-y-1.5">
            <span className="flex items-center gap-2 text-success font-semibold text-sm">
              <Mail className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span>Instruções enviadas</span>
            </span>
            <span className="block">{mensagem}</span>
          </div>
          {erro && (
            <p role="alert" className="rounded-lg bg-destructive-light border border-destructive-border px-3.5 py-3 text-xs leading-relaxed text-destructive">
              {erro}
            </p>
          )}
          <div className="flex flex-wrap items-center gap-3">
            <Button
              type="button"
              variant="outline"
              className="flex-1 h-11 tabular-nums"
              disabled={operacao.pendente || segundos > 0}
              onClick={enviarSolicitacao}
            >
              {operacao.pendente ? "Enviando..." : segundos > 0 ? `Reenviar em ${segundos}s` : "Reenviar instruções"}
            </Button>
            <button
              type="button"
              onClick={() => { setEnviado(false); setErro(""); }}
              className="h-11 px-3 text-xs font-medium text-muted-foreground hover:text-foreground underline cursor-pointer rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              Alterar e-mail
            </button>
          </div>
        </div>
      ) : (
        <form
          className="space-y-4"
          onSubmit={e => {
            e.preventDefault();
            enviarSolicitacao();
          }}
        >
          <div className="space-y-1.5">
            <label htmlFor="email-recuperacao" className="block text-sm font-medium text-foreground-secondary">
              E-mail corporativo
            </label>
            <input
              id="email-recuperacao"
              name="email"
              type="email"
              required
              autoComplete="email"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              enterKeyHint="done"
              placeholder="seu.email@zlengenharia.com"
              value={email}
              disabled={operacao.pendente}
              onChange={e => setEmail(e.target.value)}
              className="w-full h-11 rounded-lg border border-border-strong bg-surface-subtle px-3.5 text-sm text-foreground placeholder:text-muted-foreground focus:bg-surface user-invalid:border-destructive transition-colors"
            />
          </div>
          {erro && (
            <p role="alert" className="rounded-lg bg-destructive-light border border-destructive-border px-3.5 py-3 text-xs leading-relaxed text-destructive">
              {erro}
            </p>
          )}
          <Button type="submit" className="h-11 w-full" disabled={operacao.pendente || segundos > 0}>
            {operacao.pendente ? "Enviando..." : "Enviar instruções"}
          </Button>
          {segundos > 0 && <p className="text-xs text-muted-foreground">Novo envio disponível em {segundos} segundos.</p>}
        </form>
      )}
    </PaginaAcesso>
  );
}
