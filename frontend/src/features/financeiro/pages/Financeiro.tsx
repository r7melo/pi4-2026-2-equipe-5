// Financeiro — DRE (Demonstrativo de Resultado do Exercício) e Gestão de Custos por Obra
import { useState, useSyncExternalStore } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { PageHeader } from "@/shared/components/ui/PageHeader";
import { Button } from "@/shared/components/ui/Button";
import FeedbackLoading from "@/shared/components/feedback/FeedbackLoading";
import FeedbackErro from "@/shared/components/feedback/FeedbackErro";
import { EmptyState } from "@/shared/components/feedback/EmptyState";
import {
  useObrasSelect,
  useDreObra,
  useCustosObra,
  useRelatorioCustoObra,
} from "@/features/financeiro/hooks/useRelatorios";
import { useAuthStore } from "@/shared/stores/useAuthStore";
import { assinarSessaoOperacional, capturarSessaoOperacional } from "@/shared/lib/sessaoOperacao";
import { ModalLancamentoCustos } from "../components/ModalLancamentoCustos";
import { formatarMoeda } from "@/shared/lib/formatters";
import {
  MENSAGEM_ERRO_CONSULTA_DRE,
  apurarDrePainel,
  bannerParcialDre,
  extrairMensagemErroApi,
  statusHttpErro,
  type ApuracaoDrePainel,
  type BannerParcialDre,
} from "../lib/apuracaoDre";
import type { BalancoMaterial, CustosObra } from "@/shared/types/relatorios";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  BarChart3,
  Search,
  ExternalLink,
  PlusCircle,
  FileText,
  AlertTriangle,
  Building2,
  HardHat,
  Package,
} from "lucide-react";

interface PainelDREProps {
  obraId: number;
  clienteNome: string;
  statusObra: string;
}

interface PainelDREConteudoProps {
  obraId: number;
  clienteNome: string;
  statusObra: string;
  podeGerenciarCustos: boolean;
  apuracao: ApuracaoDrePainel;
  bannerParcial: BannerParcialDre | null;
  custos?: CustosObra;
  balancoMateriais?: BalancoMaterial[];
}

const BALANCO_VAZIO: BalancoMaterial[] = [];

