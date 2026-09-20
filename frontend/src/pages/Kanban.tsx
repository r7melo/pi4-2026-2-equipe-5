import { useNavigate } from "react-router-dom";
import { LogOut, Plus, Search, Bell, Settings, MoreHorizontal, Calendar, Zap } from "lucide-react";

export default function Kanban() {
  const navigate = useNavigate();

  return (
    // RNF-01: overflow-hidden previne scroll global indesejado
    <div className="h-screen w-full bg-slate-50 flex flex-col overflow-hidden font-sans">

      {/* Header Premium */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between shrink-0 shadow-sm z-10">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-slate-900 rounded-lg flex items-center justify-center shadow-inner">
            <Zap className="w-6 h-6 text-yellow-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight leading-tight">Gestão Solar</h1>
            <p className="text-xs text-slate-500 font-medium">Funil de Obras</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Search bar mock */}
          <div className="hidden md:flex relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar obra ou cliente..."
              className="pl-9 pr-4 py-2 bg-slate-100 border-transparent focus:bg-white border focus:border-slate-300 rounded-full text-sm w-64 outline-none transition-all"
            />
          </div>

          <button className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-full transition-colors relative">
            <Bell className="w-5 h-5" />
            <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full ring-2 ring-white"></span>
          </button>

          <button className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-full transition-colors hidden sm:block">
            <Settings className="w-5 h-5" />
          </button>

          <div className="h-8 w-px bg-slate-200 mx-2 hidden sm:block"></div>

          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 hover:text-red-600 transition-all active:scale-95"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Sair</span>
          </button>
        </div>
      </header>

      {/* Header Secundário - Filtros e Ações */}
      <div className="bg-white/50 backdrop-blur-sm border-b border-slate-200 px-6 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-bold text-slate-800">Projetos Ativos</h2>
          <span className="bg-slate-200 text-slate-700 text-xs font-bold px-2.5 py-0.5 rounded-full">12</span>
        </div>

        <button className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-lg text-sm font-semibold shadow-sm transition-transform active:scale-95">
          <Plus className="w-4 h-4" />
          Nova Obra
        </button>
      </div>

      {/* Kanban Board Area - RNF-01: overflow-x-auto permite scroll interno horizontal */}
      <main className="flex-1 overflow-x-auto overflow-y-hidden p-6 custom-scrollbar">
        <div className="flex gap-6 h-full items-start">

          {/* Coluna 1: Material Comprado */}
          <div className="w-80 shrink-0 flex flex-col max-h-full">
            <div className="flex items-center justify-between mb-3 px-1">
              <h3 className="font-bold text-slate-700 text-sm flex items-center gap-2">
                MATERIAL COMPRADO
                <span className="bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full text-xs font-bold">2</span>
              </h3>
              <button className="text-slate-400 hover:text-slate-600"><MoreHorizontal className="w-5 h-5" /></button>
            </div>

            <div className="bg-slate-100/50 p-3 rounded-xl flex-1 overflow-y-auto space-y-3 border border-slate-200/60 shadow-inner">
              {/* Card Example */}
              <div className="bg-white p-4 rounded-lg shadow-sm border border-slate-200 hover:shadow-md hover:border-slate-300 transition-all cursor-grab hover:-translate-y-0.5 group">
                <div className="flex justify-between items-start mb-2">
                  <span className="bg-blue-100 text-blue-700 text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wide">Comercial</span>
                  <button className="text-slate-300 opacity-0 group-hover:opacity-100 hover:text-slate-500 transition-opacity"><MoreHorizontal className="w-4 h-4" /></button>
                </div>
                <h4 className="font-bold text-slate-800 mb-1 leading-tight">Instalação Supermercado</h4>
                <p className="text-xs text-slate-500 font-medium mb-4">Cliente: Rede Alfa</p>

                <div className="flex items-center justify-between mt-auto pt-3 border-t border-slate-100">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500">
                    <Zap className="w-3.5 h-3.5 text-amber-500" />
                    45 Painéis
                  </div>
                  <div className="flex -space-x-2">
                    <div className="w-6 h-6 rounded-full bg-indigo-500 border-2 border-white text-[10px] text-white flex items-center justify-center font-bold">JS</div>
                    <div className="w-6 h-6 rounded-full bg-emerald-500 border-2 border-white text-[10px] text-white flex items-center justify-center font-bold">AM</div>
                  </div>
                </div>
              </div>

              {/* Card Example 2 */}
              <div className="bg-white p-4 rounded-lg shadow-sm border border-slate-200 hover:shadow-md hover:border-slate-300 transition-all cursor-grab hover:-translate-y-0.5 group">
                <div className="flex justify-between items-start mb-2">
                  <span className="bg-green-100 text-green-700 text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wide">Residencial</span>
                </div>
                <h4 className="font-bold text-slate-800 mb-1 leading-tight">Casa Cond. Jardins</h4>
                <p className="text-xs text-slate-500 font-medium mb-4">Cliente: João Silva</p>
                <div className="flex items-center justify-between mt-auto pt-3 border-t border-slate-100">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500">
                    <Zap className="w-3.5 h-3.5 text-amber-500" />
                    12 Painéis
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Coluna 2: No Depósito */}
          <div className="w-80 shrink-0 flex flex-col max-h-full">
            <div className="flex items-center justify-between mb-3 px-1">
              <h3 className="font-bold text-slate-700 text-sm flex items-center gap-2">
                NO DEPÓSITO
                <span className="bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full text-xs font-bold">1</span>
              </h3>
              <button className="text-slate-400 hover:text-slate-600"><MoreHorizontal className="w-5 h-5" /></button>
            </div>

            <div className="bg-slate-100/50 p-3 rounded-xl flex-1 overflow-y-auto space-y-3 border border-slate-200/60 shadow-inner">
              <div className="bg-white p-4 rounded-lg shadow-sm border border-slate-200 hover:shadow-md hover:border-slate-300 transition-all cursor-grab hover:-translate-y-0.5 group">
                <div className="flex justify-between items-start mb-2">
                  <span className="bg-purple-100 text-purple-700 text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wide">Industrial</span>
                </div>
                <h4 className="font-bold text-slate-800 mb-1 leading-tight">Fábrica Têxtil</h4>
                <p className="text-xs text-slate-500 font-medium mb-3">Cliente: Têxtil SA</p>

                <div className="bg-rose-50 border border-rose-100 rounded p-2 mb-3">
                  <p className="text-[10px] font-bold text-rose-700 uppercase flex items-center gap-1">
                    <Calendar className="w-3 h-3" /> Atraso no Inversor
                  </p>
                </div>

                <div className="flex items-center justify-between mt-auto pt-3 border-t border-slate-100">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500">
                    <Zap className="w-3.5 h-3.5 text-amber-500" />
                    120 Painéis
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Coluna 3: Separado */}
          <div className="w-80 shrink-0 flex flex-col max-h-full">
            <div className="flex items-center justify-between mb-3 px-1">
              <h3 className="font-bold text-slate-700 text-sm flex items-center gap-2">
                SEPARADO
                <span className="bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full text-xs font-bold">0</span>
              </h3>
            </div>
            <div className="bg-slate-100/50 p-3 rounded-xl flex-1 overflow-y-auto border border-slate-200/60 shadow-inner border-dashed flex flex-col items-center justify-center text-slate-400">
              <p className="text-sm font-medium">Nenhuma obra aqui</p>
              <p className="text-xs mt-1">Arraste cards para esta coluna</p>
            </div>
          </div>

          {/* Coluna 4: Em Andamento */}
          <div className="w-80 shrink-0 flex flex-col max-h-full">
            <div className="flex items-center justify-between mb-3 px-1">
              <h3 className="font-bold text-slate-700 text-sm flex items-center gap-2">
                EM ANDAMENTO
                <span className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full text-xs font-bold">1</span>
              </h3>
            </div>
            <div className="bg-slate-100/50 p-3 rounded-xl flex-1 overflow-y-auto space-y-3 border border-slate-200/60 shadow-inner">
              <div className="bg-white p-4 rounded-lg shadow-sm border border-amber-300 hover:shadow-md transition-all cursor-grab hover:-translate-y-0.5 relative overflow-hidden group">
                <div className="absolute top-0 left-0 w-1 h-full bg-amber-400"></div>
                <div className="flex justify-between items-start mb-2 pl-2">
                  <span className="bg-green-100 text-green-700 text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wide">Residencial</span>
                </div>
                <h4 className="font-bold text-slate-800 mb-1 leading-tight pl-2">Sítio Alvorada</h4>
                <p className="text-xs text-slate-500 font-medium mb-4 pl-2">Cliente: Sr. Marcos</p>

                {/* Progress bar */}
                <div className="pl-2 mb-4">
                  <div className="flex justify-between text-[10px] font-bold text-slate-500 mb-1">
                    <span>Instalação</span>
                    <span>65%</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-1.5">
                    <div className="bg-amber-500 h-1.5 rounded-full" style={{ width: "65%" }}></div>
                  </div>
                </div>

                <div className="flex items-center justify-between mt-auto pt-3 border-t border-slate-100 pl-2">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500">
                    <Zap className="w-3.5 h-3.5 text-amber-500" />
                    24 Painéis
                  </div>
                  <div className="w-6 h-6 rounded-full bg-sky-500 border-2 border-white text-[10px] text-white flex items-center justify-center font-bold">PT</div>
                </div>
              </div>
            </div>
          </div>

          {/* Coluna 5: Concluído */}
          <div className="w-80 shrink-0 flex flex-col max-h-full">
            <div className="flex items-center justify-between mb-3 px-1">
              <h3 className="font-bold text-slate-700 text-sm flex items-center gap-2">
                CONCLUÍDO
                <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full text-xs font-bold">8</span>
              </h3>
            </div>
            <div className="bg-slate-100/50 p-3 rounded-xl flex-1 overflow-y-auto space-y-3 border border-slate-200/60 shadow-inner opacity-75">
              <div className="bg-slate-50 p-4 rounded-lg shadow-sm border border-slate-200 cursor-pointer hover:bg-white transition-colors">
                <h4 className="font-bold text-slate-700 line-through decoration-slate-300 mb-1 leading-tight">Clínica Médica Vida</h4>
                <p className="text-xs text-slate-400 font-medium">Finalizado em: 12/Set</p>
              </div>
            </div>
          </div>

        </div>
      </main>

      {/* RNF-01: Ajuste de CSS direto para embelezar o scrollbar dentro do React (idealmente em global.css, mas injetado aqui para rapidez de sprint) */}
      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          height: 8px;
          width: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background-color: #cbd5e1;
          border-radius: 20px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background-color: #94a3b8;
        }
      `}</style>
    </div>
  );
}
