import { useNavigate } from "react-router-dom";
import { ArrowLeft, Save, Building2, Calendar, Zap, User, FileText, CheckCircle2 } from "lucide-react";

export default function CadastroObra() {
  const navigate = useNavigate();

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    // Simula salvamento e volta para o Kanban
    alert("Obra cadastrada com sucesso!");
    navigate("/kanban");
  };

  return (
    <div className="min-h-screen w-full bg-slate-50 flex flex-col font-sans">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center gap-4 shrink-0 shadow-sm z-10">
        <button 
          onClick={() => navigate("/kanban")}
          className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-full transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight leading-tight">Nova Obra</h1>
          <p className="text-xs text-slate-500 font-medium">Cadastrar dados de contrato e dimensionamento</p>
        </div>
      </header>

      {/* Formulário Area */}
      <main className="flex-1 overflow-y-auto p-6 md:p-10 flex justify-center">
        <div className="w-full max-w-3xl bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <form onSubmit={handleSave} className="p-8 space-y-8">
            
            {/* Seção: Dados do Cliente */}
            <div>
              <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                <User className="w-5 h-5 text-slate-400" /> Dados do Cliente
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-2 md:col-span-2">
                  <label className="text-sm font-semibold text-slate-700">Nome/Razão Social</label>
                  <input type="text" required className="w-full px-4 py-2.5 rounded-lg border bg-slate-50 border-slate-200 focus:border-slate-400 outline-none" placeholder="Ex: João da Silva ou Empresa X" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Cidade</label>
                  <div className="relative">
                    <Building2 className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input type="text" required className="w-full pl-9 pr-4 py-2.5 rounded-lg border bg-slate-50 border-slate-200 focus:border-slate-400 outline-none" placeholder="Ex: Fortaleza" />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Telefone Contato</label>
                  <input type="text" className="w-full px-4 py-2.5 rounded-lg border bg-slate-50 border-slate-200 focus:border-slate-400 outline-none" placeholder="(00) 00000-0000" />
                </div>
              </div>
            </div>

            <hr className="border-slate-100" />

            {/* Seção: Contrato e Prazos */}
            <div>
              <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5 text-slate-400" /> Contrato e Prazos
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Data de Pagamento</label>
                  <div className="relative">
                    <Calendar className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input type="date" required className="w-full pl-9 pr-4 py-2.5 rounded-lg border bg-slate-50 border-slate-200 focus:border-slate-400 outline-none text-slate-600" />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Prazo Contratual (Dias)</label>
                  <input type="number" required min="1" className="w-full px-4 py-2.5 rounded-lg border bg-slate-50 border-slate-200 focus:border-slate-400 outline-none" placeholder="Ex: 60" />
                </div>
              </div>
            </div>

            <hr className="border-slate-100" />

            {/* Seção: Equipamentos */}
            <div>
              <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                <Zap className="w-5 h-5 text-amber-500" /> Dimensionamento
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Quantidade de Painéis</label>
                  <input type="number" required min="1" className="w-full px-4 py-2.5 rounded-lg border bg-slate-50 border-slate-200 focus:border-slate-400 outline-none" placeholder="Ex: 24" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Quantidade de Inversores</label>
                  <input type="number" required min="1" className="w-full px-4 py-2.5 rounded-lg border bg-slate-50 border-slate-200 focus:border-slate-400 outline-none" placeholder="Ex: 1" />
                </div>
              </div>
            </div>

            {/* Ações */}
            <div className="pt-4 flex justify-end gap-3">
              <button 
                type="button" 
                onClick={() => navigate("/kanban")}
                className="px-6 py-2.5 rounded-lg font-medium text-slate-600 hover:bg-slate-100 transition-colors"
              >
                Cancelar
              </button>
              <button 
                type="submit"
                className="bg-slate-900 hover:bg-slate-800 text-white font-medium py-2.5 px-6 rounded-lg flex items-center gap-2 transition-transform active:scale-95 shadow-sm"
              >
                <Save className="w-4 h-4" />
                Salvar Obra
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}