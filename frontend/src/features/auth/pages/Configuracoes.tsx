import { PageHeader } from "@/shared/components/ui/PageHeader";
import FeedbackLoading from "@/shared/components/feedback/FeedbackLoading";
import FeedbackErro from "@/shared/components/feedback/FeedbackErro";
import { EmptyState } from "@/shared/components/feedback/EmptyState";
import { useThemeStore } from "@/shared/stores/useThemeStore";
import { useGeracaoSenha } from "../hooks/useOperacaoSenha";
import { useUsuarioConfiguracoes } from "../hooks/useUsuarioConfiguracoes";
import { FormularioAlterarSenha } from "../components/FormularioAlterarSenha";
import type { TemaSistema } from "@/types";

export default function Configuracoes() {
  const geracao = useGeracaoSenha();
  return <Conteudo key={geracao} geracao={geracao} />;
}
function Conteudo({ geracao }: { geracao: number }) {
  const tema = useThemeStore(s => s.tema);
  const setTema = useThemeStore(s => s.setTema);
  const consulta = useUsuarioConfiguracoes(geracao);
  const temas: { valor: TemaSistema; texto: string }[] = [{ valor: "light", texto: "Claro" }, { valor: "dark", texto: "Escuro" }, { valor: "system", texto: "Sistema" }];
  return <div className="flex-1 flex flex-col h-full overflow-hidden">
    <PageHeader title="Configurações" backTo="/kanban" />
    <main className="flex-1 overflow-y-auto p-4 md:p-6 bg-background-app text-foreground">
      <div className="max-w-3xl space-y-8">
        <p className="text-sm text-foreground-secondary">Gerencie suas preferências de tema, perfil e segurança de acesso.</p>
        <section aria-labelledby="aparencia" className="space-y-4">
          <h2 id="aparencia" className="text-lg font-semibold">Aparência</h2>
          <fieldset className="flex flex-wrap gap-3"><legend className="sr-only">Tema</legend>
            {temas.map(item => <label key={item.valor} className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-border-strong bg-surface px-4 cursor-pointer">
              <input type="radio" name="tema" value={item.valor} checked={tema === item.valor} onChange={() => setTema(item.valor)} className="accent-primary focus-visible:ring-2 focus-visible:ring-primary" />{item.texto}
            </label>)}
          </fieldset>
        </section>
        <section aria-labelledby="dados" className="space-y-4">
          <h2 id="dados" className="text-lg font-semibold">Dados do usuário</h2>
          {consulta.isPending ? <FeedbackLoading /> : consulta.isError ? <FeedbackErro mensagem="Não foi possível consultar os dados do usuário." onTentarNovamente={() => void consulta.refetch()} /> : !consulta.data ? <EmptyState titulo="Dados do usuário indisponíveis" /> :
            <dl className="grid gap-4 sm:grid-cols-2 text-sm">
              <div><dt className="text-muted-foreground">Nome completo</dt><dd className="mt-1 break-words">{consulta.data.nome}</dd></div>
              <div><dt className="text-muted-foreground">E-mail</dt><dd className="mt-1 break-all">{consulta.data.email}</dd></div>
              <div><dt className="text-muted-foreground">Perfil de acesso</dt><dd className="mt-1">{consulta.data.perfil.nomePerfil === "InstaladorCampo" ? "Instalador de Campo" : consulta.data.perfil.nomePerfil}</dd></div>
              <div><dt className="text-muted-foreground">Equipe vinculada</dt><dd className="mt-1">{consulta.data.equipeId == null ? "Sem equipe vinculada" : `Equipe #${consulta.data.equipeId}`}</dd></div>
            </dl>}
        </section>
        <section aria-labelledby="seguranca" className="space-y-4">
          <h2 id="seguranca" className="text-lg font-semibold">Segurança</h2>
          <FormularioAlterarSenha geracao={geracao} />
        </section>
      </div>
    </main>
  </div>;
}
