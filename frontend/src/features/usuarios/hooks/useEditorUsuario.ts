import { useState, useRef } from "react";
import type { FormEvent } from "react";
import { toast } from "sonner";
import { ApiErro } from "@/shared/api/api";
import { erroDaSessaoAnterior } from "@/shared/lib/sessaoOperacao";
import { useEditarUsuario, useConsultaUsuario } from "./useGestaoUsuarios";
import { useEquipesOpcoes } from "./useUsuarios";
import { usePerdaPermissao } from "./usePerdaPermissao";
import { useContextoUsuario } from "./useContextoUsuario";
import { mensagemGestao } from "../services/gestaoUsuarios";
import type { EditorUsuarioProps } from "../types/gestaoUsuarios";

export function useEditorUsuario({ usuario, onFechar, onConcluido }: Omit<EditorUsuarioProps, "proprio">) {
  const capturarContexto = useContextoUsuario();
  const nomeRef = useRef<HTMLInputElement>(null);
  const [base, setBase] = useState(usuario);
  const [nome, setNome] = useState(usuario.nome);
  const [perfil, setPerfil] = useState(usuario.perfil);
  const [equipe, setEquipe] = useState(String(usuario.equipeId ?? ""));
  const [erro, setErro] = useState("");
  const [conflito, setConflito] = useState(false);
  const nomeInvalido = nome.trim().length < 3 || nome.trim().length > 200;
  const trava = useRef(false);
  const mutacao = useEditarUsuario(usuario.id, usuario.email);
  const equipes = useEquipesOpcoes(perfil === "InstaladorCampo");
  const atual = useConsultaUsuario(usuario.id, usuario.email);
  usePerdaPermissao(equipes.error, onFechar);
  usePerdaPermissao(atual.error, onFechar);
  const indisponivel = perfil === "InstaladorCampo" && (!equipes.isSuccess || equipes.isFetching || !equipes.data.length || !equipes.data.some(e => e.id === Number(equipe)));
  async function salvar(evento: FormEvent) {
    evento.preventDefault(); if (trava.current || conflito) return; trava.current = true;
    const vigente = capturarContexto(); setErro("");
    try {
      if (nomeInvalido) { setErro("Informe um nome entre 3 e 200 caracteres."); nomeRef.current?.focus(); return; }
      await mutacao.mutateAsync({ nome: nome.trim(), perfil, equipeId: perfil === "InstaladorCampo" ? Number(equipe) : perfil === base.perfil ? base.equipeId : null, revisao: base.revisao });
      if (!vigente()) return;
      toast.success("Usuário atualizado com sucesso."); onConcluido();
    } catch (e) {
      if (!vigente() || erroDaSessaoAnterior(e)) return;
      if (e instanceof ApiErro && e.status === 403) { onFechar(); return; }
      setErro(mensagemGestao(e)); if (e instanceof ApiErro && e.codigo === "USER_VERSION_CONFLICT") setConflito(true);
    } finally { trava.current = false; }
  }
  async function recarregar() {
    const vigente = capturarContexto(); const r = await atual.refetch();
    if (!vigente()) return;
    const u = r.data;
    if (r.isError || !u) { setErro("Não foi possível recarregar o usuário. Tente novamente."); return; }
    setBase(u); setNome(u.nome); setPerfil(u.perfil); setEquipe(String(u.equipeId ?? "")); setConflito(false); setErro("");
  }
  return { nome, setNome, nomeRef, nomeInvalido, perfil, setPerfil, equipe, setEquipe, erro, conflito, equipes,
    ocupado: mutacao.isPending, indisponivel, salvar, recarregar };
}