function PainelDREConteudo({
  obraId,
  clienteNome,
  statusObra,
  podeGerenciarCustos,
  apuracao,
  bannerParcial,
  custos,
  balancoMateriais = BALANCO_VAZIO,
}: PainelDREConteudoProps) {
  const navigate = useNavigate();
  const [modalAberto, setModalAberto] = useState(false);

  const positivo = apuracao.resultado >= 0;
  const textoCusto = (valor: number) => (valor > 0 ? `-${formatarMoeda(valor)}` : formatarMoeda(0));

  return (
    <div className="space-y-6">
      {/* Barra de ações superior */}
      <div className="bg-surface rounded-xl border border-border-subtle p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
            <Building2 className="w-4 h-4 text-foreground-muted" /> {clienteNome}
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Obra #{obraId} • Situação: <strong className="text-foreground">{statusObra}</strong>
          </p>
        </div>

        <div className="flex items-center gap-2">
          {podeGerenciarCustos && (
            <Button
              onClick={() => setModalAberto(true)}
              className="flex items-center gap-2 text-xs"
            >
              <PlusCircle className="w-4 h-4" />
              Lançar / Atualizar Custos
            </Button>
          )}

          <Button
            variant="outline"
            onClick={() =>
              navigate(`/obras/${obraId}`, {
                state: { from: "/financeiro", selectedObraId: obraId },
              })
            }
            className="flex items-center gap-2 text-xs"
            title="Ir para página detalhada da obra"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            Ver Obra
          </Button>
        </div>
      </div>

      {/* Banner de aviso parcial quando obra em execução, precificação incompleta ou pendente de apuração oficial */}
      {bannerParcial && (
        <div
          role="status"
          className="p-4 rounded-xl bg-warning-light border border-warning-border text-warning flex items-start gap-3"
        >
          <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5 text-warning" />
          <div className="text-xs space-y-1">
            <p className="font-semibold text-sm">{bannerParcial.titulo}</p>
            <p>{bannerParcial.descricao}</p>
          </div>
        </div>
      )}

      {/* Cards de Resumo Executivo */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-surface rounded-xl p-5 border border-border-subtle">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-muted-foreground">Valor da Obra (Receita)</p>
            <DollarSign className="w-4 h-4 text-muted-foreground" />
          </div>
          <p className="text-2xl font-bold font-mono tracking-tight text-foreground">
            {formatarMoeda(apuracao.valorObra)}
          </p>
          <p className="text-[11px] text-muted-foreground mt-1">
            Faturamento contratado da instalação
          </p>
        </div>

        <div className="bg-surface rounded-xl p-5 border border-border-subtle">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-muted-foreground">Custo Total Apurado</p>
            <TrendingDown className="w-4 h-4 text-destructive" />
          </div>
          <p className="text-2xl font-bold font-mono tracking-tight text-foreground">
            {formatarMoeda(apuracao.custoTotal)}
          </p>
          <p className="text-[11px] text-muted-foreground mt-1">
            Mão de obra + Insumos de instalação
          </p>
        </div>

        <div
          className={`rounded-xl p-5 border ${
            positivo
              ? "bg-success-light/30 border-success-border/60"
              : "bg-destructive-light/30 border-destructive-border/60"
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <p className={`text-xs font-semibold ${positivo ? "text-success" : "text-destructive"}`}>
              Resultado da Obra
            </p>
            <TrendingUp
              className={`w-4 h-4 ${positivo ? "text-success" : "text-destructive"}`}
            />
          </div>
          <p
            className={`text-2xl font-bold font-mono tracking-tight ${
              positivo ? "text-success" : "text-destructive"
            }`}
          >
            {formatarMoeda(apuracao.resultado)}
          </p>
          <p
            className={`text-xs mt-1 font-semibold ${
              positivo ? "text-success" : "text-destructive"
            }`}
          >
            {apuracao.margemPercentual}% de margem
          </p>
        </div>
      </div>

      {/* Detalhamento Analítico Contábil */}
      <div className="bg-surface rounded-xl border border-border-subtle overflow-hidden">
        <div className="px-5 py-4 border-b border-border-subtle flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-foreground-muted" />
            <h3 className="text-xs font-bold text-foreground-muted uppercase tracking-wider">
              Demonstrativo de Resultado da Obra (DRE)
            </h3>
          </div>
          <span className="text-xs text-muted-foreground font-mono">DRE Sintético</span>
        </div>

        <div className="divide-y divide-border-subtle text-sm">
          <div className="px-5 py-3.5 flex items-center justify-between">
            <span className="text-foreground-secondary font-medium">Valor da Obra (Receita Bruta)</span>
            <span className="font-mono font-bold text-foreground">
              {formatarMoeda(apuracao.valorObra)}
            </span>
          </div>
          <div className="px-5 py-3.5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <HardHat className="w-4 h-4 text-muted-foreground" />
              <span className="text-foreground-secondary">(-) Custo de Mão de Obra e Instalação</span>
            </div>
            <span className="font-mono font-medium text-destructive">
              {textoCusto(apuracao.custoMaoObra)}
            </span>
          </div>
          <div className="px-5 py-3.5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Package className="w-4 h-4 text-muted-foreground" />
              <span className="text-foreground-secondary">(-) Custo de Insumos e Materiais</span>
            </div>
            <span className="font-mono font-medium text-destructive">
              {textoCusto(apuracao.custoInsumos)}
            </span>
          </div>
          <div className="px-5 py-3.5 flex items-center justify-between bg-surface-subtle/30 font-medium">
            <span className="text-foreground-muted">(=) Custo Total Apurado</span>
            <span className="font-mono text-destructive">
              {textoCusto(apuracao.custoTotal)}
            </span>
          </div>
          <div className="px-5 py-4 flex items-center justify-between bg-surface-subtle/50 font-bold border-t border-border-subtle">
            <span className="text-foreground">(=) Resultado da Obra (Valor da Obra − Custo Total)</span>
            <span className={`font-mono text-base ${positivo ? "text-success" : "text-destructive"}`}>
              {formatarMoeda(apuracao.resultado)}
            </span>
          </div>
        </div>
      </div>

      {/* Balanço Físico de Materiais da Obra */}
      <div className="bg-surface rounded-xl border border-border-subtle overflow-hidden">
        <div className="px-5 py-4 border-b border-border-subtle flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Package className="w-4 h-4 text-foreground-muted" />
            <h3 className="text-xs font-bold text-foreground-muted uppercase tracking-wider">
              Balanço de Materiais da Obra
            </h3>
          </div>
          <span className="text-xs text-muted-foreground font-mono tabular-nums">
            {balancoMateriais.length} {balancoMateriais.length === 1 ? "insumo" : "insumos"}
          </span>
        </div>

        {balancoMateriais.length === 0 ? (
          <div className="p-5 text-xs text-muted-foreground text-center">
            Nenhum insumo vinculado ao balanço físico desta obra até o momento.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-surface-subtle border-b border-border-subtle text-xs font-semibold text-muted-foreground">
                  <th scope="col" className="py-2.5 px-5">Material / Insumo</th>
                  <th scope="col" className="py-2.5 px-4">Unidade</th>
                  <th scope="col" className="py-2.5 px-4 text-right">Qtd. Solicitada</th>
                  <th scope="col" className="py-2.5 px-4 text-right">Qtd. Utilizada</th>
                  <th scope="col" className="py-2.5 px-5 text-right">Saldo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle">
                {balancoMateriais.map((item) => {
                  const comprada = item.quantidadeComprada ?? 0;
                  const utilizada = item.quantidadeUtilizada ?? 0;
                  const saldo = Math.max(0, comprada - utilizada);
                  return (
                    <tr
                      key={`${item.tipo}-${item.unidade ?? ""}-${comprada}-${utilizada}`}
                      className="hover:bg-surface-subtle/50 transition-colors"
                    >
                      <td className="py-2.5 px-5 font-medium text-foreground">
                        {item.tipo || "Material"}
                      </td>
                      <td className="py-2.5 px-4 font-mono text-xs text-muted-foreground">
                        {item.unidade || "un"}
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono text-foreground-secondary tabular-nums">
                        {comprada}
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono text-foreground tabular-nums">
                        {utilizada}
                      </td>
                      <td className="py-2.5 px-5 text-right font-mono font-semibold text-foreground tabular-nums">
                        {saldo}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal de Lançamento */}
      <ModalLancamentoCustos
        isOpen={modalAberto}
        onClose={() => setModalAberto(false)}
        obraId={obraId}
        clienteNome={clienteNome}
        custosAtuais={custos}
      />
    </div>
  );
}

function PainelDRE({ obraId, clienteNome, statusObra }: PainelDREProps) {
  const perfil = useAuthStore((s) => s.usuario?.perfil?.nomePerfil);
  const podeGerenciarCustos = perfil === "Financeiro";

  const {
    data: dre,
    isLoading: loadingDre,
    isError: erroDre,
    error: falhaDre,
    refetch: refetchDre,
  } = useDreObra(obraId, statusObra);
  const {
    data: custos,
    isLoading: loadingCustos,
    isError: erroCustos,
    error: falhaCustos,
    refetch: refetchCustos,
  } = useCustosObra(obraId);
  const { data: relatorioCusto } = useRelatorioCustoObra(obraId);

  const statusErroDre = erroDre ? statusHttpErro(falhaDre) : undefined;
  const erroDreNao400 = erroDre && statusErroDre !== 400;
  const erroFatal = erroCustos || erroDreNao400;

  if (loadingDre || loadingCustos) {
    return <FeedbackLoading mensagem="Consultando apuração contábil e custos no servidor..." />;
  }

  if (erroFatal) {
    const falhaPrincipal = erroCustos ? falhaCustos : falhaDre;
    return (
      <FeedbackErro
        titulo="Falha ao consultar demonstrativo financeiro"
        mensagem={extrairMensagemErroApi(falhaPrincipal, MENSAGEM_ERRO_CONSULTA_DRE)}
        onTentarNovamente={() => {
          void refetchCustos();
          void refetchDre();
        }}
      />
    );
  }

  const dreEfetivo = erroDre ? undefined : dre;
  const apuracao = apurarDrePainel(obraId, statusObra, dreEfetivo, custos);
  const bannerParcial = bannerParcialDre(
    apuracao.obraConcluida,
    apuracao.precificacaoCompleta,
    erroDre
  );

  return (
    <PainelDREConteudo
      key={podeGerenciarCustos ? "editavel" : "leitura"}
      obraId={obraId}
      clienteNome={clienteNome}
      statusObra={statusObra}
      podeGerenciarCustos={podeGerenciarCustos}
      apuracao={apuracao}
      bannerParcial={bannerParcial}
      custos={custos}
      balancoMateriais={relatorioCusto?.balancoMateriais}
    />
  );
}

export default function Financeiro() {
  const navigate = useNavigate();
  const location = useLocation();
  const perfil = useAuthStore((s) => s.usuario?.perfil?.nomePerfil);
  const podeCadastrarObra = perfil === "Administrador";
  const sessaoAtual = useSyncExternalStore(assinarSessaoOperacional, capturarSessaoOperacional);
  const {
    data: listaObras,
    isLoading: loadingObras,
    isError: erroObras,
    refetch: refetchObras,
  } = useObrasSelect();

  const stateObraId = (location.state as { selectedObraId?: number } | null)?.selectedObraId ?? null;
  const [obraIdSelecionadaState, setObraIdSelecionada] = useState<number | null>(stateObraId);
  const [busca, setBusca] = useState("");

  const primeiroObraId = listaObras?.itens?.[0]?.id ?? null;
  const obraIdSelecionada = obraIdSelecionadaState ?? primeiroObraId;

  const obrasFiltradas = (listaObras?.itens || []).filter((o) =>
    o.clienteNome.toLowerCase().includes(busca.toLowerCase())
  );

  const obraAtual = listaObras?.itens.find((o) => o.id === obraIdSelecionada);

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-background-app">
      <PageHeader title="Financeiro" subtitle="DRE e apuração de custos por obra" />

      {/* Tratamento dos 4 estados da listagem de obras */}
      {loadingObras ? (
        <FeedbackLoading mensagem="Carregando obras do módulo financeiro..." />
      ) : erroObras ? (
        <FeedbackErro
          titulo="Falha ao carregar obras financeiras"
          mensagem="Não foi possível buscar a lista de obras. Verifique se o servidor está ativo."
          onTentarNovamente={() => void refetchObras()}
        />
      ) : !listaObras || listaObras.itens.length === 0 ? (
        <EmptyState
          icone={DollarSign}
          titulo="Nenhuma obra cadastrada"
          descricao="Cadastre uma obra para iniciar os lançamentos de custos e acompanhamento do DRE."
          acao={
            podeCadastrarObra
              ? {
                  label: "Cadastrar Nova Obra",
                  onClick: () => void navigate("/cadastrarobra"),
                }
              : undefined
          }
        />
      ) : (
        <div className="flex-1 min-h-0 overflow-y-auto flex flex-col md:flex-row">
          {/* Painel lateral: lista de obras */}
          <div className="w-full md:w-80 shrink-0 border-r border-border-subtle bg-surface flex flex-col overflow-hidden">
            <div className="p-3 border-b border-border-subtle">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  aria-label="Buscar obra por cliente"
                  placeholder="Buscar obra por cliente..."
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  className="w-full text-xs bg-surface-subtle border border-border-subtle rounded-lg pl-9 pr-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar divide-y divide-border-subtle">
              {obrasFiltradas.length === 0 ? (
                <div className="p-6 text-center text-xs text-muted-foreground">
                  Nenhuma obra corresponde à busca.
                </div>
              ) : (
                obrasFiltradas.map((obra) => {
                  const ativa = obra.id === obraIdSelecionada;
                  return (
                    <button
                      key={obra.id}
                      onClick={() => setObraIdSelecionada(obra.id)}
                      className={`w-full text-left p-3.5 transition-colors flex flex-col gap-1 cursor-pointer ${
                        ativa
                          ? "bg-muted font-semibold border-l-4 border-primary"
                          : "hover:bg-surface-subtle"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-foreground truncate max-w-[170px]">
                          {obra.clienteNome}
                        </span>
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                            obra.status === "Concluido"
                              ? "bg-success-light text-success border border-success-border"
                              : "bg-surface-subtle text-foreground-muted border border-border-subtle"
                          }`}
                        >
                          {obra.status}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                        <span>#{obra.id}</span>
                        <span>{obra.quantidadePaineis ?? 0} módulos</span>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Área principal: Painel DRE da obra selecionada */}
          <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
            <div className="max-w-4xl mx-auto">
              {obraAtual ? (
                <PainelDRE
                  key={`${obraAtual.id}-${sessaoAtual}`}
                  obraId={obraAtual.id}
                  clienteNome={obraAtual.clienteNome}
                  statusObra={obraAtual.status}
                />
              ) : (
                <EmptyState
                  icone={FileText}
                  titulo="Selecione uma obra"
                  descricao="Escolha uma obra na lista lateral para visualizar sua demonstração de resultado."
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
