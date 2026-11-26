import { useId, useMemo, useRef, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Navigation,
  Package,
  CheckCircle2,
  AlertCircle,
  Phone,
  MapPin,
  LogOut,
  Wrench,
  MessageSquare,
} from "lucide-react";
import { Button } from "@/shared/components/ui/Button";
import { AlertBanner } from "@/shared/components/ui/AlertBanner";
import { Badge } from "@/shared/components/ui/Badge";
import { SegmentedControl } from "@/shared/components/ui/SegmentedControl";
import FeedbackLoading from "@/shared/components/feedback/FeedbackLoading";
import FeedbackErro from "@/shared/components/feedback/FeedbackErro";
import EmptyState from "@/shared/components/feedback/EmptyState";
import { useAuthStore } from "@/shared/stores/useAuthStore";
import { formatarDataBR } from "@/shared/lib/formatters";
import {
  useComentarManutencao,
  useConcluirManutencao,
  useDetalhesInstalacao,
  useInstalacoesInstalador,
  useManutencoesInstalador,
} from "../hooks/useInstalador";
import {
  LIMITE_CARACTERES_MANUTENCAO,
  resolverUrlRotaMapa,
  validarComentarioManutencao,
  validarConclusaoManutencao,
} from "../lib/validacaoManutencao";
import { extrairMensagemErroInstalador } from "../services/instalador";
import type {
  ComentarioManutencaoResposta,
  ManutencaoInstalador,
  StatusManutencao,
} from "../types/instalador";

type AbaInstalador = "instalacoes" | "manutencoes";
type FiltroStatusManutencao = "todas" | StatusManutencao;

const COMENTARIOS_VAZIOS: ComentarioManutencaoResposta[] = [];

function abrirRotaMapa(endereco?: string | null, linkNavegacao?: string | null) {
  const url = resolverUrlRotaMapa(endereco, linkNavegacao);
  if (!url) {
    toast.warning("Endereço não cadastrado para esta obra.");
    return;
  }
  window.open(url, "_blank", "noopener,noreferrer");
}

function formatarDataHoraBR(iso?: string | null): string {
  if (!iso) return "";
  const dt = new Date(iso);
  if (Number.isNaN(dt.getTime())) return "";
  const data = new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(dt);
  const hora = new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(dt);
  return `${data} às ${hora}`;
}

interface CartaoManutencaoProps {
  manutencao: ManutencaoInstalador;
  comentariosSessao: ComentarioManutencaoResposta[];
  onComentarioRegistrado: (manutencaoId: number, comentario: ComentarioManutencaoResposta) => void;
  onConcluidaSucesso: (mensagem: string) => void;
}

