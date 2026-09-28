import { Navigation, Package, CheckCircle2, AlertCircle, Phone, MapPin } from "lucide-react";

export default function InstaladorMobile() {
  const handleOpenMaps = () => {
    // Simula a abertura do GPS via deep link
    window.open("https://www.google.com/maps/search/?api=1&query=ZL+Engenharia+Crateus+CE", "_blank");
  };

  return (
    <div className="min-h-screen bg-slate-900 flex justify-center">
      {/* Container Restrito (Simula tela de Celular em Monitores Maiores) */}
      <div className="w-full max-w-md bg-slate-50 min-h-screen flex flex-col shadow-2xl relative overflow-hidden">
        
        {/* Header Curto */}
        <div className="bg-slate-900 text-white pt-10 pb-6 px-6 rounded-b-[2rem] shadow-md z-10 relative">
          <div className="flex justify-between items-start mb-4">
            <div>
              <span className="bg-white/20 text-yellow-300 text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wide">
                Hoje • Equipe Alfa
              </span>
              <h1 className="text-2xl font-bold mt-2 leading-tight">Instalação<br/>Sítio Alvorada</h1>
            </div>
          </div>
          <p className="text-slate-300 text-sm flex items-start gap-2 mt-2">
            <MapPin className="w-4 h-4 mt-0.5 shrink-0 text-slate-400" />
            Rodovia CE-187, Km 373 - CRATEÚS, CE
          </p>
        </div>

        <main className="flex-1 px-5 pt-6 pb-24 overflow-y-auto space-y-6">
          
          {/* Card Contato */}
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500 font-medium">Cliente</p>
              <h3 className="font-bold text-slate-800">Sr. Marcos Nogueira</h3>
            </div>
            <button className="w-10 h-10 bg-green-100 text-green-700 rounded-full flex items-center justify-center hover:bg-green-200 transition-colors">
              <Phone className="w-5 h-5" />
            </button>
          </div>

          {/* Checklist do Kit */}
          <div>
            <h3 className="font-bold text-slate-700 mb-3 flex items-center gap-2">
              <Package className="w-5 h-5 text-slate-500" /> Resumo do Kit
            </h3>
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <ul className="divide-y divide-slate-100">
                <li className="p-4 flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-700">Painéis 550W</span>
                  <span className="font-bold text-slate-900">24 unid.</span>
                </li>
                <li className="p-4 flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-700">Inversor 12kW</span>
                  <span className="font-bold text-slate-900">1 unid.</span>
                </li>
                <li className="p-4 flex items-center justify-between bg-amber-50">
                  <span className="text-sm font-medium text-amber-800 flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4" /> Cabos e Estrutura
                  </span>
                  <span className="font-bold text-amber-900">Verificar lote</span>
                </li>
              </ul>
            </div>
          </div>
        </main>

        {/* Floating Action Button Bar */}
        <div className="absolute bottom-0 left-0 w-full bg-white border-t border-slate-200 p-4 pb-8 flex gap-3 shadow-[0_-10px_40px_rgba(0,0,0,0.05)]">
          <button 
            onClick={handleOpenMaps}
            className="flex-1 bg-slate-900 hover:bg-slate-800 text-white font-bold py-4 rounded-xl flex justify-center items-center gap-2 transition-transform active:scale-95 shadow-md"
          >
            <Navigation className="w-5 h-5" />
            Iniciar Rota
          </button>
          <button 
            className="w-14 h-14 bg-emerald-100 text-emerald-700 hover:bg-emerald-200 rounded-xl flex justify-center items-center transition-transform active:scale-95"
            title="Marcar Chegada"
          >
            <CheckCircle2 className="w-6 h-6" />
          </button>
        </div>
      </div>
    </div>
  );
}