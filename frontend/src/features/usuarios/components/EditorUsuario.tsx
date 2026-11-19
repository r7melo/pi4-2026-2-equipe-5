import { Modal } from "@/shared/components/ui/Modal";
import { Input } from "@/shared/components/ui/Input";
import { Button } from "@/shared/components/ui/Button";
import FeedbackLoading from "@/shared/components/feedback/FeedbackLoading";
import FeedbackErro from "@/shared/components/feedback/FeedbackErro";
import { EmptyState } from "@/shared/components/feedback/EmptyState";
import { NOMES_PERFIS, ROTULOS_PERFIS } from "@/shared/constants/perfis";
import { useEditorUsuario } from "../hooks/useEditorUsuario";
import type { EditorUsuarioProps, UsuarioItem } from "../types/gestaoUsuarios";

export function EditorUsuario({ usuario, proprio, onFechar, onConcluido }: EditorUsuarioProps) {
  const { nome, setNome, nomeRef, nomeInvalido, perfil, setPerfil, equipe, setEquipe, erro, conflito, equipes, ocupado,
    indisponivel, salvar, recarregar } = useEditorUsuario({ usuario, onFechar, onConcluido });
  return <Modal isOpen onClose={onFechar} titulo="Editar usuário" fecharBloqueado={ocupado} className="max-h-[90dvh] overflow-y-auto">
    <form noValidate onSubmit={e => void salvar(e)} className="p-5 space-y-4">
      <fieldset disabled={ocupado} className="space-y-4 min-w-0">
        <Input ref={nomeRef} id="editor-usuario-nome" label="Nome completo" error={erro && nomeInvalido ? erro : undefined} value={nome} onChange={e => setNome(e.target.value)} required />
        <Input label="E-mail" value={usuario.email} readOnly aria-describedby="email-ajuda" /><p id="email-ajuda" className="text-sm text-muted-foreground">O e-mail é o identificador de acesso e não pode ser alterado</p>
        <label className="block text-sm">Perfil de acesso<select value={perfil} disabled={proprio} onChange={e => { setPerfil(e.target.value as UsuarioItem["perfil"]); setEquipe(""); }} className="block w-full p-2 border border-border-subtle bg-surface rounded-lg">{NOMES_PERFIS.map(p => <option key={p} value={p}>{ROTULOS_PERFIS[p]}</option>)}</select></label>
        {proprio && <p className="text-sm text-muted-foreground">Não é possível alterar o perfil da própria conta em uso</p>}
        {perfil === "InstaladorCampo" && <div>
          <label className="block text-sm">Equipe<select value={equipe} onChange={e => setEquipe(e.target.value)} disabled={!equipes.isSuccess || equipes.isFetching} className="block w-full p-2 border border-border-subtle bg-surface rounded-lg"><option value="">Selecionar equipe</option>{equipes.data?.map(e => <option key={e.id} value={e.id}>{e.nome}</option>)}</select></label>
          {equipes.isPending && <FeedbackLoading mensagem="Carregando equipes..." />}
          {equipes.isError && <FeedbackErro mensagem="Não foi possível carregar as equipes." onTentarNovamente={() => void equipes.refetch()} />}
          {equipes.isSuccess && !equipes.data.length && <EmptyState titulo="Nenhuma equipe cadastrada." />}
        </div>}
        {erro && <p role="alert" className="text-sm text-destructive">{erro}</p>}
        {conflito && <Button variant="outline" onClick={() => void recarregar()}>Recarregar dados</Button>}
        <div className="flex gap-3 flex-wrap"><Button variant="outline" onClick={onFechar}>Cancelar</Button><Button type="submit" disabled={indisponivel || conflito}>Salvar alterações</Button></div>
      </fieldset>
    </form>
  </Modal>;
}
