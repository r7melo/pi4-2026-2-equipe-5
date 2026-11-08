import { MOCK_ATIVO } from "@/shared/lib/modoApi";
import { contextoDemonstracao, contextoDemonstracaoVigente, executarEfeitoDemonstracao } from "@/shared/lib/contextoDemonstracao";
import { filtrarPeriodo } from "@/shared/lib/filtrarPeriodo";
// RF-15/16: Relatórios e Exportação — Resumo por período com filtros de cliente e exportação
import { useState } from "react";
import { PageHeader } from "@/shared/components/ui/PageHeader";
import { useObrasSelect, useLinkRelatorioDemonstracao, useExportarRelatorio } from "@/features/financeiro/hooks/useRelatorios";
import { ApiErro } from '@/shared/api/api';
import { capturarSessaoOperacional, sessaoOperacionalVigente } from '@/shared/lib/sessaoOperacao';
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
  const gerarLinkMock = useLinkRelatorioDemonstracao();
  const { data: listaObras, isLoading: loadingObras } = useObrasSelect();
  const exportacao = useExportarRelatorio();
  const exportando = exportacao.isPending;
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
    const origem = contextoDemonstracao();
    const sessao = capturarSessaoOperacional();
    const vigente = () => contextoDemonstracaoVigente(origem) && sessaoOperacionalVigente(sessao);
    try {
      const blob = await exportacao.mutateAsync({ formato, filtros: MOCK_ATIVO ? { periodoInicio, periodoFim, clienteFiltro: clienteSelecionado } : undefined }, undefined, sessao);
      if (!vigente()) return;
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `relatorio-zl-${new Date().toISOString().split("T")[0]}.${formato === "pdf" ? "pdf" : "xlsx"}`;
      link.click();
      window.URL.revokeObjectURL(url);
      toast.success(`Relatório exportado em ${formato.toUpperCase()}`);
    } catch (erro) {
      if (!vigente()) return;
      toast.error(MOCK_ATIVO && erro instanceof ApiErro ? erro.message : "Erro ao exportar relatório");
    }
  };

  const handleGerarLink = async () => {
    const origem = contextoDemonstracao();
    setGerandoLink(true);
    try {
      // RF-16: Link compartilhável público para cronograma/relatório
      const token = MOCK_ATIVO
        ? await gerarLinkMock.mutateAsync({ periodoInicio, periodoFim, clienteFiltro: clienteSelecionado })
        : await new Promise<string>(r => setTimeout(() => r(btoa(`${periodoInicio}|${periodoFim}|${clienteSelecionado}`)), 900));
      if (!contextoDemonstracaoVigente(origem)) return;
      const link = `${window.location.origin}/relatorio-publico/${token}`;
      await executarEfeitoDemonstracao(origem, () => navigator.clipboard.writeText(link));
      if (!contextoDemonstracaoVigente(origem)) return;
      toast.success("Link copiado para a área de transferência!");
    } catch {
      if (!contextoDemonstracaoVigente(origem)) return;
      toast.error("Erro ao gerar link compartilhável");
    } finally {
      setGerandoLink(false);
    }
  };

  // Métricas simuladas do período
  const obrasDoPeriodo = MOCK_ATIVO
    ? filtrarPeriodo(listaObras?.itens ?? [], { periodoInicio, periodoFim, clienteFiltro: clienteSelecionado })
    : (listaObras?.itens || []).filter(o => clienteSelecionado === "todos" || o.clienteNome === clienteSelecionado);
  const totalObras = obrasDoPeriodo.length;
  const obrasConcluidasCount = obrasDoPeriodo.filter((o) => o.status === "Concluido").length;
  const totalPaineis = obrasDoPeriodo.reduce((acc, o) => acc + (o.quantidadePaineis ?? 0), 0);

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      <PageHeader title="Relatórios e Exportação">
        <button
          onClick={() => handleExportar("excel")}
          disabled={exportando}
          className="bg-surface border border-border-subtle hover:bg-surface-subtle text-foreground-secondary px-4 py-2 rounded-lg font-medium text-sm transition-colors flex items-center gap-2 cursor-pointer"
        >
          {exportando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4 text-success" />}
          Exportar Excel
        </button>
        <button
          onClick={() => handleExportar("pdf")}
          disabled={exportando}
          className="bg-surface border border-border-subtle hover:bg-surface-subtle text-foreground-secondary px-4 py-2 rounded-lg font-medium text-sm transition-colors flex items-center gap-2 cursor-pointer"
        >
          {exportando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4 text-destructive" />}
          Exportar PDF
        </button>
        <button
          onClick={handleGerarLink}
          disabled={gerandoLink}
          className="bg-primary hover:bg-primary-hover text-primary-foreground px-4 py-2 rounded-lg font-medium text-sm transition-colors flex items-center gap-2 cursor-pointer"
        >
          {gerandoLink ? <Loader2 className="w-4 h-4 animate-spin" /> : <Link2 className="w-4 h-4" />}
          Gerar link compartilhável
        </button>
      </PageHeader>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-6 bg-background-app">
        <div className="max-w-5xl mx-auto space-y-6">

          {/* Barra de filtros */}
          <div className="bg-surface rounded-xl border border-border-subtle p-4 flex flex-wrap items-center gap-4">
            {/* Filtro: Período */}
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground font-medium">
                <Calendar className="w-4 h-4" />
                <span>Período:</span>
              </div>
              <div className="flex items-center gap-1.5">
                <input
                  type="date"
                  id="relatorio-periodo-inicio"
                  value={periodoInicio}
                  onChange={(e) => setPeriodoInicio(e.target.value)}
                  className="text-sm bg-surface border border-border-subtle text-foreground rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-border-strong transition-shadow"
                />
                <span className="text-muted-foreground text-sm">—</span>
                <input
                  type="date"
                  id="relatorio-periodo-fim"
                  value={periodoFim}
                  onChange={(e) => setPeriodoFim(e.target.value)}
                  className="text-sm bg-surface border border-border-subtle text-foreground rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-border-strong transition-shadow"
                />
              </div>
            </div>

            {/* Divider */}
            <div className="hidden sm:block w-px h-6 bg-border-subtle" />

            {/* Filtro: Cliente */}
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground font-medium">
                <Users className="w-4 h-4" />
                <span>Cliente:</span>
              </div>
              <div className="relative">
                <select
                  id="relatorio-cliente"
                  value={clienteSelecionado}
                  onChange={(e) => setClienteSelecionado(e.target.value)}
                  disabled={loadingObras}
                  className="appearance-none text-sm border border-border-subtle rounded-lg pl-3 pr-8 py-1.5 focus:outline-none focus:ring-2 focus:ring-border-strong transition-shadow bg-surface text-foreground cursor-pointer"
                >
                  {clientes.map((c) => (
                    <option key={c} value={c} className="bg-surface text-foreground">
                      {c === "todos" ? "Todos os clientes" : c}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              </div>
            </div>

            {/* Badge de período selecionado */}
            <div className="ml-auto">
              <span className="text-xs font-medium px-2.5 py-1 bg-surface-subtle text-foreground-secondary rounded-full border border-border-subtle">
                {formatarDataCurta(new Date(periodoInicio + "T00:00:00"))} → {formatarDataCurta(new Date(periodoFim + "T00:00:00"))}
              </span>
            </div>
          </div>

          {/* Cards de métricas do período (Anti-Slop com tipografia monoespaçada tabular e sem halos decorativos) */}
          {loadingObras ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-surface rounded-xl p-5 border border-border-subtle">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-semibold text-muted-foreground">Obras no Período</p>
                  <FileText className="w-4 h-4 text-muted-foreground" />
                </div>
                <p className="text-2xl font-bold font-mono tracking-tight text-foreground">{totalObras}</p>
                <p className="text-xs text-muted-foreground mt-1">obras no filtro atual</p>
              </div>

              <div className="bg-surface rounded-xl p-5 border border-border-subtle">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-semibold text-muted-foreground">Concluídas</p>
                  <TrendingUp className="w-4 h-4 text-success" />
                </div>
                <p className="text-2xl font-bold font-mono tracking-tight text-foreground">{obrasConcluidasCount}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {totalObras > 0 ? Math.round((obrasConcluidasCount / totalObras) * 100) : 0}% de conclusão
                </p>
              </div>

              <div className="bg-surface rounded-xl p-5 border border-border-subtle">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-semibold text-muted-foreground">Total de Painéis</p>
                  <BarChart3 className="w-4 h-4 text-muted-foreground" />
                </div>
                <p className="text-2xl font-bold font-mono tracking-tight text-foreground">{totalPaineis.toLocaleString("pt-BR")}</p>
                <p className="text-xs text-muted-foreground mt-1">painéis instalados / previstos</p>
              </div>
            </div>
          )}

          {/* Área de gráfico / tabela resumo do período */}
          <div className="bg-surface rounded-xl border border-border-subtle overflow-hidden">
            <div className="px-5 py-4 border-b border-border-subtle flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-muted-foreground" />
              <h3 className="text-sm font-semibold text-foreground">Resumo do Período</h3>
            </div>

            {loadingObras ? (
              <div className="flex justify-center py-16">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : obrasDoPeriodo.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                <BarChart3 className="w-14 h-14 text-muted mb-3" />
                <p className="text-base font-medium text-foreground">Nenhum dado para o período selecionado</p>
                <p className="text-sm mt-1 text-muted-foreground">Ajuste os filtros de período ou cliente</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm border-collapse">
                  <thead>
                    <tr className="bg-surface-subtle border-b border-border-subtle text-xs font-semibold text-muted-foreground">
                      <th className="px-5 py-3">Cliente</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3 text-right">Painéis</th>
                      <th className="px-4 py-3">Cidade</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-subtle">
                    {obrasDoPeriodo.map((obra) => (
                      <tr key={obra.id} className="hover:bg-surface-subtle/70 transition-colors">
                        <td className="px-5 py-3.5 font-medium text-foreground">{obra.clienteNome}</td>
                        <td className="px-4 py-3.5">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                            obra.status === "Concluido"
                              ? "bg-success-light text-success border-success-border"
                              : obra.status === "EmAndamento"
                              ? "bg-info-light text-info border-info-border"
                              : "bg-surface-subtle text-foreground-secondary border-border-subtle"
                          }`}>
                            {obra.status}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-right font-mono font-medium text-foreground">
                          {obra.quantidadePaineis ? obra.quantidadePaineis.toLocaleString("pt-BR") : "—"}
                        </td>
                        <td className="px-4 py-3.5 text-muted-foreground">—</td>
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
