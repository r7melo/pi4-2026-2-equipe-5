import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { LogIn, Loader2, AlertCircle } from "lucide-react";
import { fazerLogin } from "@/services/auth";
import { useAuthStore } from "@/stores/useAuthStore";

export default function Login() {
  const navigate = useNavigate();
  const { token, usuario } = useAuthStore();
  const [email, setEmail] = useState("engenharia@zlengenharia.com");
  const [senha, setSenha] = useState("SenhaForte123");
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  // Redirecionamento automático para usuários já autenticados
  useEffect(() => {
    if (token && usuario) {
      if (usuario.perfil?.nomePerfil === "InstaladorCampo") {
        void navigate("/linkparainstaladores");
      } else {
        void navigate("/kanban");
      }
    }
  }, [token, usuario, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCarregando(true);
    setErro(null);

    try {
      await fazerLogin(email, senha);
      const perfilLogado = useAuthStore.getState().usuario?.perfil?.nomePerfil;
      if (perfilLogado === "InstaladorCampo") {
        void navigate("/linkparainstaladores");
      } else {
        void navigate("/kanban");
      }
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro ao efetuar login");
    } finally {
      setCarregando(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-slate-50 flex items-center justify-center p-6 font-sans">
      
      {/* Card do Formulário */}
      <div className="w-full max-w-[480px] bg-white rounded-xl shadow-lg border border-slate-200 p-8 sm:p-10">
        
        <div className="flex flex-col items-center text-center mb-10">
          {/* Logo placeholder */}
          <div className="w-16 h-8 bg-slate-100 rounded-full flex items-center justify-center text-[10px] font-bold text-slate-500 mb-6">
            ZL
          </div>
          
          <h2 className="text-2xl font-semibold text-slate-800 mb-2">Acessar o sistema</h2>
          <p className="text-sm text-slate-500">Gestão de Obras Fotovoltaicas</p>
        </div>

        {erro && (
          <div className="mb-6 p-4 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm flex items-center gap-2">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span>{erro}</span>
          </div>
        )}

        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-5">
          {/* Campo E-mail */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700">E-mail corporativo</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 rounded-lg border bg-slate-50 border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900 transition-all text-sm"
              placeholder="seu.email@zlengenharia.com"
            />
          </div>

          {/* Campo Senha */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-sm font-semibold text-slate-700">Senha</label>
            </div>
            <input
              type="password"
              required
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              className="w-full px-4 py-3 rounded-lg border bg-slate-50 border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900 transition-all text-sm"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={carregando}
            className="w-full bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white font-medium py-3 px-4 rounded-lg flex items-center justify-center gap-2 transition-all active:scale-[0.98] shadow-md mt-6 cursor-pointer"
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
        </form>

      </div>
    </div>
  );
}
