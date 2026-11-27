import { Modal } from "@/shared/components/ui/Modal";
import { AlertBanner } from "@/shared/components/ui/AlertBanner";
import { Input } from "@/shared/components/ui/Input";
import { Button } from "@/shared/components/ui/Button";
import { NOMES_PERFIS, ROTULOS_PERFIS } from "@/shared/constants/perfis";
import { useEditorUsuario } from "../hooks/useEditorUsuario";
import { AvisoParticipacoesFuturas } from "./AvisoParticipacoesFuturas";
import type { EditorUsuarioProps, UsuarioItem } from "../types/gestaoUsuarios";

export function EditorUsuario({ usuario, proprio, onFechar, onConcluido }: EditorUsuarioProps) {
  const {
    nome, setNome, nomeRef, nomeInvalido,
    email, setEmail, emailRef, emailInvalido,
    perfil, setPerfil, erro, conflito,
    ocupado, salvar, recarregar,
  } = useEditorUsuario({ usuario, onFechar, onConcluido });
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
          <Input
            ref={emailRef}
            id="editor-usuario-email"
            type="email"
            label="E-mail"
            autoComplete="email"
            autoCorrect="off"
            autoCapitalize="none"
            spellCheck={false}
            className="h-11 py-0"
            error={erro && emailInvalido ? erro : undefined}
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
          />
          <div className="space-y-1.5">
            <label htmlFor="editor-usuario-perfil" className="block text-sm font-medium text-foreground-secondary">
              Perfil de acesso
            </label>
            <select
              id="editor-usuario-perfil"
              value={perfil}
              disabled={proprio}
              onChange={e => setPerfil(e.target.value as UsuarioItem["perfil"])}
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
          <AvisoParticipacoesFuturas
            usuarioId={usuario.id}
            habilitada={usuario.perfil === "InstaladorCampo" && perfil !== "InstaladorCampo"}
            contexto="perfil"
          />
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
            <Button type="submit" className="h-10" disabled={conflito}>Salvar alterações</Button>
          </div>
        </fieldset>
      </form>
    </Modal>
  );
}
