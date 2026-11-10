import { useState, useMemo } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { Navigation, Package, CheckCircle2, AlertCircle, Phone, MapPin, LogOut } from "lucide-react";
import { Button } from "@/shared/components/ui/Button";
import FeedbackLoading from "@/shared/components/feedback/FeedbackLoading";
import FeedbackErro from "@/shared/components/feedback/FeedbackErro";
import EmptyState from "@/shared/components/feedback/EmptyState";
import { useAuthStore } from "@/features/auth/stores/useAuthStore";
import { useInstalacoesInstalador, useDetalhesInstalacao } from "../hooks/useInstalador";

export default function InstaladorMobile() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const logout = useAuthStore((s) => s.logout);
  const [chegadaMarcada, setChegadaMarcada] = useState(false);

  const handleLogout = () => {
    queryClient.clear();
    logout();
    void navigate("/login", { replace: true });
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
  } = useDetalhesInstalacao(selectedObraId);

  const handleOpenMaps = () => {
    if (!detalhes) return;
    if (detalhes.linkNavegacao) {
      window.open(detalhes.linkNavegacao, "_blank", "noopener,noreferrer");
      return;
    }
    const query = encodeURIComponent(detalhes.endereco || "Crateús, CE");
    window.open(`https://www.google.com/maps/search/?api=1&query=${query}`, "_blank", "noopener,noreferrer");
  };

  const handleSelectObra = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const novoId = e.target.value;
    setSearchParams({ obraId: novoId });
    setChegadaMarcada(false);
  };

  return (
    <div className="min-h-screen bg-background-app flex justify-center p-0 sm:p-4">
      {/* Container Restrito (Simula tela de Celular em Monitores Maiores) */}
      <div className="w-full max-w-md bg-surface min-h-screen sm:min-h-0 sm:rounded-2xl border border-border-subtle flex flex-col relative overflow-hidden">
        {loadingLista ? (
          <div className="flex-1 flex items-center justify-center">
            <FeedbackLoading mensagem="Carregando lista de instalações..." />
          </div>
        ) : erroLista ? (
          <div className="flex-1 flex flex-col">
            <div className="flex justify-end p-3.5 border-b border-border-subtle bg-surface-subtle">
              <button
                type="button"
                onClick={handleLogout}
                title="Sair da conta"
                aria-label="Sair da conta"
                className="p-2 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 border border-border-subtle transition-colors cursor-pointer shrink-0 flex items-center gap-1.5 text-xs font-medium"
              >
                <LogOut className="w-4 h-4" />
                <span>Sair</span>
              </button>
            </div>
            <div className="flex-1 flex items-center justify-center p-4">
              <FeedbackErro
                titulo="Falha ao carregar instalações"
                mensagem="Não foi possível obter as informações de instalação da equipe."
                onTentarNovamente={() => void refetchLista()}
              />
            </div>
          </div>
        ) : !instalacoes || instalacoes.length === 0 ? (
          <div className="flex-1 flex flex-col">
            <div className="flex justify-end p-3.5 border-b border-border-subtle bg-surface-subtle">
              <button
                type="button"
                onClick={handleLogout}
                title="Sair da conta"
                aria-label="Sair da conta"
                className="p-2 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 border border-border-subtle transition-colors cursor-pointer shrink-0 flex items-center gap-1.5 text-xs font-medium"
              >
                <LogOut className="w-4 h-4" />
                <span>Sair</span>
              </button>
            </div>
            <div className="flex-1 flex items-center justify-center p-4">
              <EmptyState
                icone={Package}
                titulo="Nenhuma instalação escalada"
                descricao="Não há instalações agendadas para sua equipe no momento."
              />
            </div>
          </div>
        ) : (
          <>
            {/* Header Curto Canônico — Fixo e Estável */}
            <div className="bg-surface-subtle border-b border-border-subtle pt-6 pb-5 px-5 relative space-y-3">
              <div className="space-y-1.5">
                {instalacoes.length > 1 ? (
                  <>
                    <label htmlFor="select-obra-instalador" className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
                      Alternar Instalação
                    </label>
                    <div className="flex items-center gap-2">
                      <select
                        id="select-obra-instalador"
                        value={selectedObraId ?? ""}
                        onChange={handleSelectObra}
                        className="flex-1 text-xs bg-surface border border-border-subtle rounded-lg px-2.5 py-1.5 text-foreground focus:outline-none focus:ring-1 focus:ring-primary h-8"
                      >
                        {instalacoes.map((item) => (
                          <option key={item.obraId} value={item.obraId}>
                            {item.clienteNome} • {item.endereco}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={handleLogout}
                        title="Sair da conta"
                        aria-label="Sair da conta"
                        className="h-8 px-2.5 rounded-lg text-xs font-semibold text-muted-foreground hover:text-destructive hover:bg-destructive/10 border border-border-subtle transition-colors cursor-pointer shrink-0 flex items-center gap-1.5"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        <span>Sair</span>
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                      Painel do Instalador
                    </span>
                    <button
                      type="button"
                      onClick={handleLogout}
                      title="Sair da conta"
                      aria-label="Sair da conta"
                      className="h-8 px-2.5 rounded-lg text-xs font-semibold text-muted-foreground hover:text-destructive hover:bg-destructive/10 border border-border-subtle transition-colors cursor-pointer shrink-0 flex items-center gap-1.5"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Sair</span>
                    </button>
                  </div>
                )}
              </div>

              {detalhes && (
                <>
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold tracking-wide bg-warning-light text-warning border border-warning-border">
                        {detalhes.dataInicio ? `${detalhes.dataInicio} • ` : ""}
                        {detalhes.equipeNome || "Equipe de Campo"}
                      </span>
                      <h1 className="text-xl font-bold mt-2 text-foreground leading-tight">
                        Instalação<br />{detalhes.clienteNome}
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
                <main className="flex-1 px-5 pt-5 pb-24 overflow-y-auto space-y-4">
                  {/* Card Contato (Quiet Panel) */}
                  <div className="bg-surface p-4 rounded-xl border border-border-subtle flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground font-medium">Cliente</p>
                      <h3 className="font-semibold text-sm text-foreground">{detalhes.clienteNome}</h3>
                    </div>
                    {detalhes.clienteTelefone ? (
                      <a
                        href={`tel:${detalhes.clienteTelefone.replace(/[^\d+]/g, "")}`}
                        className="w-9 h-9 rounded-lg bg-surface-subtle hover:bg-surface border border-border-subtle text-foreground-secondary flex items-center justify-center transition-colors cursor-pointer"
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
                            <li key={item.tipo} className="py-2.5 px-4 flex items-center justify-between">
                              <span className="text-xs font-medium text-foreground">{item.tipo}</span>
                              <span className="text-xs font-bold font-mono text-foreground">{item.quantidade} unid.</span>
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

                  {/* Instruções de Campo (se existirem) */}
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

                  {/* Feedback de Chegada Confirmada */}
                  {chegadaMarcada && (
                    <div className="p-3 rounded-lg bg-success-light border border-success-border text-success text-xs font-medium flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                      <span>Chegada registrada no local da instalação.</span>
                    </div>
                  )}
                </main>

                {/* Floating Action Button Bar */}
                <div className="absolute bottom-0 left-0 w-full bg-surface border-t border-border-subtle p-3.5 flex gap-2.5">
                  <Button
                    onClick={handleOpenMaps}
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
                        ? "bg-success text-white border-success"
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
