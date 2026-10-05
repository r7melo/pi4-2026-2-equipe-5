// RF-15/16: Relatórios e Exportação — Resumo por período com filtros de cliente e exportação
import { useState } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { useObras } from "@/hooks/api/useObras";
import { exportarRelatorio } from "@/services/relatorios";
import { toast } from "sonner";
import {
  Loader2,
  Download,
  BarChart3,
  Link2,
  Calendar,
  Users,
  ChevronDown,
  TrendingUp,
  FileText,
} from "lucide-react";

// Formata data para exibição no filtro (ex: "01/09")
function formatarDataCurta(data: Date) {
  return data.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

export default function Relatorios() {
  const { data: listaObras, isLoading: loadingObras } = useObras();
  const [exportando, setExportando] = useState(false);
  const [gerandoLink, setGerandoLink] = useState(false);
  const [clienteSelecionado, setClienteSelecionado] = useState<string>("todos");
  const [periodoInicio, setPeriodoInicio] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return d.toISOString().split("T")[0];
  });
  const [periodoFim, setPeriodoFim] = useState(() => new Date().toISOString().split("T")[0]);

  const clientes = [
    "todos",
    ...Array.from(new Set((listaObras?.itens || []).map((o) => o.clienteNome))),
  ];

  const handleExportar = async (formato: "pdf" | "excel") => {
    setExportando(true);
    try {
      const blob = await exportarRelatorio(formato);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `relatorio-zl-${new Date().toISOString().split("T")[0]}.${formato === "pdf" ? "pdf" : "xlsx"}`;
      link.click();
      window.URL.revokeObjectURL(url);
      toast.success(`Relatório exportado em ${formato.toUpperCase()}`);
    } catch {
      toast.error("Erro ao exportar relatório");
    } finally {
      setExportando(false);
    }
  };

  const handleGerarLink = async () => {
    setGerandoLink(true);
    try {
      // RF-16: Link compartilhável público para cronograma/relatório
      await new Promise((r) => setTimeout(r, 900));
      const link = `${window.location.origin}/relatorio-publico/${btoa(`${periodoInicio}|${periodoFim}|${clienteSelecionado}`)}`;
      await navigator.clipboard.writeText(link);
      toast.success("Link copiado para a área de transferência!");
    } catch {
      toast.error("Erro ao gerar link compartilhável");
    } finally {
      setGerandoLink(false);
    }
  };

  // Métricas simuladas do período
  const obrasDoPeriodo = (listaObras?.itens || []).filter((o) =>
    clienteSelecionado === "todos" || o.clienteNome === clienteSelecionado
  );
  const totalObras = obrasDoPeriodo.length;
  const obrasConcluidasCount = obrasDoPeriodo.filter((o) => o.status === "Concluido").length;
  const totalPaineis = obrasDoPeriodo.reduce((acc, o) => acc + (o.quantidadePaineis ?? 0), 0);

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      <PageHeader title="Relatórios e Exportação">
        <button
          onClick={() => handleExportar("excel")}
          disabled={exportando}
          className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 px-4 py-2 rounded-lg font-medium text-sm transition-colors flex items-center gap-2 cursor-pointer shadow-sm"
        >
          {exportando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4 text-emerald-600" />}
          Exportar Excel
        </button>
        <button
          onClick={() => handleExportar("pdf")}
          disabled={exportando}
          className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 px-4 py-2 rounded-lg font-medium text-sm transition-colors flex items-center gap-2 cursor-pointer shadow-sm"
        >
          {exportando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4 text-red-500" />}
          Exportar PDF
        </button>
        <button
          onClick={handleGerarLink}
          disabled={gerandoLink}
          className="bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-lg font-medium text-sm transition-colors flex items-center gap-2 cursor-pointer shadow-sm"
        >
          {gerandoLink ? <Loader2 className="w-4 h-4 animate-spin" /> : <Link2 className="w-4 h-4" />}
          Gerar link compartilhável
        </button>
      </PageHeader>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-6 bg-slate-50">
        <div className="max-w-5xl mx-auto space-y-6">

          {/* Barra de filtros */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex flex-wrap items-center gap-4">
            {/* Filtro: Período */}
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-1.5 text-sm text-slate-500 font-medium">
                <Calendar className="w-4 h-4" />
                <span>Período:</span>
              </div>
              <div className="flex items-center gap-1.5">
                <input
                  type="date"
                  id="relatorio-periodo-inicio"
                  value={periodoInicio}
                  onChange={(e) => setPeriodoInicio(e.target.value)}
                  className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-slate-400 transition-shadow"
                />
                <span className="text-slate-400 text-sm">—</span>
                <input
                  type="date"
                  id="relatorio-periodo-fim"
                  value={periodoFim}
                  onChange={(e) => setPeriodoFim(e.target.value)}
                  className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-slate-400 transition-shadow"
                />
              </div>
            </div>

            {/* Divider */}
            <div className="hidden sm:block w-px h-6 bg-slate-200" />

            {/* Filtro: Cliente */}
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 text-sm text-slate-500 font-medium">
                <Users className="w-4 h-4" />
                <span>Cliente:</span>
              </div>
              <div className="relative">
                <select
                  id="relatorio-cliente"
                  value={clienteSelecionado}
                  onChange={(e) => setClienteSelecionado(e.target.value)}
                  disabled={loadingObras}
                  className="appearance-none text-sm border border-slate-200 rounded-lg pl-3 pr-8 py-1.5 focus:outline-none focus:ring-2 focus:ring-slate-400 transition-shadow bg-white cursor-pointer"
                >
                  {clientes.map((c) => (
                    <option key={c} value={c}>
                      {c === "todos" ? "Todos os clientes" : c}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              </div>
            </div>

            {/* Badge de período selecionado */}
            <div className="ml-auto">
              <span className="text-xs font-medium px-2.5 py-1 bg-slate-100 text-slate-600 rounded-full border border-slate-200">
                {formatarDataCurta(new Date(periodoInicio + "T00:00:00"))} → {formatarDataCurta(new Date(periodoFim + "T00:00:00"))}
              </span>
            </div>
          </div>

          {/* Cards de métricas do período */}
          {loadingObras ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-slate-300" />
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Obras no Período</p>
                  <div className="bg-blue-50 p-2 rounded-lg">
                    <FileText className="w-4 h-4 text-blue-600" />
                  </div>
                </div>
                <p className="text-3xl font-bold text-slate-900">{totalObras}</p>
                <p className="text-xs text-slate-500 mt-1">obras no filtro atual</p>
              </div>

              <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Concluídas</p>
                  <div className="bg-emerald-50 p-2 rounded-lg">
                    <TrendingUp className="w-4 h-4 text-emerald-600" />
                  </div>
                </div>
                <p className="text-3xl font-bold text-slate-900">{obrasConcluidasCount}</p>
                <p className="text-xs text-slate-500 mt-1">
                  {totalObras > 0 ? Math.round((obrasConcluidasCount / totalObras) * 100) : 0}% de conclusão
                </p>
              </div>

              <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Total de Painéis</p>
                  <div className="bg-amber-50 p-2 rounded-lg">
                    <BarChart3 className="w-4 h-4 text-amber-600" />
                  </div>
                </div>
                <p className="text-3xl font-bold text-slate-900">{totalPaineis.toLocaleString("pt-BR")}</p>
                <p className="text-xs text-slate-500 mt-1">painéis instalados / previstos</p>
              </div>
            </div>
          )}

          {/* Área de gráfico / tabela resumo do período */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-slate-400" />
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Resumo do Período</h3>
            </div>

            {loadingObras ? (
              <div className="flex justify-center py-16">
                <Loader2 className="w-6 h-6 animate-spin text-slate-300" />
              </div>
            ) : obrasDoPeriodo.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                <BarChart3 className="w-14 h-14 text-slate-200 mb-3" />
                <p className="text-base font-medium text-slate-500">Nenhum dado para o período selecionado</p>
                <p className="text-sm mt-1">Ajuste os filtros de período ou cliente</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm border-collapse">
                  <thead>
                    <tr className="bg-slate-50/75 border-b border-slate-200/60 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                      <th className="px-5 py-3">Cliente</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3 text-center">Painéis</th>
                      <th className="px-4 py-3">Cidade</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {obrasDoPeriodo.map((obra) => (
                      <tr key={obra.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-5 py-3.5 font-medium text-slate-800">{obra.clienteNome}</td>
                        <td className="px-4 py-3.5">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                            obra.status === "Concluido"
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : obra.status === "EmAndamento"
                              ? "bg-blue-50 text-blue-700 border-blue-200"
                              : "bg-slate-50 text-slate-600 border-slate-200"
                          }`}>
                            {obra.status}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-center font-semibold text-slate-700">{obra.quantidadePaineis}</td>
                        <td className="px-4 py-3.5 text-slate-600">—</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
