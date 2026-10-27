import { useState, useRef } from "react";
import { toast } from "sonner";
import { Modal } from "@/shared/components/ui/Modal";
import { Input } from "@/shared/components/ui/Input";
import { Button } from "@/shared/components/ui/Button";
import FeedbackLoading from "@/shared/components/feedback/FeedbackLoading";
import FeedbackErro from "@/shared/components/feedback/FeedbackErro";
import { EmptyState } from "@/shared/components/feedback/EmptyState";
import { ApiErro } from "@/shared/api/api";
import { capturarSessaoOperacional, sessaoOperacionalVigente, erroDaSessaoAnterior } from "@/shared/lib/sessaoOperacao";
import { useEditarUsuario, useConsultaUsuario, usePerdaPermissao } from "../hooks/useGestaoUsuarios";
import { useEquipesOpcoes } from "../hooks/useUsuarios";
import { mensagemGestao } from "../services/gestaoUsuarios";
import { PERFIS_GESTAO } from "../types/gestaoUsuarios";
import type { EditorUsuarioProps, UsuarioItem } from "../types/gestaoUsuarios";
export function EditorUsuario({ usuario, proprio, onFechar, onConcluido }: EditorUsuarioProps) {
  const [base, setBase] = useState(usuario);
  const [nome, setNome] = useState(usuario.nome);
  const [perfil, setPerfil] = useState(usuario.perfil);
  const [equipe, setEquipe] = useState(String(usuario.equipeId ?? ""));
  const [erro, setErro] = useState("");
  const [conflito, setConflito] = useState(false);
  const trava = useRef(false);
  const mutacao = useEditarUsuario(usuario.id, usuario.email);
  const equipes = useEquipesOpcoes(perfil === "InstaladorCampo");
  const atual = useConsultaUsuario(usuario.id, usuario.email);
  usePerdaPermissao(equipes.error, onFechar);
  usePerdaPermissao(atual.error, onFechar);
  const indisponivel = perfil === "InstaladorCampo" && (!equipes.isSuccess || equipes.isFetching || !equipes.data.length || !equipes.data.some(e => e.id === Number(equipe)));
  async function salvar(evento: React.FormEvent) {
    evento.preventDefault(); if (trava.current || conflito) return; trava.current = true;
    const sessao = capturarSessaoOperacional(); setErro("");
    try {
      if (nome.trim().length < 3 || nome.trim().length > 200) { setErro("Informe um nome entre 3 e 200 caracteres."); return; }
      await mutacao.mutateAsync({ nome: nome.trim(), perfil, equipeId: perfil === "InstaladorCampo" ? Number(equipe) : perfil === base.perfil ? base.equipeId : null, revisao: base.revisao });
      if (!sessaoOperacionalVigente(sessao)) return;
      toast.success("Usuário atualizado com sucesso."); onConcluido();
    } catch (e) {
      if (!sessaoOperacionalVigente(sessao) || erroDaSessaoAnterior(e)) return;
      if (e instanceof ApiErro && e.status === 403) { onFechar(); return; }
      setErro(mensagemGestao(e)); if (e instanceof ApiErro && e.codigo === "USER_VERSION_CONFLICT") setConflito(true);
    } finally { trava.current = false; }
  }
  async function recarregar() {
    const sessao = capturarSessaoOperacional(); const r = await atual.refetch();
    if (!sessaoOperacionalVigente(sessao)) return;
    const u = r.data;
    if (r.isError || !u) { setErro("Não foi possível recarregar o usuário. Tente novamente."); return; }
    setBase(u); setNome(u.nome); setPerfil(u.perfil); setEquipe(String(u.equipeId ?? "")); setConflito(false); setErro("");
  }
  return <Modal isOpen onClose={onFechar} titulo="Editar usuário" gerenciarFoco fecharBloqueado={mutacao.isPending} className="max-h-[90dvh] overflow-y-auto">
    <form noValidate onSubmit={e => void salvar(e)} className="p-5 space-y-4">
      <fieldset disabled={mutacao.isPending} className="space-y-4 min-w-0">
        <Input label="Nome completo" value={nome} onChange={e => setNome(e.target.value)} required />
        <Input label="E-mail" value={usuario.email} readOnly aria-describedby="email-ajuda" /><p id="email-ajuda" className="text-sm text-muted-foreground">O e-mail é o identificador de acesso e não pode ser alterado</p>
        <label className="block text-sm">Perfil de acesso<select value={perfil} disabled={proprio} onChange={e => { setPerfil(e.target.value as UsuarioItem["perfil"]); setEquipe(""); }} className="block w-full p-2 border border-border-subtle bg-surface rounded-lg">{PERFIS_GESTAO.map(p => <option key={p} value={p}>{p === "InstaladorCampo" ? "Instalador de Campo" : p}</option>)}</select></label>
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
