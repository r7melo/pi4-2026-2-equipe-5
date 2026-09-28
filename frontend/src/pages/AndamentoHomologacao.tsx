import { useNavigate } from "react-router-dom";
import { ArrowLeft, CheckCircle, Clock, UploadCloud, Building, FileText } from "lucide-react";

export default function Homologacao() {
  const navigate = useNavigate();

  return (
    <div className="h-screen w-full bg-slate-50 flex flex-col font-sans">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between shrink-0 shadow-sm z-10">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate("/kanban")}
            className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-full transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight leading-tight">Homologação: João Silva</h1>
            <p className="text-xs text-slate-500 font-medium">Acompanhamento junto à Concessionária</p>
          </div>
        </div>
        <div className="bg-amber-100 text-amber-700 px-3 py-1 rounded-full text-sm font-bold flex items-center gap-2">
          <Clock className="w-4 h-4" /> Em Análise
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-6 md:p-10 flex justify-center">
        <div className="w-full max-w-4xl space-y-6">
          
          {/* Card Resumo */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex items-center gap-4">
            <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center">
              <Building className="w-6 h-6 text-slate-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800">Concessionária Local (Enel)</h2>
              <p className="text-sm text-slate-500">Unidade Consumidora: 102938475 • Protocolo: #2026-991</p>
            </div>
          </div>

          {/* Stepper Vertical */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 md:p-8">
            <h3 className="text-lg font-bold text-slate-800 mb-8">Etapas do Processo</h3>
            
            <div className="space-y-8 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-slate-200">
              
              {/* Etapa 1: Concluída */}
              <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group">
                <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-white bg-emerald-500 text-white shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 shadow-sm z-10">
                  <CheckCircle className="w-5 h-5" />
                </div>
                <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border border-emerald-200 bg-emerald-50">
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="font-bold text-emerald-900">Parecer de Acesso</h4>
                    <span className="text-[10px] font-bold bg-emerald-200 text-emerald-800 px-2 py-0.5 rounded uppercase">Concluído</span>
                  </div>
                  <p className="text-sm text-emerald-700 mb-3">Solicitação enviada e aprovada pela rede.</p>
                  <button className="text-xs font-semibold text-emerald-700 flex items-center gap-1 hover:underline">
                    <FileText className="w-3.5 h-3.5" /> Ver PDF do Parecer
                  </button>
                </div>
              </div>

              {/* Etapa 2: Em Andamento */}
              <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group">
                <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-white bg-amber-400 text-white shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 shadow-sm z-10 animate-pulse">
                  <Clock className="w-5 h-5" />
                </div>
                <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border border-amber-200 bg-white shadow-sm relative">
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="font-bold text-slate-800">Emissão de ART</h4>
                    <span className="text-[10px] font-bold bg-amber-100 text-amber-700 px-2 py-0.5 rounded uppercase">Pendente</span>
                  </div>
                  <p className="text-sm text-slate-500 mb-4">Aguardando engenheiro responsável anexar o documento.</p>
                  
                  <button className="w-full border-2 border-dashed border-slate-300 rounded-lg p-4 flex flex-col items-center justify-center text-slate-500 hover:bg-slate-50 hover:border-slate-400 hover:text-slate-700 transition-colors">
                    <UploadCloud className="w-6 h-6 mb-2" />
                    <span className="text-sm font-semibold">Anexar ART (.pdf)</span>
                  </button>
                </div>
              </div>

              {/* Etapa 3: Futura */}
              <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group opacity-50 grayscale">
                <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-white bg-slate-200 text-slate-400 shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 shadow-sm z-10">
                  <div className="w-2.5 h-2.5 bg-slate-400 rounded-full"></div>
                </div>
                <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border border-slate-200 bg-white">
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="font-bold text-slate-800">Solicitar Vistoria</h4>
                    <span className="text-[10px] font-bold bg-slate-100 text-slate-500 px-2 py-0.5 rounded uppercase">Bloqueado</span>
                  </div>
                  <p className="text-sm text-slate-500">Requer a emissão da ART para ser liberada.</p>
                </div>
              </div>

            </div>
          </div>
        </div>
      </main>
    </div>
  );
}