import { useState, useRef } from "react";
import type { FormEvent } from "react";
import { toast } from "sonner";
import { ApiErro } from "@/shared/api/api";
import { EMAIL_USUARIO } from "@/shared/constants/emailUsuario";
import { erroDaSessaoAnterior } from "@/shared/lib/sessaoOperacao";
import { useEditarUsuario, useConsultaUsuario } from "./useGestaoUsuarios";
import { usePerdaPermissao } from "./usePerdaPermissao";
import { useContextoUsuario } from "./useContextoUsuario";
import { mensagemGestao } from "../services/gestaoUsuarios";
import type { EditorUsuarioProps } from "../types/gestaoUsuarios";

export function useEditorUsuario({ usuario, onFechar, onConcluido }: Omit<EditorUsuarioProps, "proprio">) {
  const capturarContexto = useContextoUsuario();
  const nomeRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const [base, setBase] = useState(usuario);
  const [nome, setNome] = useState(usuario.nome);
  const [email, setEmail] = useState(usuario.email);
  const [perfil, setPerfil] = useState(usuario.perfil);
  const [erro, setErro] = useState("");
  const [conflito, setConflito] = useState(false);
  const nomeInvalido = nome.trim().length < 3 || nome.trim().length > 200;
  const emailLimpo = email.trim().toLowerCase();
  const emailInvalido = !emailLimpo || emailLimpo.length > 200 || !EMAIL_USUARIO.test(emailLimpo);
  const trava = useRef(false);
  const mutacao = useEditarUsuario(usuario.id);
  const atual = useConsultaUsuario(usuario.id);
  usePerdaPermissao(atual.error, onFechar);
  async function salvar(evento: FormEvent) {
    evento.preventDefault(); if (trava.current || conflito) return; trava.current = true;
    const vigente = capturarContexto(); setErro("");
    try {
      if (nomeInvalido) { setErro("Informe um nome entre 3 e 200 caracteres."); nomeRef.current?.focus(); return; }
      if (emailInvalido) { setErro("Informe um e-mail válido com até 200 caracteres."); emailRef.current?.focus(); return; }
      await mutacao.mutateAsync({
        nome: nome.trim(),
        email: emailLimpo,
        perfil,
        ...(base.revisao !== undefined ? { revisao: base.revisao } : {}),
      });
      if (!vigente()) return;
      toast.success("Usuário atualizado com sucesso."); onConcluido();
    } catch (e) {
      if (!vigente() || erroDaSessaoAnterior(e)) return;
      if (e instanceof ApiErro && e.status === 403) { onFechar(); return; }
      setErro(mensagemGestao(e));
      if (e instanceof ApiErro && e.codigo === "EMAIL_ALREADY_EXISTS") emailRef.current?.focus();
      if (e instanceof ApiErro && e.codigo === "USER_VERSION_CONFLICT") setConflito(true);
    } finally { trava.current = false; }
  }
  async function recarregar() {
    const vigente = capturarContexto(); const r = await atual.refetch();
    if (!vigente()) return;
    const u = r.data;
    if (r.isError || !u) { setErro("Não foi possível recarregar o usuário. Tente novamente."); return; }
    setBase(u); setNome(u.nome); setEmail(u.email); setPerfil(u.perfil); setConflito(false); setErro("");
  }
  return {
    nome, setNome, nomeRef, nomeInvalido,
    email, setEmail, emailRef, emailInvalido,
    perfil, setPerfil, erro, conflito,
    ocupado: mutacao.isPending, salvar, recarregar,
  };
}
