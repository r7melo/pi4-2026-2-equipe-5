import { contextoDemonstracao, contextoDemonstracaoVigente } from "@/shared/lib/contextoDemonstracao";
import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { LogIn, Loader2, AlertCircle } from "lucide-react";
import { fazerLogin, mapearRespostaParaUsuario } from "@/features/auth/services/auth";
import { Button } from "@/shared/components/ui/Button";
import { AlertBanner } from "@/shared/components/ui/AlertBanner";
import { BotaoVisibilidadeSenha } from "@/shared/components/ui/BotaoVisibilidadeSenha";
import { useAuthStore } from "@/shared/stores/useAuthStore";
import { obterELimparRotaRetorno } from "@/shared/lib/rotasSessao";

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { token, usuario, login } = useAuthStore();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    // Guia de credenciais restrito a ambiente de desenvolvimento local (RSK-04)
    if (import.meta.env.DEV) {
      console.info("🔑 [ZL Engenharia] Usuários para teste e homologação (Senha padrão: Senha123!):");
      console.table([
        { Perfil: "Administrador", "E-mail": "admin@admin.com", Senha: "Senha123!" },
        { Perfil: "Engenharia", "E-mail": "engenharia@zlengenharia.com", Senha: "Senha123!" },
        { Perfil: "Financeiro", "E-mail": "financeiro@zl.com.br", Senha: "Senha123!" },
        { Perfil: "InstaladorCampo", "E-mail": "instalador@zl.com.br", Senha: "Senha123!" },
      ]);
    }
  }, []);

  // Fonte única de redirecionamento canônico: acionada tanto para usuários já autenticados quanto pós-login
  useEffect(() => {
    if (token) {
      const perfilNome = usuario?.perfil?.nomePerfil;
      const destino = obterELimparRotaRetorno(
        perfilNome,
        (location.state as { from?: string } | null)?.from
      );
      void navigate(destino, { replace: true });
    }
  }, [token, usuario, navigate, location.state]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const origem = contextoDemonstracao();
    setCarregando(true);
    setErro(null);

    try {
      const resposta = await fazerLogin(email, senha);
      if (!contextoDemonstracaoVigente(origem)) return;
      const usuarioFormatado = mapearRespostaParaUsuario(resposta.usuario);
      // Injeta token, usuario e expiresAt no Zustand; o redirecionamento ocorre via useEffect de forma reativa
      login(resposta.token, usuarioFormatado, resposta.expiresAt);
    } catch (err) {
      if (!contextoDemonstracaoVigente(origem)) return;
      setErro(err instanceof Error ? err.message : "Erro ao efetuar login. Tente novamente.");
    } finally {
      setCarregando(false);
    }
  };

  return (
    <main className="min-h-dvh w-full bg-background-app flex items-center justify-center p-4 sm:p-6 font-sans text-foreground">
      <div className="w-full max-w-[440px] bg-surface rounded-xl border border-border-subtle p-6 sm:p-8 space-y-6">
        <div className="flex flex-col items-center text-center space-y-3">
          <span className="w-10 h-10 rounded-lg bg-primary text-primary-foreground inline-flex items-center justify-center text-xs font-semibold">
            ZL
          </span>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">Acessar o sistema</h1>
            <p className="text-xs text-muted-foreground mt-0.5">ZL Engenharia · Gestão de Obras</p>
          </div>
        </div>

        {erro && (
          <AlertBanner variante="destructive" icone={<AlertCircle className="w-4 h-4" />}>
            {erro}
          </AlertBanner>
        )}

        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="email" className="text-sm font-medium text-foreground-secondary block cursor-pointer">
              E-mail corporativo
            </label>
            <input
              id="email"
              type="email"
              name="email"
              autoComplete="username"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              enterKeyHint="next"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full h-11 px-3.5 rounded-lg border bg-surface-subtle border-border-strong text-foreground placeholder:text-muted-foreground focus:bg-surface user-invalid:border-destructive transition-colors text-sm"
              placeholder="seu.email@zlengenharia.com"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="senha" className="text-sm font-medium text-foreground-secondary block cursor-pointer">
              Senha
            </label>
            <div className="relative flex items-center">
              <input
                id="senha"
                type={mostrarSenha ? "text" : "password"}
                name="password"
                autoComplete="current-password"
                enterKeyHint="done"
                required
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                className="w-full h-11 px-3.5 pr-14 rounded-lg border bg-surface-subtle border-border-strong text-foreground placeholder:text-muted-foreground focus:bg-surface user-invalid:border-destructive transition-colors text-sm"
                placeholder="Digite sua senha"
              />
              <BotaoVisibilidadeSenha
                visivel={mostrarSenha}
                onAlternar={() => setMostrarSenha((prev) => !prev)}
                disabled={carregando}
              />
            </div>
          </div>

          <div className="space-y-2.5 pt-2">
            <Button
              type="submit"
              disabled={carregando}
              className="w-full h-11"
            >
              {carregando ? (
                <>
                  <Loader2 className="w-4 h-4 motion-safe:animate-spin" aria-hidden="true" />
                  <span>Entrando...</span>
                </>
              ) : (
                <>
                  <span>Entrar no sistema</span>
                  <LogIn className="w-4 h-4" aria-hidden="true" />
                </>
              )}
            </Button>

            <Link
              to="/esqueci-senha"
              className="w-full h-11 flex items-center justify-center rounded-lg border border-border-strong bg-surface px-4 text-sm font-medium text-foreground hover:bg-surface-subtle transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              Esqueci minha senha
            </Link>
          </div>
        </form>
      </div>
    </main>
  );
}
