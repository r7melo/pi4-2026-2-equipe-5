import { useEffect, useState } from "react";
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
  const operacao = useOperacaoSenha();
  useEffect(() => {
    if (!ate) return;
    const atualizar = () => setAgora(Date.now());
    const timer = window.setInterval(atualizar, 250);
    window.addEventListener("focus", atualizar);
    return () => { clearInterval(timer); window.removeEventListener("focus", atualizar); };
  }, [ate]);
  const segundos = Math.max(0, Math.ceil((ate - agora) / 1000));
  return <PaginaAcesso titulo="Recuperar senha">
    <p className="text-sm text-foreground-secondary">Informe seu e-mail para receber as instruções de redefinição.</p>
    <form className="space-y-4" onSubmit={e => {
      e.preventDefault(); if (segundos || operacao.pendente) return;
      setErro("");
      void operacao.executar(signal => solicitarRecuperacaoSenha({ email }, { signal })).then(resposta => {
        if (!resposta) return;
        const inicio = Date.now(); setAte(inicio + 30000); setAgora(inicio); setMensagem(MENSAGEM_RECUPERACAO);
      }).catch(() => { if (operacao.vigente()) setErro("Não foi possível confirmar a solicitação. Tente novamente."); });
    }}>
      <label htmlFor="email-recuperacao" className="block text-sm font-medium">E-mail</label>
      <input id="email-recuperacao" type="email" required autoComplete="email" value={email} disabled={operacao.pendente}
        onChange={e => setEmail(e.target.value)} className="w-full rounded-lg border border-border-strong bg-surface px-3 py-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary" />
      <Button type="submit" className="min-h-11 w-full" disabled={operacao.pendente || segundos > 0}>{operacao.pendente ? "Enviando..." : "Enviar instruções"}</Button>
    </form>
    {segundos > 0 && <p className="text-sm text-muted-foreground">Novo envio disponível em {segundos} segundos.</p>}
    {mensagem && <p role="status" className="text-sm text-foreground-secondary">{mensagem}</p>}
    {erro && <p role="alert" className="text-sm text-destructive">{erro}</p>}
  </PaginaAcesso>;
}
