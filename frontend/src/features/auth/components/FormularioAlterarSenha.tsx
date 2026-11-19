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
  const [tentouEnviar, setTentouEnviar] = useState(false);
  const [revisaoCampos, setRevisaoCampos] = useState(0);
  const operacao = useOperacaoSenha();
  const navigate = useNavigate();
  const client = useQueryClient();
  const limpar = () => { setAtual(""); setNova(""); setConfirmar(""); setErro(""); setTentouEnviar(false); setRevisaoCampos(versao => versao + 1); };
  const valida = Boolean(atual) && senhaValida(nova) && nova !== atual && nova === confirmar;
  return <form noValidate className="space-y-4 max-w-lg" onSubmit={e => {
    e.preventDefault(); if (operacao.pendente) return;
    setTentouEnviar(true);
    if (!valida) { setErro("Revise a senha atual, os requisitos da nova senha e sua confirmação."); document.getElementById(!atual ? "senha-atual" : !senhaValida(nova) || nova === atual ? "nova-senha" : "confirmar-senha")?.focus(); return; }
    setErro("");
    void operacao.executar(signal => alterarSenha({ senhaAtual: atual, novaSenha: nova }, { signal, sessao: geracao })).then(resposta => {
      if (!resposta || !encerrarSessaoSenha(client, geracao)) return;
      limpar();
      toast.success("Senha alterada com sucesso. Acesse novamente com sua nova senha.");
      void navigate("/login", { replace: true });
    }).catch((error: unknown) => { if (operacao.vigente()) setErro(error instanceof Error ? error.message : "Não foi possível confirmar a troca."); });
  }}>
    <CampoSenha key={`atual-${revisaoCampos}`} id="senha-atual" erro={tentouEnviar && !atual} descricaoId={tentouEnviar && !atual ? "erro-alterar-senha" : undefined} label="Senha atual" autoComplete="current-password" value={atual} onChange={setAtual} disabled={operacao.pendente} />
    <CamposNovaSenha key={`novas-${revisaoCampos}`} validar={tentouEnviar} erroNova={nova && atual === nova ? "A nova senha não pode ser igual à senha atual." : undefined} nova={nova} confirmar={confirmar} onNova={setNova} onConfirmar={setConfirmar} disabled={operacao.pendente} />
    {erro && <p id="erro-alterar-senha" role="alert" className="text-sm text-destructive">{erro}</p>}
    <div className="flex flex-wrap gap-3">
      <Button className="min-h-11" type="submit" disabled={operacao.pendente}>{operacao.pendente ? "Salvando..." : "Salvar nova senha"}</Button>
      <Button className="min-h-11" variant="outline" disabled={operacao.pendente} onClick={limpar}>Cancelar</Button>
    </div>
  </form>;
}
