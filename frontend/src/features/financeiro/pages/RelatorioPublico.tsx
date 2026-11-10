// RF-16: Visualização pública e somente leitura do relatório/cronograma de obras
import { useParams, Link } from "react-router-dom";
import { useRelatorioPublico } from "@/features/financeiro/hooks/useRelatorioPublico";
import { Button } from "@/shared/components/ui/Button";
import {
  Sun,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Inbox,
  MapPin,
  Clock,
  Printer,
  ShieldCheck,
  Building2,
} from "lucide-react";

export default function RelatorioPublico() {
  const { token } = useParams<{ token: string }>();
  const { data, isLoading, isError, error } = useRelatorioPublico(token || "");

  // Estado 1: Carregando
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background-app flex flex-col items-center justify-center p-4">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="p-4 bg-surface rounded-xl border border-border-subtle">
            <Sun className="w-8 h-8 text-foreground-muted animate-spin" />
          </div>
          <p className="text-sm font-semibold text-foreground">Carregando relatório compartilhado...</p>
          <p className="text-xs text-muted-foreground">Validando chave de acesso pública</p>
        </div>
      </div>
    );
  }

  const respostaInvalida = !data || Array.isArray(data) || !Array.isArray(data.obras);

  // Estado 2: Erro (Token inválido ou falha de rede)
  if (isError || respostaInvalida) {
    return (
      <div className="min-h-screen bg-background-app flex flex-col items-center justify-center p-4">
        <div className="bg-surface border border-border-subtle rounded-xl p-6 sm:p-8 max-w-md w-full text-center flex flex-col items-center">
          <div className="w-12 h-12 bg-destructive-light border border-destructive-border rounded-xl flex items-center justify-center text-destructive mb-4">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-foreground mb-1.5">Link Inválido ou Expirado</h2>
          <p className="text-xs text-muted-foreground mb-5 leading-relaxed">
            {(error as Error)?.message || "Não foi possível carregar os dados deste relatório compartilhado."}
          </p>
          <Link
            to="/login"
            className="w-full h-9 bg-primary hover:bg-primary-hover text-primary-foreground font-medium rounded-lg transition-colors text-xs flex items-center justify-center"
          >
            Ir para o Login do Sistema
          </Link>
        </div>
      </div>
    );
  }

  const {
    periodoInicio = "",
    periodoFim = "",
    clienteFiltro = "todos",
    obras = [],
    totalObras = 0,
    obrasConcluidas = 0,
    totalPaineis = 0,
  } = data;

  const handleImprimir = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-background-app text-foreground flex flex-col font-sans print:bg-white print:text-black">
      {/* Header público sóbrio da ZL Engenharia */}
      <header className="bg-surface/90 border-b border-border-subtle sticky top-0 z-10 backdrop-blur-md print:static print:border-b">
        <div className="max-w-6xl mx-auto px-4 py-3.5 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-surface-subtle border border-border-subtle rounded-lg text-foreground flex items-center justify-center shrink-0">
              <Sun className="w-5 h-5 text-foreground" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-foreground tracking-tight">ZL Engenharia Solar</h1>
              <p className="text-xs text-muted-foreground">Relatório Público de Execução de Obras</p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 print:hidden">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-success-light border border-success-border text-success text-[11px] font-semibold">
              <ShieldCheck className="w-3.5 h-3.5" /> Somente Leitura
            </span>
            <Button
              variant="outline"
              onClick={handleImprimir}
              className="h-8 px-3 text-xs gap-1.5 cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5 text-muted-foreground" />
              Imprimir / PDF
            </Button>
          </div>
        </div>
      </header>

      {/* Conteúdo Principal */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-6 space-y-6">
        {/* Banner Informativo do Período (Quiet Panel) */}
        <div className="bg-surface border border-border-subtle rounded-xl p-5">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-bold text-foreground">Visão Geral dos Projetos Fotovoltaicos</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Acompanhamento da execução física e prazos das instalações de energia solar.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs">
              {periodoInicio && periodoFim && (
                <div className="flex items-center gap-1.5 px-2.5 py-1 bg-surface-subtle border border-border-subtle rounded-lg text-foreground-secondary">
                  <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                  <span>Período: <strong className="font-mono">{periodoInicio}</strong> até <strong className="font-mono">{periodoFim}</strong></span>
                </div>
              )}
              {clienteFiltro && clienteFiltro !== "todos" && (
                <div className="flex items-center gap-1.5 px-2.5 py-1 bg-surface-subtle border border-border-subtle rounded-lg text-foreground-secondary">
                  <Building2 className="w-3.5 h-3.5 text-muted-foreground" />
                  <span>Cliente: <strong>{clienteFiltro}</strong></span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Métricas Principais (Quiet Panels com tipografia font-mono) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="bg-surface border border-border-subtle rounded-xl p-4">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total de Obras</span>
              <Clock className="w-4 h-4 text-muted-foreground" />
            </div>
            <p className="text-2xl font-bold font-mono tracking-tight text-foreground">{totalObras}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">no escopo selecionado</p>
          </div>

          <div className="bg-surface border border-border-subtle rounded-xl p-4">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Concluídas</span>
              <CheckCircle2 className="w-4 h-4 text-success" />
            </div>
            <p className="text-2xl font-bold font-mono tracking-tight text-foreground">{obrasConcluidas}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {totalObras > 0 ? `${Math.round((obrasConcluidas / totalObras) * 100)}% de conclusão` : "0%"}
            </p>
          </div>

          <div className="bg-surface border border-border-subtle rounded-xl p-4">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Painéis Instalados</span>
              <Sun className="w-4 h-4 text-foreground-muted" />
            </div>
            <p className="text-2xl font-bold font-mono tracking-tight text-foreground">
              {totalPaineis.toLocaleString("pt-BR")}
            </p>
            <p className="text-[11px] text-muted-foreground mt-0.5">módulos solares</p>
          </div>
        </div>

        {/* Estado 3: Vazio */}
        {obras.length === 0 ? (
          <div className="bg-surface border border-border-subtle rounded-xl p-10 text-center flex flex-col items-center gap-2.5">
            <Inbox className="w-10 h-10 text-muted-foreground/60" />
            <h3 className="text-sm font-semibold text-foreground">Nenhuma obra encontrada</h3>
            <p className="text-xs text-muted-foreground max-w-sm">
              Não existem registros de obras para os parâmetros de filtro especificados neste link.
            </p>
          </div>
        ) : (
          /* Estado 4: Sucesso - Lista de Obras em Tabela de Alta Densidade */
          <div className="bg-surface border border-border-subtle rounded-xl overflow-hidden">
            <div className="px-5 py-3 bg-surface-subtle border-b border-border-subtle flex items-center justify-between">
              <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider">
                Cronograma e Status das Instalações
              </h3>
              <span className="text-xs font-mono text-muted-foreground">{obras.length} obra(s) listada(s)</span>
            </div>

            <div className="divide-y divide-border-subtle">
              {obras.map((obra) => {
                const progresso = obra.progressoGeral ?? null;

                const getStatusBadge = (status?: string | null) => {
                  switch (status) {
                    case "Concluido":
                      return (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-success-light text-success border border-success-border">
                          Concluída
                        </span>
                      );
                    case "EmAndamento":
                      return (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-warning-light text-warning border border-warning-border">
                          Em Andamento
                        </span>
                      );
                    case "NoDeposito":
                      return (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-surface-subtle text-foreground-secondary border border-border-subtle">
                          No Depósito
                        </span>
                      );
                    case "Separado":
                      return (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-surface-subtle text-foreground-secondary border border-border-subtle">
                          Separado
                        </span>
                      );
                    case "MaterialComprado":
                      return (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-surface-subtle text-muted-foreground border border-border-subtle">
                          Material Comprado
                        </span>
                      );
                    default:
                      return (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-destructive-light text-destructive border border-destructive-border">
                          Assistência
                        </span>
                      );
                  }
                };

                return (
                  <div key={obra.id} className="p-4 hover:bg-surface-subtle/40 transition-colors">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2.5 flex-wrap">
                          <h4 className="text-sm font-semibold text-foreground">
                            {obra.nome || `Instalação Solar - ${obra.clienteNome}`}
                          </h4>
                          {getStatusBadge(obra.status)}
                        </div>
                        <div className="flex items-center gap-3.5 text-xs text-muted-foreground flex-wrap pt-0.5">
                          <span>Cliente: <strong className="text-foreground">{obra.clienteNome}</strong></span>
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5 text-muted-foreground" />
                            {obra.cidade || "N/I"} - {obra.uf || "UF"}
                          </span>
                          <span className="flex items-center gap-1 font-mono">
                            <Sun className="w-3.5 h-3.5 text-muted-foreground" />
                            {obra.quantidadePaineis} painéis
                          </span>
                        </div>
                      </div>

                      {/* Progresso de Instalação */}
                      <div className="w-full md:w-48 space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="text-muted-foreground">Progresso</span>
                          {progresso === null ? (
                            <span className="text-muted-foreground">Não informado</span>
                          ) : (
                            <span className="font-mono font-bold text-foreground">{progresso}%</span>
                          )}
                        </div>
                        {progresso !== null && (
                          <div className="w-full h-1.5 bg-surface-subtle border border-border-subtle rounded-full overflow-hidden">
                            <div
                              className="h-full bg-primary rounded-full transition-all duration-300"
                              style={{ width: `${progresso}%` }}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </main>

      {/* Footer sóbrio */}
      <footer className="border-t border-border-subtle py-5 text-center text-xs text-muted-foreground print:hidden">
        <p>© 2026 ZL Engenharia Solar — Sistema de Gestão de Obras</p>
      </footer>
    </div>
  );
}
