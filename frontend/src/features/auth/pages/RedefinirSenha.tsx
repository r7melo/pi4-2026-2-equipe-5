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
import { useAuthStore } from "@/shared/stores/useAuthStore";
import type { Usuario } from "@/shared/types/autorizacao";

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
  const [tentouEnviar, setTentouEnviar] = useState(false);
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
  return (
    <PaginaAcesso titulo="Redefinir senha" subtitulo="Defina uma nova senha segura para sua conta.">
      {invalido ? (
        <div className="space-y-4">
          <div role="alert" className="rounded-lg border border-warning-border bg-warning-light px-3.5 py-3 text-xs text-foreground-secondary leading-relaxed space-y-1">
            <strong className="block text-sm font-semibold text-warning">
              {token.trim() ? "Link inválido ou expirado" : "Link inválido ou não fornecido"}
            </strong>
            <span>Este link já foi utilizado ou expirou. Solicite um novo link para continuar.</span>
          </div>
          <Link
            to="/esqueci-senha"
            className="w-full h-11 flex items-center justify-center rounded-lg bg-primary hover:bg-primary-hover text-primary-foreground font-medium text-sm px-4 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            Solicitar novo link
          </Link>
        </div>
      ) : concluida ? (
        <div className="space-y-4">
          <p role="status" className="rounded-lg border border-success-border bg-success-light px-3.5 py-3 text-xs leading-relaxed font-medium text-success">
            Senha redefinida com sucesso
          </p>
          {erro && (
            <p role="alert" className="rounded-lg bg-destructive-light border border-destructive-border px-3.5 py-3 text-xs leading-relaxed text-destructive">
              {erro}
            </p>
          )}
          <div className="flex flex-wrap gap-3">
            {verificada ? (
              <Button className="h-11" onClick={() => void navigate(destinoInicialSeguro(useAuthStore.getState().usuario?.perfil.nomePerfil), { replace: true })}>
                Continuar na conta atual
              </Button>
            ) : (
              <Button className="h-11" disabled={consulta.pendente} onClick={revalidar}>
                {consulta.pendente ? "Verificando..." : "Revalidar sessão"}
              </Button>
            )}
            <Button className="h-11" variant="outline" onClick={() => { if (encerrarSessaoSenha(client, geracao)) void navigate("/login", { replace: true }); }}>
              Sair e ir para o login
            </Button>
          </div>
        </div>
      ) : (
        <form
          noValidate
          className="space-y-4"
          onSubmit={e => {
            e.preventDefault();
            if (operacao.pendente) return;
            setTentouEnviar(true);
            if (!senhaValida(nova) || nova !== confirmar) {
              setErro("Revise os requisitos da nova senha e sua confirmação.");
              document.getElementById(!senhaValida(nova) ? "nova-senha" : "confirmar-senha")?.focus();
              return;
            }
            setErro("");
            void operacao.executar(signal => redefinirSenha({ token, novaSenha: nova, confirmacaoSenha: confirmar }, { signal })).then(resposta => {
              if (!resposta) return;
              setNova("");
              setConfirmar("");
              setConcluida(true);
              if (!useAuthStore.getState().token) {
                toast.success("Senha redefinida com sucesso. Acesse com sua nova senha.");
                void navigate("/login", { replace: true });
              } else revalidar();
            }).catch((error: unknown) => {
              if (!operacao.vigente()) return;
              if (error instanceof ApiErro && error.message === "Link inválido ou expirado") {
                setInvalido(true);
                setNova("");
                setConfirmar("");
              } else setErro(error instanceof Error ? error.message : "Não foi possível confirmar a troca.");
            });
          }}
        >
          <CamposNovaSenha validar={tentouEnviar} nova={nova} confirmar={confirmar} onNova={setNova} onConfirmar={setConfirmar} disabled={operacao.pendente} />
          {erro && (
            <p role="alert" className="rounded-lg bg-destructive-light border border-destructive-border px-3.5 py-3 text-xs leading-relaxed text-destructive">
              {erro}
            </p>
          )}
          <Button className="h-11 w-full" type="submit" disabled={operacao.pendente}>
            {operacao.pendente ? "Redefinindo..." : "Redefinir senha"}
          </Button>
        </form>
      )}
    </PaginaAcesso>
  );
}
