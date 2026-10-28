import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ApiErro } from "@/shared/api/api";
import { Button } from "@/shared/components/ui/Button";
import { destinoInicialSeguro } from "@/shared/lib/rotasSessao";
import { PaginaAcesso } from "../components/PaginaAcesso";
import { CamposNovaSenha } from "../components/CamposNovaSenha";
import { useOperacaoSenha, useGeracaoSenha } from "../hooks/useOperacaoSenha";
import { senhaValida } from "../lib/politicaSenha";
import { encerrarSessaoSenha } from "../lib/encerrarSessaoSenha";
import { redefinirSenha, revalidarSessaoSenha } from "../services/senhas";
import { useAuthStore } from "../stores/useAuthStore";
import type { Usuario } from "@/types";

export default function RedefinirSenha() {
  const geracao = useGeracaoSenha();
  const [params] = useSearchParams();
  const token = params.get("token") || "";
  return <Redefinicao key={`${geracao}:${token}`} token={token} geracao={geracao} />;
}
function Redefinicao({ token, geracao }: { token: string; geracao: number }) {
  const [nova, setNova] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [erro, setErro] = useState("");
  const [invalido, setInvalido] = useState(!token.trim());
  const [concluida, setConcluida] = useState(false);
  const [verificada, setVerificada] = useState(false);
  const operacao = useOperacaoSenha();
  const consulta = useOperacaoSenha<Usuario | null>();
  const navigate = useNavigate();
  const client = useQueryClient();
  const revalidar = () => {
    setErro(""); setVerificada(false);
    void consulta.executar(signal => revalidarSessaoSenha({ signal, sessao: geracao })).then(usuario => {
      if (usuario) setVerificada(true);
      else if (consulta.vigente()) setErro("Não foi possível verificar a sessão atual");
    }).catch((error: unknown) => {
      if (!consulta.vigente()) return;
      if (error instanceof ApiErro && error.status === 401 && error.codigo === "UNAUTHORIZED" && encerrarSessaoSenha(client, geracao)) {
        toast.success("Senha redefinida com sucesso. Acesse novamente com sua nova senha.");
        void navigate("/login", { replace: true });
      } else setErro("Não foi possível verificar a sessão atual");
    });
  };
  return <PaginaAcesso titulo="Redefinir senha">
    {invalido ? <div className="space-y-4">
      <p role="alert">{token.trim() ? "Link inválido ou expirado" : "Link inválido ou não fornecido"}</p>
      <Link to="/esqueci-senha" className="inline-flex min-h-11 items-center underline focus-visible:ring-2 focus-visible:ring-primary">Solicitar novo link</Link>
    </div> : concluida ? <div className="space-y-4">
      <p role="status">Senha redefinida com sucesso</p>
      {erro && <p role="alert" className="text-sm text-destructive">{erro}</p>}
      <div className="flex flex-wrap gap-3">
        {verificada ? <Button onClick={() => void navigate(destinoInicialSeguro(useAuthStore.getState().usuario?.perfil.nomePerfil), { replace: true })}>Continuar na conta atual</Button> :
          <Button disabled={consulta.pendente} onClick={revalidar}>{consulta.pendente ? "Verificando..." : "Revalidar sessão"}</Button>}
        <Button variant="outline" onClick={() => { if (encerrarSessaoSenha(client, geracao)) void navigate("/login", { replace: true }); }}>Sair e ir para o login</Button>
      </div>
    </div> : <form className="space-y-4" onSubmit={e => {
      e.preventDefault(); if (operacao.pendente || !senhaValida(nova) || nova !== confirmar) return;
      setErro("");
      void operacao.executar(signal => redefinirSenha({ token, novaSenha: nova }, { signal })).then(resposta => {
        if (!resposta) return;
        setNova(""); setConfirmar(""); setConcluida(true);
        if (!useAuthStore.getState().token) {
          toast.success("Senha redefinida com sucesso. Acesse com sua nova senha.");
          void navigate("/login", { replace: true });
        } else revalidar();
      }).catch((error: unknown) => {
        if (!operacao.vigente()) return;
        if (error instanceof ApiErro && error.message === "Link inválido ou expirado") { setInvalido(true); setNova(""); setConfirmar(""); }
        else setErro(error instanceof Error ? error.message : "Não foi possível confirmar a troca.");
      });
    }}>
      <CamposNovaSenha nova={nova} confirmar={confirmar} onNova={setNova} onConfirmar={setConfirmar} disabled={operacao.pendente} />
      {erro && <p role="alert" className="text-sm text-destructive">{erro}</p>}
      <Button className="min-h-11 w-full" type="submit" disabled={operacao.pendente || !senhaValida(nova) || nova !== confirmar}>{operacao.pendente ? "Redefinindo..." : "Redefinir senha"}</Button>
    </form>}
  </PaginaAcesso>;
}
