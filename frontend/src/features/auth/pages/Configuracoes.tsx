import { useEffect, useRef, useState } from "react";
import { Check, Copy, Info } from "lucide-react";
import { ROTULOS_PERFIS } from "@/shared/constants/perfis";
import { perfilCanonico } from "@/shared/lib/rotasSessao";
import { PageHeader } from "@/shared/components/ui/PageHeader";
import FeedbackLoading from "@/shared/components/feedback/FeedbackLoading";
import FeedbackErro from "@/shared/components/feedback/FeedbackErro";
import { EmptyState } from "@/shared/components/feedback/EmptyState";
import { useThemeStore } from "@/shared/stores/useThemeStore";
import { useGeracaoSenha } from "../hooks/useOperacaoSenha";
import { useUsuarioConfiguracoes } from "../hooks/useUsuarioConfiguracoes";
import { FormularioAlterarSenha } from "../components/FormularioAlterarSenha";
import type { TemaSistema } from "@/shared/types/theme";

const TEMAS: { valor: TemaSistema; texto: string }[] = [
  { valor: "light", texto: "Claro" },
  { valor: "dark", texto: "Escuro" },
  { valor: "system", texto: "Sistema" },
];

function iniciaisUsuario(nome?: string): string {
  const partes = (nome || "").trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return "ZL";
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
  return `${partes[0][0]}${partes[partes.length - 1][0]}`.toUpperCase();
}

function MiniaturaTema({ tema }: { tema: TemaSistema }) {
  if (tema === "light") {
    return (
      <svg className="w-full h-16 rounded-md" viewBox="0 0 180 64" fill="none" aria-hidden="true">
        <rect width="180" height="64" rx="6" fill="#f8f9fa" stroke="#e2e8f0" />
        <rect x="10" y="10" width="10" height="10" rx="2" fill="#0f172a" />
        <rect x="25" y="12" width="44" height="6" rx="2" fill="#cbd5e1" />
        <rect x="10" y="26" width="160" height="28" rx="4" fill="#ffffff" stroke="#e2e8f0" />
        <rect x="18" y="34" width="64" height="5" rx="2" fill="#0f172a" />
        <rect x="18" y="43" width="40" height="4" rx="2" fill="#94a3b8" />
      </svg>
    );
  }
  if (tema === "dark") {
    return (
      <svg className="w-full h-16 rounded-md" viewBox="0 0 180 64" fill="none" aria-hidden="true">
        <rect width="180" height="64" rx="6" fill="#090d16" stroke="#334155" />
        <rect x="10" y="10" width="10" height="10" rx="2" fill="#38bdf8" />
        <rect x="25" y="12" width="44" height="6" rx="2" fill="#334155" />
        <rect x="10" y="26" width="160" height="28" rx="4" fill="#0f172a" stroke="#334155" />
        <rect x="18" y="34" width="64" height="5" rx="2" fill="#f8fafc" />
        <rect x="18" y="43" width="40" height="4" rx="2" fill="#64748b" />
      </svg>
    );
  }
  return (
    <svg className="w-full h-16 rounded-md" viewBox="0 0 180 64" fill="none" aria-hidden="true">
      <rect width="90" height="64" fill="#f8f9fa" />
      <rect x="90" width="90" height="64" fill="#090d16" />
      <rect x="10" y="12" width="32" height="6" rx="2" fill="#0f172a" />
      <rect x="10" y="26" width="70" height="26" rx="4" fill="#ffffff" stroke="#e2e8f0" />
      <rect x="100" y="12" width="32" height="6" rx="2" fill="#38bdf8" />
      <rect x="100" y="26" width="70" height="26" rx="4" fill="#0f172a" stroke="#334155" />
      <rect x="0.5" y="0.5" width="179" height="63" rx="5.5" stroke="#94a3b8" strokeOpacity="0.35" />
    </svg>
  );
}

export default function Configuracoes() {
  const geracao = useGeracaoSenha();
  return <Conteudo key={geracao} geracao={geracao} />;
}