function CartaoManutencao({
  manutencao,
  comentariosSessao = COMENTARIOS_VAZIOS,
  onComentarioRegistrado,
  onConcluidaSucesso,
}: CartaoManutencaoProps) {
  const [painelAtivo, setPainelAtivo] = useState<"nenhum" | "concluir" | "comentar">("nenhum");
  const [servicoExecutado, setServicoExecutado] = useState("");
  const [erroConcluir, setErroConcluir] = useState<string | null>(null);
  const [comentarioTexto, setComentarioTexto] = useState("");
  const [erroComentar, setErroComentar] = useState<string | null>(null);

  const concluirMutation = useConcluirManutencao();
  const comentarMutation = useComentarManutencao();
  const enviandoConcluirRef = useRef(false);
  const enviandoComentarRef = useRef(false);

  const baseId = useId();
  const servicoId = `${baseId}-servico`;
  const servicoErroId = `${baseId}-servico-erro`;
  const comentarioId = `${baseId}-comentario`;
  const comentarioErroId = `${baseId}-comentario-erro`;

  const concluida = manutencao.status === "Concluida";
  const dataConclusaoFormatada = formatarDataHoraBR(manutencao.dataConclusao);

  const handleConcluir = async (e: React.FormEvent) => {
    e.preventDefault();
    if (concluirMutation.isPending || enviandoConcluirRef.current) return;

    const validacao = validarConclusaoManutencao(servicoExecutado);
    if (!validacao.ok) {
      setErroConcluir(validacao.mensagem);
      document.getElementById(servicoId)?.focus();
      return;
    }

    setErroConcluir(null);
    enviandoConcluirRef.current = true;
    try {
      await concluirMutation.mutateAsync({
        id: manutencao.id,
        payload: { servicoExecutado: validacao.texto },
      });
      setServicoExecutado("");
      setPainelAtivo("nenhum");
      onConcluidaSucesso(`Manutenção de "${manutencao.clienteNome}" concluída.`);
    } catch (erro) {
      setErroConcluir(
        extrairMensagemErroInstalador(erro, "Não foi possível concluir a manutenção.")
      );
    } finally {
      enviandoConcluirRef.current = false;
    }
  };

  const handleComentar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (comentarMutation.isPending || enviandoComentarRef.current) return;

    const validacao = validarComentarioManutencao(comentarioTexto);
    if (!validacao.ok) {
      setErroComentar(validacao.mensagem);
      document.getElementById(comentarioId)?.focus();
      return;
    }

    setErroComentar(null);
    enviandoComentarRef.current = true;
    try {
      const criado = await comentarMutation.mutateAsync({
        id: manutencao.id,
        payload: { descricao: validacao.texto },
      });
      setComentarioTexto("");
      onComentarioRegistrado(manutencao.id, criado);
      setPainelAtivo("nenhum");
    } catch (erro) {
      setErroComentar(
        extrairMensagemErroInstalador(erro, "Não foi possível enviar o comentário.")
      );
    } finally {
      enviandoComentarRef.current = false;
    }
  };

  return (
    <article className="bg-surface rounded-xl border border-border-subtle p-4 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h2 className="text-sm font-bold text-foreground leading-snug break-words">
            {manutencao.clienteNome}
          </h2>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Atendimento pós-instalação
          </p>
        </div>
        <Badge
          variante={concluida ? "success" : "warning"}
          tamanho="sm"
          comBorda
        >
          {concluida ? "Concluída" : "Pendente"}
        </Badge>
      </div>

      <p className="text-xs text-foreground-secondary leading-relaxed break-words">
        {manutencao.descricao}
      </p>

      <div className="text-xs text-muted-foreground flex items-start gap-1.5">
        <MapPin className="w-3.5 h-3.5 mt-0.5 shrink-0" />
        <span className="leading-snug break-words">{manutencao.endereco}</span>
      </div>

      {concluida && dataConclusaoFormatada && (
        <p className="text-[11px] text-success font-medium">
          Concluída em {dataConclusaoFormatada}
        </p>
      )}

      {comentariosSessao.length > 0 && (
        <div className="rounded-lg bg-surface-subtle border border-border-subtle p-2.5 space-y-1.5">
          <p className="text-[11px] font-semibold text-foreground-muted">
            Observações registradas neste atendimento
          </p>
          <ul className="space-y-1">
            {comentariosSessao.map((c) => {
              const dataRegistro = formatarDataHoraBR(c.dataRegistro);
              return (
                <li key={c.id} className="text-xs text-foreground-secondary leading-snug">
                  • {c.descricao}
                  {dataRegistro ? (
                    <span className="text-[11px] text-muted-foreground ml-1.5">
                      ({dataRegistro})
                    </span>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2 pt-1">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => abrirRotaMapa(manutencao.endereco)}
          className="text-xs"
        >
          <Navigation className="w-3.5 h-3.5" />
          Abrir Rota
        </Button>

        {!concluida && (
          <Button
            type="button"
            variant={painelAtivo === "concluir" ? "secondary" : "primary"}
            size="sm"
            onClick={() => {
              setErroConcluir(null);
              setPainelAtivo((prev) => (prev === "concluir" ? "nenhum" : "concluir"));
            }}
            className="text-xs"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            Concluir
          </Button>
        )}

        <Button
          type="button"
          variant={painelAtivo === "comentar" ? "secondary" : "outline"}
          size="sm"
          onClick={() => {
            setErroComentar(null);
            setPainelAtivo((prev) => (prev === "comentar" ? "nenhum" : "comentar"));
          }}
          className="text-xs"
        >
          <MessageSquare className="w-3.5 h-3.5" />
          Comentar
        </Button>
      </div>

      {painelAtivo === "concluir" && !concluida && (
        <form
          noValidate
          onSubmit={(e) => void handleConcluir(e)}
          className="pt-3 border-t border-border-subtle space-y-2.5"
        >
          <div className="space-y-1">
            <label htmlFor={servicoId} className="block text-xs font-semibold text-foreground-muted">
              Serviço executado <span className="text-destructive">*</span>
            </label>
            <textarea
              id={servicoId}
              rows={3}
              maxLength={LIMITE_CARACTERES_MANUTENCAO}
              required
              disabled={concluirMutation.isPending}
              aria-invalid={Boolean(erroConcluir)}
              aria-describedby={erroConcluir ? servicoErroId : undefined}
              value={servicoExecutado}
              onChange={(e) => {
                setServicoExecutado(e.target.value);
                if (erroConcluir) setErroConcluir(null);
              }}
              placeholder="Descreva o reparo ou troca realizada em campo..."
              className="w-full rounded-lg border border-border-strong bg-surface-subtle px-3 py-2 text-xs text-foreground placeholder-subtle-foreground focus:bg-surface focus-visible:outline-none focus-visible:border-info focus-visible:ring-2 focus-visible:ring-info/25"
            />
            {erroConcluir && (
              <p id={servicoErroId} role="alert" className="text-xs font-medium text-destructive">
                {erroConcluir}
              </p>
            )}
          </div>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={concluirMutation.isPending}
              onClick={() => setPainelAtivo("nenhum")}
            >
              Cancelar
            </Button>
            <Button type="submit" size="sm" disabled={concluirMutation.isPending}>
              {concluirMutation.isPending ? "Concluindo..." : "Confirmar Conclusão"}
            </Button>
          </div>
        </form>
      )}

      {painelAtivo === "comentar" && (
        <form
          noValidate
          onSubmit={(e) => void handleComentar(e)}
          className="pt-3 border-t border-border-subtle space-y-2.5"
        >
          <div className="space-y-1">
            <label htmlFor={comentarioId} className="block text-xs font-semibold text-foreground-muted">
              Observação técnica <span className="text-destructive">*</span>
            </label>
            <textarea
              id={comentarioId}
              rows={2}
              maxLength={LIMITE_CARACTERES_MANUTENCAO}
              required
              disabled={comentarMutation.isPending}
              aria-invalid={Boolean(erroComentar)}
              aria-describedby={erroComentar ? comentarioErroId : undefined}
              value={comentarioTexto}
              onChange={(e) => {
                setComentarioTexto(e.target.value);
                if (erroComentar) setErroComentar(null);
              }}
              placeholder="Ex: Cliente solicitou retorno na sexta ou peça adicional..."
              className="w-full rounded-lg border border-border-strong bg-surface-subtle px-3 py-2 text-xs text-foreground placeholder-subtle-foreground focus:bg-surface focus-visible:outline-none focus-visible:border-info focus-visible:ring-2 focus-visible:ring-info/25"
            />
            {erroComentar && (
              <p id={comentarioErroId} role="alert" className="text-xs font-medium text-destructive">
                {erroComentar}
              </p>
            )}
          </div>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={comentarMutation.isPending}
              onClick={() => setPainelAtivo("nenhum")}
            >
              Cancelar
            </Button>
            <Button type="submit" size="sm" disabled={comentarMutation.isPending}>
              {comentarMutation.isPending ? "Enviando..." : "Enviar Comentário"}
            </Button>
          </div>
        </form>
      )}
    </article>
  );
}

export default function InstaladorMobile() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const logout = useAuthStore((s) => s.logout);
  const [chegadaMarcada, setChegadaMarcada] = useState(false);
  const [filtroStatus, setFiltroStatus] = useState<FiltroStatusManutencao>("todas");
  const [avisoManutencao, setAvisoManutencao] = useState<string | null>(null);
  const [comentariosPorManutencao, setComentariosPorManutencao] = useState<
    Record<number, ComentarioManutencaoResposta[]>
  >({});

  const abaAtiva: AbaInstalador =
    searchParams.get("aba") === "manutencoes" ? "manutencoes" : "instalacoes";

  const handleLogout = () => {
    queryClient.clear();
    logout();
    void navigate("/login", { replace: true });
  };

  const handleTrocarAba = (novaAba: AbaInstalador) => {
    const next = new URLSearchParams(searchParams);
    if (novaAba === "manutencoes") {
      next.set("aba", "manutencoes");
    } else {
      next.delete("aba");
    }
    setSearchParams(next);
  };

  const {
    data: instalacoes,
    isLoading: loadingLista,
    isError: erroLista,
    refetch: refetchLista,
  } = useInstalacoesInstalador();

  const paramObraId = searchParams.get("obraId");
  const selectedObraId = useMemo(() => {
    if (paramObraId) {
      const parsed = Number(paramObraId);
      if (!Number.isNaN(parsed) && parsed > 0) return parsed;
    }
    return instalacoes?.[0]?.obraId ?? null;
  }, [paramObraId, instalacoes]);

  const {
    data: detalhes,
    isLoading: loadingDetalhes,
    isError: erroDetalhes,
    refetch: refetchDetalhes,
  } = useDetalhesInstalacao(abaAtiva === "instalacoes" ? selectedObraId : null);

  const statusConsulta = filtroStatus === "todas" ? undefined : filtroStatus;
  const {
    data: manutencoes = [],
    isLoading: loadingManutencoes,
    isError: erroManutencoes,
    error: erroManutencoesObj,
    refetch: refetchManutencoes,
  } = useManutencoesInstalador(statusConsulta);

  const handleSelectObra = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const next = new URLSearchParams(searchParams);
    next.set("obraId", e.target.value);
    setSearchParams(next);
    setChegadaMarcada(false);
  };

  const registrarComentarioLocal = (
    manutencaoId: number,
    comentario: ComentarioManutencaoResposta
  ) => {
    setComentariosPorManutencao((prev) => ({
      ...prev,
      [manutencaoId]: [...(prev[manutencaoId] ?? COMENTARIOS_VAZIOS), comentario],
    }));
    setAvisoManutencao("Comentário registrado no atendimento.");
  };

  return (
    <div className="min-h-screen bg-background-app flex justify-center p-0 sm:p-4">
      {/* Container Restrito Mobile-First */}
      <div className="w-full max-w-md bg-surface min-h-screen sm:min-h-0 sm:rounded-xl border border-border-subtle flex flex-col relative">
        {/* Topo fixo com identificação, botão Sair e abas Instalações / Manutenções */}
        <header className="bg-surface-subtle border-b border-border-subtle px-4 pt-3.5 pb-3 space-y-2.5 sm:rounded-t-xl">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              Painel do Instalador
            </span>
            <button
              type="button"
              onClick={handleLogout}
              title="Sair da conta"
              aria-label="Sair da conta"
              className="h-8 px-2.5 rounded-lg text-xs font-semibold text-muted-foreground hover:text-destructive hover:bg-destructive-light border border-border-subtle transition-colors cursor-pointer shrink-0 flex items-center gap-1.5"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sair</span>
            </button>
          </div>

          <div
            role="tablist"
            aria-label="Seções do instalador"
            className="grid grid-cols-2 gap-1.5 p-1 rounded-lg bg-surface border border-border-subtle"
          >
            <button
              type="button"
              role="tab"
              aria-selected={abaAtiva === "instalacoes"}
              onClick={() => handleTrocarAba("instalacoes")}
              className={`h-8 rounded-md text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                abaAtiva === "instalacoes"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Package className="w-3.5 h-3.5" />
              <span>Instalações</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={abaAtiva === "manutencoes"}
              onClick={() => handleTrocarAba("manutencoes")}
              className={`h-8 rounded-md text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                abaAtiva === "manutencoes"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Wrench className="w-3.5 h-3.5" />
              <span>Manutenções</span>
            </button>
          </div>
        </header>

        {abaAtiva === "manutencoes" ? (
          <div className="flex-1 flex flex-col min-h-0">
            <div className="px-4 py-2.5 border-b border-border-subtle bg-surface flex items-center justify-between gap-2">
              <SegmentedControl
                opcoes={[
                  { valor: "todas", rotulo: "Todas" },
                  { valor: "Pendente", rotulo: "Pendentes" },
                  { valor: "Concluida", rotulo: "Concluídas" },
                ]}
                valor={filtroStatus}
                onChange={setFiltroStatus}
                ariaLabel="Filtrar manutenções por status"
                tamanho="sm"
              />
              <span className="text-xs font-mono text-muted-foreground tabular-nums">
                {manutencoes.length}
              </span>
            </div>

            <main className="flex-1 p-4 space-y-3">
              {avisoManutencao && (
                <AlertBanner variante="success" className="px-3 py-2">
                  <div className="flex items-center justify-between gap-2">
                    <span>{avisoManutencao}</span>
                    <button
                      type="button"
                      onClick={() => setAvisoManutencao(null)}
                      className="font-semibold underline cursor-pointer shrink-0"
                    >
                      Fechar
                    </button>
                  </div>
                </AlertBanner>
              )}

              {loadingManutencoes ? (
                <div className="min-h-[260px] flex">
                  <FeedbackLoading mensagem="Carregando manutenções da equipe..." />
                </div>
              ) : erroManutencoes ? (
                <div className="min-h-[260px] flex">
                  <FeedbackErro
                    titulo="Falha ao carregar manutenções"
                    mensagem={extrairMensagemErroInstalador(
                      erroManutencoesObj,
                      "Não foi possível consultar as manutenções da sua equipe."
                    )}
                    onTentarNovamente={() => void refetchManutencoes()}
                  />
                </div>
              ) : manutencoes.length === 0 ? (
                <div className="min-h-[260px] flex">
                  <EmptyState
                    icone={Wrench}
                    titulo="Nenhuma manutenção encontrada"
                    descricao={
                      filtroStatus === "todas"
                        ? "Sua equipe não possui manutenções registradas no momento."
                        : `Não há manutenções com status "${filtroStatus === "Concluida" ? "Concluída" : "Pendente"}".`
                    }
                    acao={
                      filtroStatus !== "todas"
                        ? {
                            label: "Ver todas",
                            onClick: () => setFiltroStatus("todas"),
                          }
                        : undefined
                    }
                  />
                </div>
              ) : (
                manutencoes.map((manutencao) => (
                  <CartaoManutencao
                    key={manutencao.id}
                    manutencao={manutencao}
                    comentariosSessao={comentariosPorManutencao[manutencao.id] ?? COMENTARIOS_VAZIOS}
                    onComentarioRegistrado={registrarComentarioLocal}
                    onConcluidaSucesso={(msg) => setAvisoManutencao(msg)}
                  />
                ))
              )}
            </main>
          </div>
        ) : loadingLista ? (
          <div className="flex-1 flex items-center justify-center">
            <FeedbackLoading mensagem="Carregando lista de instalações..." />
          </div>
        ) : erroLista ? (
          <div className="flex-1 flex items-center justify-center p-4">
            <FeedbackErro
              titulo="Falha ao carregar instalações"
              mensagem="Não foi possível obter as informações de instalação da equipe."
              onTentarNovamente={() => void refetchLista()}
            />
          </div>
        ) : !instalacoes || instalacoes.length === 0 ? (
          <div className="flex-1 flex items-center justify-center p-4">
            <EmptyState
              icone={Package}
              titulo="Nenhuma instalação escalada"
              descricao="Não há instalações agendadas para sua equipe no momento."
            />
          </div>
        ) : (
          <>
            <div className="bg-surface-subtle border-b border-border-subtle pt-3.5 pb-4 px-4 space-y-3">
              {instalacoes.length > 1 && (
                <div className="space-y-1">
                  <label
                    htmlFor="select-obra-instalador"
                    className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block"
                  >
                    Alternar Instalação
                  </label>
                  <select
                    id="select-obra-instalador"
                    value={selectedObraId ?? ""}
                    onChange={handleSelectObra}
                    className="w-full text-xs bg-surface border border-border-strong rounded-lg px-2.5 py-1.5 text-foreground focus-visible:outline-none focus-visible:border-info focus-visible:ring-2 focus-visible:ring-info/25 h-8"
                  >
                    {instalacoes.map((item) => (
                      <option key={item.obraId} value={item.obraId}>
                        {item.clienteNome} • {item.endereco}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {detalhes && (
                <>
                  <div className="flex justify-between items-start">
                    <div>
                      <Badge
                        variante="warning"
                        formato="rounded"
                        tamanho="sm"
                        comBorda
                        className="tracking-wide"
                      >
                        {detalhes.dataInicio && formatarDataBR(detalhes.dataInicio) !== "—"
                          ? `${formatarDataBR(detalhes.dataInicio)} • `
                          : ""}
                        {detalhes.equipeNome || "Equipe de Campo"}
                      </Badge>
                      <h1 className="text-xl font-bold mt-2 text-foreground leading-tight">
                        Instalação
                        <br />
                        {detalhes.clienteNome}
                      </h1>
                    </div>
                  </div>

                  <p className="text-muted-foreground text-xs flex items-start gap-1.5">
                    <MapPin className="w-3.5 h-3.5 mt-0.5 shrink-0 text-muted-foreground" />
                    <span className="leading-snug">{detalhes.endereco}</span>
                  </p>
                </>
              )}
            </div>

            {loadingDetalhes ? (
              <div className="flex-1 flex items-center justify-center p-8">
                <FeedbackLoading mensagem="Carregando detalhes da obra selecionada..." />
              </div>
            ) : erroDetalhes ? (
              <div className="flex-1 flex items-center justify-center p-4">
                <FeedbackErro
                  titulo="Detalhes indisponíveis"
                  mensagem="Não foi possível carregar os detalhes desta instalação."
                  onTentarNovamente={() => void refetchDetalhes()}
                />
              </div>
            ) : !detalhes ? (
              <div className="flex-1 flex items-center justify-center p-4">
                <EmptyState
                  icone={Package}
                  titulo="Instalação não localizada"
                  descricao="Os dados da instalação selecionada não foram encontrados."
                />
              </div>
            ) : (
              <>
                <main className="flex-1 px-4 py-4 space-y-4">
                  {/* Card Contato (Quiet Panel) */}
                  <div className="bg-surface p-3.5 rounded-xl border border-border-subtle flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs text-muted-foreground font-medium">Cliente</p>
                      <h3 className="font-semibold text-sm text-foreground truncate">
                        {detalhes.clienteNome}
                      </h3>
                    </div>
                    {detalhes.clienteTelefone ? (
                      <a
                        href={`tel:${detalhes.clienteTelefone.replace(/[^\d+]/g, "")}`}
                        className="w-9 h-9 rounded-lg bg-surface-subtle hover:bg-muted border border-border-subtle text-foreground-secondary flex items-center justify-center transition-colors cursor-pointer shrink-0"
                        title={`Ligar para ${detalhes.clienteNome}`}
                        aria-label={`Ligar para ${detalhes.clienteNome}`}
                      >
                        <Phone className="w-4 h-4 text-foreground-muted" />
                      </a>
                    ) : null}
                  </div>

                  {/* Checklist do Kit (Quiet Panel) */}
                  <div className="space-y-2">
                    <h3 className="text-xs font-semibold text-foreground-muted uppercase tracking-wider flex items-center gap-1.5">
                      <Package className="w-4 h-4 text-muted-foreground" /> Resumo do Kit
                    </h3>
                    <div className="bg-surface rounded-xl border border-border-subtle overflow-hidden">
                      {detalhes.kit && detalhes.kit.length > 0 ? (
                        <ul className="divide-y divide-border-subtle">
                          {detalhes.kit.map((item) => (
                            <li
                              key={item.tipo}
                              className="py-2.5 px-3.5 flex items-center justify-between gap-2"
                            >
                              <span className="text-xs font-medium text-foreground">
                                {item.tipo}
                              </span>
                              <span className="text-xs font-bold font-mono tabular-nums text-foreground shrink-0">
                                {item.quantidade} unid.
                              </span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <div className="p-4 text-xs text-muted-foreground text-center">
                          Nenhum item de kit registrado para esta instalação.
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Instruções de Campo */}
                  {detalhes.instrucoes && (
                    <div className="space-y-1.5">
                      <h3 className="text-xs font-semibold text-foreground-muted uppercase tracking-wider flex items-center gap-1.5">
                        <AlertCircle className="w-4 h-4 text-muted-foreground" /> Instruções de Campo
                      </h3>
                      <div className="p-3.5 rounded-xl border border-border-subtle bg-surface-subtle text-xs text-muted-foreground leading-relaxed whitespace-pre-line">
                        {detalhes.instrucoes}
                      </div>
                    </div>
                  )}

                  {chegadaMarcada && (
                    <AlertBanner
                      variante="success"
                      icone={<CheckCircle2 className="w-4 h-4" />}
                      className="p-3 font-medium"
                    >
                      Chegada registrada no local da instalação.
                    </AlertBanner>
                  )}
                </main>

                <div className="sticky bottom-0 sm:rounded-b-xl bg-surface border-t border-border-subtle p-3.5 flex gap-2.5">
                  <Button
                    onClick={() => abrirRotaMapa(detalhes.endereco, detalhes.linkNavegacao)}
                    className="flex-1 h-11 text-xs font-semibold flex justify-center items-center gap-2 cursor-pointer"
                  >
                    <Navigation className="w-4 h-4" />
                    Iniciar Rota
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setChegadaMarcada((prev) => !prev)}
                    className={`w-11 h-11 p-0 rounded-lg flex justify-center items-center cursor-pointer transition-colors ${
                      chegadaMarcada
                        ? "bg-success text-primary-foreground border-success"
                        : "text-success border-success-border hover:bg-success-light"
                    }`}
                    title={chegadaMarcada ? "Chegada confirmada" : "Marcar Chegada"}
                    aria-label={chegadaMarcada ? "Chegada confirmada" : "Marcar Chegada"}
                  >
                    <CheckCircle2 className="w-5 h-5" />
                  </Button>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
