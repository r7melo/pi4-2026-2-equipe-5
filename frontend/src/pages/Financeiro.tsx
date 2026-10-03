// RF-14/15: Financeiro — DRE (Demonstrativo de Resultado por Exercício) por obra
import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { PageHeader } from "@/components/ui/PageHeader";
import { useObras } from "@/hooks/api/useObras";
import { useRelatorioCusto } from "@/hooks/api/useRelatorios";
import {
  Loader2,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  DollarSign,
  BarChart3,
  Search,
  ExternalLink,
  Package,
  CheckCircle2,
  AlertTriangle,
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
          {data.itens.map((item) => {
            const percentual = data.custoTotal > 0 ? ((item.valor / data.custoTotal) * 100).toFixed(0) : 0;
            return (
              <div key={item.descricao} className="px-5 py-4 flex items-center justify-between">
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

      {/* Balanço de Materiais (RF-20) */}
      {data.balancoMateriais && data.balancoMateriais.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Package className="w-5 h-5 text-amber-500" />
              <div>
                <h4 className="font-semibold text-slate-800">Balanço de Materiais</h4>
                <p className="text-xs text-slate-500">Comparativo entre materiais comprados e aplicados na obra</p>
              </div>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 bg-amber-50 text-amber-700 border border-amber-200/60 rounded-full">
              RF-20
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-slate-50/75 border-b border-slate-200/60 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  <th className="px-5 py-3">Insumo / Material</th>
                  <th className="px-4 py-3 text-center">Comprado</th>
                  <th className="px-4 py-3 text-center">Utilizado</th>
                  <th className="px-4 py-3 text-center">Saldo / Sobra</th>
                  <th className="px-5 py-3 text-right">Utilização (%)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.balancoMateriais.map((mat) => {
                  const sobra = mat.quantidadeComprada - mat.quantidadeUtilizada;
                  const pct =
                    mat.quantidadeComprada > 0
                      ? Math.min(100, Math.round((mat.quantidadeUtilizada / mat.quantidadeComprada) * 100))
                      : 0;
                  const isExcesso = mat.quantidadeUtilizada > mat.quantidadeComprada;
                  const isCompleto = mat.quantidadeUtilizada === mat.quantidadeComprada;

                  return (
                    <tr key={mat.tipo} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-5 py-3.5 font-medium text-slate-800">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-slate-400" />
                          <span>{mat.tipo}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-center text-slate-600">
                        <span className="font-semibold text-slate-900">{mat.quantidadeComprada}</span>{" "}
                        <span className="text-xs text-slate-400">{mat.unidade}</span>
                      </td>
                      <td className="px-4 py-3.5 text-center text-slate-600">
                        <span className="font-semibold text-slate-900">{mat.quantidadeUtilizada}</span>{" "}
                        <span className="text-xs text-slate-400">{mat.unidade}</span>
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        {isExcesso ? (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-200">
                            <AlertTriangle className="w-3 h-3" />
                            {sobra} {mat.unidade}
                          </span>
                        ) : isCompleto ? (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3" />
                            0 {mat.unidade}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                            +{sobra} {mat.unidade}
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-3">
                          <div className="w-24 h-2 bg-slate-100 rounded-full overflow-hidden shrink-0">
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${
                                isExcesso ? "bg-red-500" : isCompleto ? "bg-emerald-500" : "bg-amber-500"
                              }`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className="font-semibold text-xs text-slate-700 w-9 text-right">{pct}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

export default function Financeiro() {
  const navigate = useNavigate();
  const location = useLocation();
  const { data: listaObras, isLoading: loadingObras } = useObras();

  const stateObraId = (location.state as { selectedObraId?: number } | null)?.selectedObraId ?? null;
  const [obraIdSelecionada, setObraIdSelecionada] = useState<number | null>(stateObraId);
  const [prevStateObraId, setPrevStateObraId] = useState<number | null>(stateObraId);
  const [busca, setBusca] = useState("");

  if (stateObraId !== prevStateObraId) {
    setPrevStateObraId(stateObraId);
    setObraIdSelecionada(stateObraId);
  }

  const obrasFiltradas = (listaObras?.itens || []).filter((o) =>
    o.clienteNome.toLowerCase().includes(busca.toLowerCase())
  );

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      <PageHeader title="Financeiro" subtitle="DRE e análise de custos por obra">
       
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
                {/* Passa state.from e selectedObraId para que DetalheObra saiba retornar ao Financeiro */}
                <button
                  onClick={() =>
                    navigate(`/obras/${obraIdSelecionada}`, {
                      state: { from: "/financeiro", selectedObraId: obraIdSelecionada },
                    })
                  }
                  className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 font-medium transition-colors cursor-pointer"
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

