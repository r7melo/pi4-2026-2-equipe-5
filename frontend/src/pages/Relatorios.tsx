// RF-14/15: Relatórios financeiros e DRE por obra
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "@/components/ui/PageHeader";
import { useObras } from "@/hooks/api/useObras";
import { useRelatorioCusto } from "@/hooks/api/useRelatorios";
import { exportarRelatorio } from "@/services/relatorios";
import { toast } from "sonner";
import {
  Loader2,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Download,
  BarChart3,
  Search,
  ExternalLink,
} from "lucide-react";

function formatarMoeda(valor: number) {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function PainelDRE({ obraId }: { obraId: number }) {
  const { data, isLoading, isError } = useRelatorioCusto(obraId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="flex items-center justify-center py-12 text-slate-500 gap-2">
        <AlertCircle className="w-5 h-5 text-slate-400" />
        <span className="text-sm">Sem dados financeiros para esta obra.</span>
      </div>
    );
  }

  const lucroPercentual = data.receita > 0 ? ((data.lucro / data.receita) * 100).toFixed(1) : "0";
  const isPositivo = data.lucro >= 0;

  return (
    <div className="space-y-6">
      {/* Cards de resumo */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Receita Total</p>
            <div className="bg-blue-50 p-2 rounded-lg">
              <DollarSign className="w-4 h-4 text-blue-600" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900">{formatarMoeda(data.receita)}</p>
        </div>

        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Custo Total</p>
            <div className="bg-red-50 p-2 rounded-lg">
              <TrendingDown className="w-4 h-4 text-red-500" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900">{formatarMoeda(data.custoTotal)}</p>
        </div>

        <div className={`rounded-xl p-5 border shadow-sm ${isPositivo ? "bg-emerald-50 border-emerald-200" : "bg-red-50 border-red-200"}`}>
          <div className="flex items-center justify-between mb-2">
            <p className={`text-xs font-semibold uppercase tracking-wider ${isPositivo ? "text-emerald-700" : "text-red-700"}`}>
              Lucro / Margem
            </p>
            <div className={`p-2 rounded-lg ${isPositivo ? "bg-emerald-100" : "bg-red-100"}`}>
              <TrendingUp className={`w-4 h-4 ${isPositivo ? "text-emerald-600" : "text-red-600"}`} />
            </div>
          </div>
          <p className={`text-2xl font-bold ${isPositivo ? "text-emerald-800" : "text-red-800"}`}>
            {formatarMoeda(data.lucro)}
          </p>
          <p className={`text-xs mt-1 font-medium ${isPositivo ? "text-emerald-600" : "text-red-600"}`}>
            {lucroPercentual}% de margem
          </p>
        </div>
      </div>

      {/* Detalhamento de custos */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-slate-400" />
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Composição de Custos</h3>
        </div>
        <div className="divide-y divide-slate-100">
          {data.itens.map((item, i) => {
            const percentual = data.custoTotal > 0 ? ((item.valor / data.custoTotal) * 100).toFixed(0) : 0;
            return (
              <div key={i} className="px-5 py-4 flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-sm font-medium text-slate-800">{item.descricao}</p>
                  <div className="mt-2 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-500 rounded-full transition-all duration-700"
                      style={{ width: `${percentual}%` }}
                    />
                  </div>
                </div>
                <div className="ml-4 text-right shrink-0">
                  <p className="text-sm font-bold text-slate-900">{formatarMoeda(item.valor)}</p>
                  <p className="text-xs text-slate-500">{percentual}%</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default function Relatorios() {
  const navigate = useNavigate();
  const { data: listaObras, isLoading: loadingObras } = useObras();
  const [obraIdSelecionada, setObraIdSelecionada] = useState<number | null>(null);
  const [busca, setBusca] = useState("");
  const [exportando, setExportando] = useState(false);

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

  const obrasFiltradas = (listaObras?.itens || []).filter((o) =>
    o.clienteNome.toLowerCase().includes(busca.toLowerCase())
  );

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      <PageHeader title="Relatórios Financeiros" subtitle="DRE e análise de custos por obra">
        <button
          onClick={() => handleExportar("excel")}
          disabled={exportando}
          className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 px-4 py-2 rounded-lg font-medium text-sm transition-colors flex items-center gap-2 cursor-pointer shadow-sm"
        >
          {exportando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4 text-emerald-600" />}
          Excel
        </button>
        <button
          onClick={() => handleExportar("pdf")}
          disabled={exportando}
          className="bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-lg font-medium text-sm transition-colors flex items-center gap-2 cursor-pointer shadow-sm"
        >
          {exportando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
          PDF
        </button>
      </PageHeader>

      <div className="flex-1 overflow-hidden flex">
        {/* Painel lateral: lista de obras */}
        <div className="w-72 shrink-0 border-r border-slate-200 bg-white flex flex-col overflow-hidden">
          <div className="p-3 border-b border-slate-100">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar obra..."
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-400 transition-shadow"
              />
            </div>
          </div>

          <nav className="flex-1 overflow-y-auto custom-scrollbar">
            {loadingObras ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-slate-300" />
              </div>
            ) : obrasFiltradas.length === 0 ? (
              <div className="text-center py-8 text-slate-500 text-sm px-4">
                Nenhuma obra encontrada.
              </div>
            ) : (
              obrasFiltradas.map((obra) => (
                <button
                  key={obra.id}
                  onClick={() => setObraIdSelecionada(obra.id)}
                  className={`w-full text-left p-4 border-b border-slate-100 transition-colors cursor-pointer ${
                    obraIdSelecionada === obra.id
                      ? "bg-slate-900 text-white"
                      : "hover:bg-slate-50 text-slate-700"
                  }`}
                >
                  <p className="text-sm font-semibold truncate">{obra.clienteNome}</p>
                  <p className={`text-xs mt-1 ${obraIdSelecionada === obra.id ? "text-slate-300" : "text-slate-500"}`}>
                    {obra.status} • {obra.quantidadePaineis} Painéis
                  </p>
                </button>
              ))
            )}
          </nav>
        </div>

        {/* Área principal: DRE */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 bg-slate-50">
          {!obraIdSelecionada ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400">
              <BarChart3 className="w-16 h-16 mb-4 text-slate-200" />
              <p className="text-lg font-medium text-slate-600">Selecione uma obra</p>
              <p className="text-sm mt-1">Clique em uma obra na lista para visualizar o DRE</p>
            </div>
          ) : (
            <div className="max-w-4xl mx-auto">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">
                    DRE — Obra #{obraIdSelecionada}
                  </h2>
                  <p className="text-sm text-slate-500 mt-0.5">
                    {obrasFiltradas.find((o) => o.id === obraIdSelecionada)?.clienteNome}
                  </p>
                </div>
                <button
                  onClick={() => navigate(`/obras/${obraIdSelecionada}`)}
                  className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 font-medium transition-colors"
                >
                  Ver Detalhes da Obra <ExternalLink className="w-4 h-4" />
                </button>
              </div>
              <PainelDRE obraId={obraIdSelecionada} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
