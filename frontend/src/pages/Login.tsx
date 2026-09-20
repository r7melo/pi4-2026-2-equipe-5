import { useNavigate } from "react-router-dom";
import { Sun, LogIn } from "lucide-react";

export default function Login() {
  const navigate = useNavigate();

  const handleBypassLogin = (e: React.FormEvent) => {
    e.preventDefault();
    navigate("/kanban");
  };

  return (
    <div className="min-h-screen w-full flex">
      {/* Lado Esquerdo - Área de Branding (Visível apenas Desktop) */}
      <div className="hidden lg:flex flex-1 relative bg-slate-900 items-center justify-center overflow-hidden">
        {/* Imagem de Fundo Gerada por IA */}
        <div className="absolute inset-0">
          <img
            src="/solar-bg.jpg"
            alt="Painéis Solares ao Pôr do Sol"
            className="w-full h-full object-cover opacity-60"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-slate-900/40 to-transparent" />
        </div>

        {/* Texto de Impacto */}
        <div className="relative z-10 flex flex-col items-center text-center px-12 max-w-2xl">
          <div className="w-20 h-20 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/20 mb-8 shadow-2xl">
            <Sun className="w-10 h-10 text-yellow-400" />
          </div>
          <h1 className="text-4xl xl:text-5xl font-bold text-white tracking-tight mb-6 leading-tight">
            Gestão inteligente para um futuro sustentável.
          </h1>
          <p className="text-lg text-slate-300 font-medium">
            Acompanhe o funil de obras, gerencie equipes e otimize os recursos da sua empresa em uma única plataforma.
          </p>
        </div>
      </div>

      {/* Lado Direito - Formulário de Login */}
      <div className="w-full lg:w-[500px] xl:w-[600px] flex flex-col justify-center px-8 sm:px-16 lg:px-20 bg-white">

        {/* Cabeçalho Mobile */}
        <div className="lg:hidden flex items-center gap-3 mb-10">
          <div className="w-10 h-10 bg-slate-900 rounded-lg flex items-center justify-center">
            <Sun className="w-6 h-6 text-yellow-400" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Gestão Solar</h2>
        </div>

        <div className="mb-10">
          <h2 className="text-3xl font-bold text-slate-900 mb-2">Bem-vindo de volta</h2>
          <p className="text-slate-500">Acesse o painel.</p>
        </div>

        <form onSubmit={handleBypassLogin} className="space-y-5">
          {/* Campo E-mail */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700">E-mail corporativo</label>
            <input
              type="text"
              className="w-full px-4 py-3 rounded-lg border bg-slate-50 border-slate-200"
              placeholder="Não é necessário digitar..."
            />
          </div>

          {/* Campo Senha */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-sm font-semibold text-slate-700">Senha</label>
            </div>
            <input
              type="password"
              className="w-full px-4 py-3 rounded-lg border bg-slate-50 border-slate-200"
              placeholder="Não é necessário digitar..."
            />
          </div>

          <button
            type="submit"
            className="w-full bg-slate-900 hover:bg-slate-800 text-white font-medium py-3 px-4 rounded-lg flex items-center justify-center gap-2 transition-all active:scale-[0.98] shadow-md mt-6"
          >
            Entrar no sistema
            <LogIn className="w-5 h-5" />
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