function Conteudo({ geracao }: { geracao: number }) {
  const tema = useThemeStore(s => s.tema);
  const setTema = useThemeStore(s => s.setTema);
  const consulta = useUsuarioConfiguracoes(geracao);
  const [copiado, setCopiado] = useState(false);
  const [sistemaEscuro, setSistemaEscuro] = useState(() =>
    typeof window !== "undefined" && typeof window.matchMedia === "function"
      ? window.matchMedia("(prefers-color-scheme: dark)").matches
      : false
  );
  const timerCopiado = useRef<number | null>(null);

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const atualizar = () => setSistemaEscuro(media.matches);
    atualizar();
    media.addEventListener("change", atualizar);
    return () => media.removeEventListener("change", atualizar);
  }, []);

  useEffect(() => {
    return () => {
      if (timerCopiado.current !== null) window.clearTimeout(timerCopiado.current);
    };
  }, []);

  function copiarEmail() {
    const email = consulta.data?.email;
    if (!email) return;
    void navigator.clipboard?.writeText(email).then(() => {
      setCopiado(true);
      if (timerCopiado.current !== null) window.clearTimeout(timerCopiado.current);
      timerCopiado.current = window.setTimeout(() => setCopiado(false), 1800);
    }).catch(() => {});
  }

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      <PageHeader title="Configurações" />
      <section className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8 bg-background-app text-foreground">
        <div className="max-w-3xl space-y-6">
          <p className="text-sm text-muted-foreground">
            Gerencie suas preferências de exibição, dados da conta e segurança de acesso.
          </p>

          <section aria-labelledby="aparencia" className="rounded-xl border border-border-subtle bg-surface p-5 sm:p-6 space-y-4">
            <div>
              <h2 id="aparencia" className="text-base font-semibold text-foreground">Aparência</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Escolha como o sistema deve ser exibido neste dispositivo.
              </p>
            </div>
            <fieldset className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <legend className="sr-only">Tema da interface</legend>
              {TEMAS.map(({ valor, texto }) => {
                const ativo = tema === valor;
                return (
                  <label
                    key={valor}
                    className="block rounded-lg border border-border-subtle bg-surface hover:border-border-strong p-3.5 space-y-3 cursor-pointer transition-colors has-[input:checked]:border-info has-[input:checked]:bg-surface-subtle has-[input:focus-visible]:outline-2 has-[input:focus-visible]:outline-foreground has-[input:focus-visible]:outline-offset-2"
                  >
                    <input
                      type="radio"
                      name="tema"
                      value={valor}
                      checked={ativo}
                      onChange={() => setTema(valor)}
                      className="sr-only"
                    />
                    <MiniaturaTema tema={valor} />
                    <span className="flex items-center justify-between gap-1">
                      <span className="text-sm font-medium text-foreground">
                        {texto}
                        {valor === "system" && (
                          <span className="text-xs font-normal text-muted-foreground">
                            {" "}({sistemaEscuro ? "Escuro" : "Claro"})
                          </span>
                        )}
                      </span>
                      {ativo && (
                        <span aria-hidden="true" className="text-xs font-medium text-info">
                          Ativo
                        </span>
                      )}
                    </span>
                  </label>
                );
              })}
            </fieldset>
          </section>

          <section aria-labelledby="dados" className="rounded-xl border border-border-subtle bg-surface p-5 sm:p-6 space-y-5">
            {consulta.isPending ? (
              <>
                <h2 id="dados" className="text-base font-semibold text-foreground">Dados do usuário</h2>
                <FeedbackLoading />
              </>
            ) : consulta.isError ? (
              <>
                <h2 id="dados" className="text-base font-semibold text-foreground">Dados do usuário</h2>
                <FeedbackErro mensagem="Não foi possível consultar os dados do usuário." onTentarNovamente={() => void consulta.refetch()} />
              </>
            ) : !consulta.data ? (
              <>
                <h2 id="dados" className="text-base font-semibold text-foreground">Dados do usuário</h2>
                <EmptyState titulo="Dados do usuário indisponíveis" />
              </>
            ) : (
              <>
                <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-border-subtle">
                  <div className="flex items-center gap-3.5">
                    <div className="w-11 h-11 rounded-full border border-border-strong bg-surface-subtle flex items-center justify-center font-semibold text-sm text-foreground shrink-0" aria-hidden="true">
                      {iniciaisUsuario(consulta.data.nome)}
                    </div>
                    <div>
                      <h2 id="dados" className="text-base font-semibold text-foreground">{consulta.data.nome}</h2>
                      <p className="text-xs text-muted-foreground">Dados da conta autenticada</p>
                    </div>
                  </div>
                  <span className="inline-flex items-center rounded-md border border-accent-border bg-accent-light px-2.5 py-1 text-xs font-medium text-accent">
                    {perfilCanonico(consulta.data.perfil.nomePerfil) ? ROTULOS_PERFIS[consulta.data.perfil.nomePerfil] : consulta.data.perfil.nomePerfil}
                  </span>
                </div>

                <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4 text-sm">
                  <div>
                    <dt className="text-xs text-muted-foreground">E-mail de acesso</dt>
                    <dd className="mt-1 flex items-center gap-2.5 flex-wrap">
                      <span className="font-medium text-foreground break-all">{consulta.data.email}</span>
                      <button
                        type="button"
                        onClick={copiarEmail}
                        className="shrink-0 inline-flex items-center gap-1 rounded-md border border-border-strong bg-surface-subtle px-2.5 py-1 text-xs font-medium text-foreground hover:bg-muted cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                      >
                        {copiado ? <Check className="w-3.5 h-3.5 text-success" aria-hidden="true" /> : <Copy className="w-3.5 h-3.5" aria-hidden="true" />}
                        <span>{copiado ? "Copiado" : "Copiar"}</span>
                      </button>
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">Equipe vinculada</dt>
                    <dd className="mt-1 font-medium text-foreground">
                      {consulta.data.equipeId == null ? "Sem equipe vinculada" : `Equipe #${consulta.data.equipeId}`}
                    </dd>
                  </div>
                </dl>
              </>
            )}
          </section>

          <section aria-labelledby="seguranca" className="rounded-xl border border-border-subtle bg-surface p-5 sm:p-6 space-y-5">
            <div>
              <h2 id="seguranca" className="text-base font-semibold text-foreground">Segurança</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Altere sua senha de acesso quando necessário.
              </p>
            </div>
            <p className="rounded-lg border border-info-border bg-info-light px-3.5 py-3 text-xs leading-relaxed text-info flex items-start gap-2.5">
              <Info className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
              <span>Ao salvar uma nova senha, sua sessão atual será encerrada por segurança e você fará login novamente.</span>
            </p>
            <FormularioAlterarSenha geracao={geracao} />
          </section>
        </div>
      </section>
    </div>
  );
}
