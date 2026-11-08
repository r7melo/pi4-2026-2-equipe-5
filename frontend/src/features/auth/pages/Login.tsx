import { contextoDemonstracao, contextoDemonstracaoVigente } from "@/shared/lib/contextoDemonstracao";
import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { LogIn, Loader2, AlertCircle, Eye, EyeOff } from "lucide-react";
import { fazerLogin, mapearRespostaParaUsuario } from "@/features/auth/services/auth";
import { useAuthStore } from "@/features/auth/stores/useAuthStore";
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
        { Perfil: "Administrador", "E-mail": "admin@zl.com.br", Senha: "Senha123!" },
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
    <div className="min-h-screen w-full bg-background-app flex items-center justify-center p-6 font-sans">
      
      {/* Card do Formulário */}
      <div className="w-full max-w-[480px] bg-surface rounded-xl shadow-lg border border-border-subtle p-8 sm:p-10">
        
        <div className="flex flex-col items-center text-center mb-10">
          {/* Logo placeholder preservado conforme diretriz */}
          <div className="w-16 h-8 bg-muted rounded-full flex items-center justify-center text-[10px] font-bold text-foreground-muted mb-6">
            ZL
          </div>
          
          <h2 className="text-2xl font-semibold text-foreground-secondary mb-2">Acessar o sistema</h2>
          <p className="text-sm text-muted-foreground">Gestão de Obras Fotovoltaicas</p>
        </div>

        {erro && (
          <div 
            role="alert" 
            className="mb-6 p-4 rounded-lg bg-destructive-light border border-destructive-border text-destructive text-sm flex items-center gap-2"
          >
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span>{erro}</span>
          </div>
        )}

        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-5">
          {/* Campo E-mail */}
          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-semibold text-foreground-muted block cursor-pointer">
              E-mail corporativo
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 rounded-lg border bg-surface-subtle border-border-subtle text-foreground placeholder-subtle-foreground focus:bg-surface focus:outline-none focus:ring-2 focus:ring-primary transition-all text-sm"
              placeholder="seu.email@zlengenharia.com"
            />
          </div>

          {/* Campo Senha */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label htmlFor="senha" className="text-sm font-semibold text-foreground-muted block cursor-pointer">
                Senha
              </label>
            </div>
            <div className="relative flex items-center">
              <input
                id="senha"
                type={mostrarSenha ? "text" : "password"}
                required
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                className="w-full px-4 py-3 pr-11 rounded-lg border bg-surface-subtle border-border-subtle text-foreground placeholder-subtle-foreground focus:bg-surface focus:outline-none focus:ring-2 focus:ring-primary transition-all text-sm"
                placeholder="••••••••"
              />
              <button
                type="button"
                tabIndex={-1}
                onClick={() => setMostrarSenha((prev) => !prev)}
                className="absolute right-3 text-subtle-foreground hover:text-foreground-muted p-1 focus:outline-none cursor-pointer"
                aria-label={mostrarSenha ? "Ocultar senha" : "Mostrar senha"}
              >
                {mostrarSenha ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={carregando}
            className="w-full bg-primary hover:bg-primary-hover disabled:opacity-50 text-primary-foreground font-medium py-3 px-4 rounded-lg flex items-center justify-center gap-2 transition-all active:scale-[0.98] shadow-md mt-6 cursor-pointer"
          >
            {carregando ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Entrando...</span>
              </>
            ) : (
              <>
                <span>Entrar no sistema</span>
                <LogIn className="w-5 h-5" />
              </>
            )}
          </button>

          <button type="button" onClick={() => void navigate("/esqueci-senha")}
            className="w-full rounded-lg border border-border-strong bg-surface px-4 py-3 text-sm text-foreground hover:bg-surface-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
            Esqueci minha senha
          </button>

          {/* 
            Preservação de ações secundárias (UX-03) para resguardo de evolução futura:
            - "Esqueci minha senha" aguarda especificação de rota de recuperação no backend.
            - "Criar nova conta" foi desativado pois a criação de perfis é restrita ao Administrador via POST /api/usuarios.
          */}
          {/*
          <button
            type="button"
            className="w-full bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 font-medium py-3 px-4 rounded-lg flex items-center justify-center transition-all active:scale-[0.98] mt-3"
          >
            Esqueci minha senha
          </button>

          <div className="relative flex items-center py-2">
            <div className="flex-grow border-t border-slate-200"></div>
            <span className="flex-shrink-0 mx-4 text-slate-400 text-xs uppercase font-medium">ou</span>
            <div className="flex-grow border-t border-slate-200"></div>
          </div>

          <button
            type="button"
            className="w-full bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 font-medium py-3 px-4 rounded-lg flex items-center justify-center transition-all active:scale-[0.98]"
          >
            Criar nova conta
          </button>
          */}
        </form>

      </div>
    </div>
  );
}
