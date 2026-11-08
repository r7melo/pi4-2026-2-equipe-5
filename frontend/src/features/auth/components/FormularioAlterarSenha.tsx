import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/shared/components/ui/Button";
import { CampoSenha } from "./CampoSenha";
import { CamposNovaSenha } from "./CamposNovaSenha";
import { senhaValida } from "../lib/politicaSenha";
import { encerrarSessaoSenha } from "../lib/encerrarSessaoSenha";
import { alterarSenha } from "../services/senhas";
import { useOperacaoSenha } from "../hooks/useOperacaoSenha";

export function FormularioAlterarSenha({ geracao }: { geracao: number }) {
  const [atual, setAtual] = useState("");
  const [nova, setNova] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [erro, setErro] = useState("");
  const operacao = useOperacaoSenha();
  const navigate = useNavigate();
  const client = useQueryClient();
  const limpar = () => { setAtual(""); setNova(""); setConfirmar(""); setErro(""); };
  const valida = Boolean(atual) && senhaValida(nova) && nova !== atual && nova === confirmar;
  return <form className="space-y-4 max-w-lg" onSubmit={e => {
    e.preventDefault(); if (!valida || operacao.pendente) return;
    setErro("");
    void operacao.executar(signal => alterarSenha({ senhaAtual: atual, novaSenha: nova }, { signal, sessao: geracao })).then(resposta => {
      if (!resposta || !encerrarSessaoSenha(client, geracao)) return;
      limpar();
      toast.success("Senha alterada com sucesso. Acesse novamente com sua nova senha.");
      void navigate("/login", { replace: true });
    }).catch((error: unknown) => { if (operacao.vigente()) setErro(error instanceof Error ? error.message : "Não foi possível confirmar a troca."); });
  }}>
    <CampoSenha id="senha-atual" label="Senha atual" autoComplete="current-password" value={atual} onChange={setAtual} disabled={operacao.pendente} />
    <CamposNovaSenha nova={nova} confirmar={confirmar} onNova={setNova} onConfirmar={setConfirmar} disabled={operacao.pendente} />
    {nova && atual === nova && <p role="status" className="text-sm text-destructive">A nova senha não pode ser igual à senha atual.</p>}
    {erro && <p role="alert" className="text-sm text-destructive">{erro}</p>}
    <div className="flex flex-wrap gap-3">
      <Button className="min-h-11" type="submit" disabled={!valida || operacao.pendente}>{operacao.pendente ? "Salvando..." : "Salvar nova senha"}</Button>
      <Button className="min-h-11" variant="outline" disabled={operacao.pendente} onClick={limpar}>Cancelar</Button>
    </div>
  </form>;
}
