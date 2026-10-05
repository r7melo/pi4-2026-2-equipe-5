// RF-16: Visualização pública e somente leitura do relatório/cronograma de obras
import { useParams, Link } from "react-router-dom";
import { useRelatorioPublico } from "@/hooks/api/useRelatorioPublico";
import {
  Sun,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Inbox,
  Zap,
  MapPin,
  Clock,
  Printer,
  ShieldCheck,
} from "lucide-react";

export default function RelatorioPublico() {
  const { token } = useParams<{ token: string }>();
  const { data, isLoading, isError, error } = useRelatorioPublico(token || "");

  // Estado 1: Carregando
  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="p-4 bg-slate-800 rounded-2xl border border-slate-700 shadow-xl">
            <Sun className="w-12 h-12 text-amber-400 animate-spin" />
          </div>
          <p className="text-lg font-medium text-slate-200">Carregando relatório compartilhado...</p>
          <p className="text-sm text-slate-400">Validando chave de acesso pública</p>
        </div>
      </div>
    );
  }

  // Estado 2: Erro (Token inválido ou falha de rede)
  if (isError || !data) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 max-w-md w-full text-center flex flex-col items-center shadow-2xl">
          <div className="w-14 h-14 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center justify-center text-red-400 mb-4">
            <AlertCircle className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Link Invalido ou Expirado</h2>
          <p className="text-sm text-slate-400 mb-6">
            {(error as Error)?.message || "Não foi possível carregar os dados deste relatório compartilhado."}
          </p>
          <Link
            to="/login"
            className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold rounded-xl transition-all text-sm"
          >
            Ir para o Login do Sistema
          </Link>
        </div>
      </div>
    );
  }

  const {
    periodoInicio,
    periodoFim,
    clienteFiltro,
    obras,
    totalObras,
    obrasConcluidas,
    totalPaineis,
    potenciaTotalKwp,
  } = data;

  const handleImprimir = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Header público da ZL Engenharia */}
      <header className="bg-slate-900/80 border-b border-slate-800 sticky top-0 z-10 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4 py-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-tr from-amber-500 to-amber-400 rounded-xl shadow-lg shadow-amber-500/20 text-slate-950">
              <Sun className="w-6 h-6 stroke-[2.5]" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white tracking-wide">ZL Engenharia Solar</h1>
              <p className="text-xs text-amber-400/90 font-medium">Relatório Público de Execução de Obras</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold">
              <ShieldCheck className="w-3.5 h-3.5" /> Somente Leitura
            </span>
            <button
              onClick={handleImprimir}
              className="inline-flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 rounded-xl text-sm font-medium transition-all cursor-pointer"
            >
              <Printer className="w-4 h-4 text-slate-400" />
              Imprimir / PDF
            </button>
          </div>
        </div>
      </header>

      {/* Conteúdo Principal */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-8 space-y-8">
        {/* Banner Informativo do Período */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-slate-800/80 border border-slate-800 rounded-2xl p-6 shadow-xl">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-white mb-1">Visão Geral dos Projetos Fotovoltaicos</h2>
              <p className="text-sm text-slate-400">
                Acompanhamento dinâmico em tempo real da execução e prazos das instalações.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-xs">
              {periodoInicio && periodoFim && (
                <div className="flex items-center gap-2 px-3 py-2 bg-slate-800/80 border border-slate-700/60 rounded-xl text-slate-300">
                  <Calendar className="w-4 h-4 text-amber-400" />
                  <span>Período: <strong>{periodoInicio}</strong> até <strong>{periodoFim}</strong></span>
                </div>
              )}
              {clienteFiltro && clienteFiltro !== "todos" && (
                <div className="flex items-center gap-2 px-3 py-2 bg-slate-800/80 border border-slate-700/60 rounded-xl text-amber-300">
                  <span>Cliente: <strong>{clienteFiltro}</strong></span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Métricas Principais */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total de Obras</span>
              <div className="p-2 bg-slate-800 rounded-lg text-slate-300">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <p className="text-3xl font-extrabold text-white">{totalObras}</p>
            <p className="text-xs text-slate-500 mt-1">no escopo selecionado</p>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Concluídas</span>
              <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-400">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>
            <p className="text-3xl font-extrabold text-emerald-400">{obrasConcluidas}</p>
            <p className="text-xs text-slate-500 mt-1">
              {totalObras > 0 ? `${Math.round((obrasConcluidas / totalObras) * 100)}% de conclusão` : "0%"}
            </p>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Painéis Instalados</span>
              <div className="p-2 bg-amber-500/10 rounded-lg text-amber-400">
                <Sun className="w-4 h-4" />
              </div>
            </div>
            <p className="text-3xl font-extrabold text-amber-400">{totalPaineis.toLocaleString("pt-BR")}</p>
            <p className="text-xs text-slate-500 mt-1">módulos solares</p>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Potência Total</span>
              <div className="p-2 bg-cyan-500/10 rounded-lg text-cyan-400">
                <Zap className="w-4 h-4" />
              </div>
            </div>
            <p className="text-3xl font-extrabold text-cyan-400">{potenciaTotalKwp.toFixed(2)} <span className="text-lg font-semibold">kWp</span></p>
            <p className="text-xs text-slate-500 mt-1">capacidade geradora</p>
          </div>
        </div>

        {/* Estado 3: Vazio */}
        {obras.length === 0 ? (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center flex flex-col items-center gap-3">
            <Inbox className="w-12 h-12 text-slate-600" />
            <h3 className="text-lg font-bold text-slate-300">Nenhuma obra encontrada</h3>
            <p className="text-sm text-slate-500 max-w-sm">
              Não existem registros de obras para os parâmetros de filtro especificados neste link.
            </p>
          </div>
        ) : (
          /* Estado 4: Sucesso - Lista de Obras */
          <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
              <h3 className="text-base font-bold text-white">Cronograma e Status das Instalações</h3>
              <span className="text-xs text-slate-400">{obras.length} obra(s) listada(s)</span>
            </div>

            <div className="divide-y divide-slate-800">
              {obras.map((obra) => {
                const badgeColor =
                  obra.status === "Concluido"
                    ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                    : obra.status === "EmAndamento"
                    ? "bg-amber-500/10 border-amber-500/20 text-amber-400"
                    : "bg-slate-800 border-slate-700 text-slate-300";

                const statusNome =
                  obra.status === "Concluido"
                    ? "Concluída"
                    : obra.status === "EmAndamento"
                    ? "Em Andamento"
                    : obra.status === "NoDeposito"
                    ? "No Depósito"
                    : obra.status === "Separado"
                    ? "Separado"
                    : obra.status === "MaterialComprado"
                    ? "Material Comprado"
                    : "Assistência";

                return (
                  <div key={obra.id} className="p-6 hover:bg-slate-800/40 transition-colors">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-3 flex-wrap">
                          <h4 className="text-base font-bold text-white">{obra.nome || `Instalação Solar - ${obra.clienteNome}`}</h4>
                          <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${badgeColor}`}>
                            {statusNome}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 text-xs text-slate-400 flex-wrap pt-1">
                          <span>Cliente: <strong className="text-slate-200">{obra.clienteNome}</strong></span>
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5 text-slate-500" />
                            {obra.cidade || "N/I"} - {obra.uf || "UF"}
                          </span>
                          <span className="flex items-center gap-1">
                            <Sun className="w-3.5 h-3.5 text-amber-400" />
                            {obra.quantidadePaineis} painéis {obra.potenciaKwp ? `(${obra.potenciaKwp} kWp)` : ""}
                          </span>
                        </div>
                      </div>

                      {/* Progresso de Instalação */}
                      <div className="w-full md:w-56 space-y-1.5">
                        <div className="flex justify-between text-xs font-medium">
                          <span className="text-slate-400">Progresso</span>
                          <span className="text-amber-400 font-bold">{obra.progressoGeral ?? (obra.status === "Concluido" ? 100 : 50)}%</span>
                        </div>
                        <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-amber-500 to-emerald-400 rounded-full transition-all duration-500"
                            style={{ width: `${obra.progressoGeral ?? (obra.status === "Concluido" ? 100 : 50)}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800 py-6 text-center text-xs text-slate-500">
        <p>© 2026 ZL Engenharia Solar — Sistema de Gestão de Obras (PI4)</p>
      </footer>
    </div>
  );
}
