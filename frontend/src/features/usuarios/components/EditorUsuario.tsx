import { Modal } from "@/shared/components/ui/Modal";
import { AlertBanner } from "@/shared/components/ui/AlertBanner";
import { Input } from "@/shared/components/ui/Input";
import { Button } from "@/shared/components/ui/Button";
import FeedbackLoading from "@/shared/components/feedback/FeedbackLoading";
import FeedbackErro from "@/shared/components/feedback/FeedbackErro";
import { NOMES_PERFIS, ROTULOS_PERFIS } from "@/shared/constants/perfis";
import { useEditorUsuario } from "../hooks/useEditorUsuario";
import type { EditorUsuarioProps, UsuarioItem } from "../types/gestaoUsuarios";

export function EditorUsuario({ usuario, proprio, onFechar, onConcluido }: EditorUsuarioProps) {
  const { nome, setNome, nomeRef, nomeInvalido, perfil, setPerfil, equipe, setEquipe, erro, conflito, equipes, ocupado,
    indisponivel, salvar, recarregar } = useEditorUsuario({ usuario, onFechar, onConcluido });
  return (
    <Modal
      isOpen
      onClose={onFechar}
      titulo="Editar usuário"
      subtitulo={usuario.email}
      tamanho="md"
      fecharBloqueado={ocupado}
      className="max-h-[90dvh] overflow-y-auto"
    >
      <form noValidate onSubmit={e => void salvar(e)} className="p-5">
        <fieldset disabled={ocupado} className="space-y-4 min-w-0">
          <Input
            ref={nomeRef}
            id="editor-usuario-nome"
            label="Nome completo"
            className="h-11 py-0"
            error={erro && nomeInvalido ? erro : undefined}
            value={nome}
            onChange={e => setNome(e.target.value)}
            required
          />
          <div className="space-y-1.5">
            <Input
              label="E-mail"
              value={usuario.email}
              readOnly
              className="h-11 py-0 bg-muted text-muted-foreground cursor-not-allowed"
              aria-describedby="email-ajuda"
            />
            <p id="email-ajuda" className="text-xs text-muted-foreground">
              O e-mail é o identificador de acesso e não pode ser alterado.
            </p>
          </div>
          <div className="space-y-1.5">
            <label htmlFor="editor-usuario-perfil" className="block text-sm font-medium text-foreground-secondary">
              Perfil de acesso
            </label>
            <select
              id="editor-usuario-perfil"
              value={perfil}
              disabled={proprio}
              onChange={e => { setPerfil(e.target.value as UsuarioItem["perfil"]); setEquipe(""); }}
              className="w-full h-11 min-w-0 rounded-lg border border-border-subtle bg-surface-subtle px-3.5 text-sm text-foreground-secondary focus:bg-surface focus:border-border-strong disabled:opacity-50"
            >
              {NOMES_PERFIS.map(p => <option key={p} value={p}>{ROTULOS_PERFIS[p]}</option>)}
            </select>
            {proprio && (
              <p className="text-xs text-muted-foreground">
                Não é possível alterar o perfil da própria conta em uso.
              </p>
            )}
          </div>
          {perfil === "InstaladorCampo" && (
            <div className="space-y-1.5">
              <label htmlFor="editor-usuario-equipe" className="block text-sm font-medium text-foreground-secondary">
                Equipe (opcional)
              </label>
              <select
                id="editor-usuario-equipe"
                value={equipe}
                onChange={e => setEquipe(e.target.value)}
                disabled={equipes.isPending || equipes.isFetching}
                className="w-full h-11 min-w-0 rounded-lg border border-border-subtle bg-surface-subtle px-3.5 text-sm text-foreground-secondary focus:bg-surface focus:border-border-strong disabled:opacity-50"
              >
                <option value="">Sem equipe fixa</option>
                {equipes.data?.map(e => <option key={e.id} value={e.id}>{e.nome}</option>)}
              </select>
              <p className="text-xs text-muted-foreground">
                Equipes são definidas por programação no cronograma. Este vínculo é opcional.
              </p>
              {equipes.isPending && <FeedbackLoading mensagem="Carregando equipes..." />}
              {equipes.isError && <FeedbackErro mensagem="Não foi possível carregar as equipes." onTentarNovamente={() => void equipes.refetch()} />}
            </div>
          )}
          {erro && (
            <AlertBanner variante="destructive">
              {erro}
            </AlertBanner>
          )}
          {conflito && (
            <Button variant="outline" className="h-10" onClick={() => void recarregar()}>
              Recarregar dados
            </Button>
          )}
          <div className="pt-3 border-t border-border-subtle flex flex-wrap justify-end gap-2">
            <Button variant="outline" className="h-10" onClick={onFechar}>Cancelar</Button>
            <Button type="submit" className="h-10" disabled={indisponivel || conflito}>Salvar alterações</Button>
          </div>
        </fieldset>
      </form>
    </Modal>
  );
}
