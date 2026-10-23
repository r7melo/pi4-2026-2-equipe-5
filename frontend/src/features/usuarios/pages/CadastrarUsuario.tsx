import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { ApiErro } from "@/shared/api/api";
import { PageHeader } from "@/shared/components/ui/PageHeader";
import { Input } from "@/shared/components/ui/Input";
import { Button } from "@/shared/components/ui/Button";
import FeedbackLoading from "@/shared/components/feedback/FeedbackLoading";
import FeedbackErro from "@/shared/components/feedback/FeedbackErro";
import { EmptyState } from "@/shared/components/feedback/EmptyState";
import { cadastroUsuarioSchema } from "../types/usuarios";
import type { CadastroUsuarioEntrada, CadastroUsuarioDados } from "../types/usuarios";
import { useCriarUsuario, useEquipesOpcoes } from "../hooks/useUsuarios";

const VALORES_INICIAIS: CadastroUsuarioEntrada = {
  nome: "", email: "", senha: "", perfil: "", equipeId: "",
};
const CLASSE_SELECT = "w-full min-w-0 rounded-lg border border-border-subtle bg-surface-subtle px-4 py-2.5 text-sm text-foreground-secondary focus:outline-none focus:ring-2 focus:ring-border-strong disabled:opacity-50";
const CLASSE_LABEL = "block text-sm font-semibold text-foreground-muted";

export default function CadastrarUsuario() {
  const navigate = useNavigate();
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [focoPendente, setFocoPendente] = useState(false);
  const travaEnvio = useRef(false);
  const form = useForm<CadastroUsuarioEntrada, undefined, CadastroUsuarioDados>({
    resolver: zodResolver(cadastroUsuarioSchema),
    defaultValues: VALORES_INICIAIS,
    mode: "onSubmit",
    reValidateMode: "onChange",
  });
  const { register, control, handleSubmit, reset, resetField, setValue, setError, setFocus,
    formState: { errors, isSubmitting } } = form;
  const perfil = useWatch({ control, name: "perfil" });
  const equipeId = useWatch({ control, name: "equipeId" });
  const instalador = perfil === "InstaladorCampo";
  const equipes = useEquipesOpcoes(instalador);
  const cadastro = useCriarUsuario();
  const ocupado = isSubmitting || cadastro.isPending;
  const opcoes = equipes.data;
  const equipeIndisponivel = instalador &&
    (!equipes.isSuccess || equipes.isFetching || !opcoes?.length);

  useEffect(() => {
    if (!instalador && equipeId !== "") {
      resetField("equipeId", { defaultValue: "" });
    }
  }, [instalador, equipeId, resetField]);

  useEffect(() => {
    if (instalador && equipes.isSuccess && !equipes.isFetching && equipeId &&
        !opcoes?.some((equipe) => equipe.id === Number(equipeId))) {
      setValue("equipeId", "", { shouldValidate: false });
    }
  }, [instalador, equipes.isSuccess, equipes.isFetching, equipeId, opcoes, setValue]);

  useEffect(() => {
    if (!focoPendente || ocupado) return;
    const frame = requestAnimationFrame(() => {
      setFocus("nome");
      setFocoPendente(false);
    });
    return () => cancelAnimationFrame(frame);
  }, [focoPendente, ocupado, setFocus]);

  async function enviar(dados: CadastroUsuarioDados) {
    if (dados.perfil === "InstaladorCampo" &&
        (equipeIndisponivel || !opcoes?.some((equipe) => equipe.id === dados.equipeId))) {
      setError("equipeId", { type: "validate", message: "Selecione uma equipe disponível." },
        { shouldFocus: true });
      return;
    }
    try {
      await cadastro.mutateAsync(dados);
      toast.success("Usuário cadastrado com sucesso.");
      reset(VALORES_INICIAIS);
      setMostrarSenha(false);
      setFocoPendente(true);
    } catch (erro) {
      if (erro instanceof ApiErro) {
        if (erro.status === 401) return;
        if (erro.status === 409 && erro.codigo === "EMAIL_ALREADY_EXISTS") {
          setError("email", { type: "server", message: "Este e-mail já está cadastrado." });
          return;
        }
        if (erro.status === 404 && erro.codigo === "EQUIPE_NOT_FOUND") {
          setError("equipeId", { type: "server",
            message: "Equipe não encontrada. Atualize a lista e tente novamente." });
          await equipes.refetch();
          return;
        }
        if (erro.status === 404 || erro.status === 405) {
          toast.error("Cadastro de usuários indisponível no momento.");
          return;
        }
        if (erro.status === 400 && erro.codigo === "VALIDATION_ERROR") {
          toast.error("Verifique os dados informados e tente novamente.");
          return;
        }
        if (erro.status === 403) {
          toast.error("Você não tem permissão para cadastrar usuários.");
          return;
        }
        if (erro.codigo === "NETWORK_ERROR") {
          toast.error("Não foi possível conectar ao servidor.");
          return;
        }
      }
      toast.error("Não foi possível confirmar o cadastro. Tente novamente.");
    } finally {
      cadastro.reset();
    }
  }

  async function submeter(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (travaEnvio.current) return;
    travaEnvio.current = true;
    setFocoPendente(false);
    try {
      await handleSubmit(enviar)(evento);
    } catch {
      toast.error("Não foi possível confirmar o cadastro. Tente novamente.");
    } finally {
      travaEnvio.current = false;
    }
  }

  return (
    <div className="flex-1 flex flex-col h-full min-w-0 overflow-hidden">
      <PageHeader title="Cadastrar usuário" />
      <div className="flex-1 min-w-0 overflow-y-auto p-4 md:p-6 bg-background-app">
        <form noValidate onSubmit={(evento) => void submeter(evento)}
          className="mx-auto w-full max-w-xl rounded-xl border border-border-subtle bg-surface p-4 sm:p-6">
          <fieldset disabled={ocupado} className="min-w-0 space-y-5">
            <legend className="sr-only">Dados do usuário</legend>
            <Input id="usuario-nome" label="Nome completo" autoComplete="off"
              required {...register("nome")} error={errors.nome?.message} />
            <Input id="usuario-email" type="email" label="E-mail" autoComplete="off"
              required {...register("email")} error={errors.email?.message} />
            <div className="space-y-1.5">
              <label htmlFor="usuario-perfil" className={CLASSE_LABEL}>Perfil de acesso</label>
              <select id="usuario-perfil" required autoComplete="off" className={CLASSE_SELECT}
                {...register("perfil")} aria-invalid={!!errors.perfil}
                aria-describedby={errors.perfil ? "usuario-perfil-erro" : undefined}>
                <option value="">Selecionar perfil</option>
                <option value="Administrador">Administrador</option>
                <option value="Engenharia">Engenharia</option>
                <option value="Financeiro">Financeiro</option>
                <option value="InstaladorCampo">Instalador de Campo</option>
              </select>
              {errors.perfil && (
                <p id="usuario-perfil-erro" className="text-xs text-destructive">
                  {errors.perfil.message}
                </p>
              )}
            </div>
            {instalador && (
              <div className="space-y-1.5">
                <label htmlFor="usuario-equipe" className={CLASSE_LABEL}>Equipe</label>
                <select id="usuario-equipe" required autoComplete="off" className={CLASSE_SELECT}
                  {...register("equipeId")} disabled={ocupado || equipeIndisponivel}
                  aria-invalid={!!errors.equipeId}
                  aria-describedby={errors.equipeId ? "usuario-equipe-erro" : undefined}>
                  <option value="">
                    {equipes.isPending || equipes.isFetching ? "Carregando equipes..." : "Selecionar equipe"}
                  </option>
                  {opcoes?.map((equipe) => (
                    <option key={equipe.id} value={equipe.id}>{equipe.nome}</option>
                  ))}
                </select>
                {errors.equipeId && (
                  <p id="usuario-equipe-erro" className="text-xs text-destructive">
                    {errors.equipeId.message}
                  </p>
                )}
                {(equipes.isPending || equipes.isFetching) && (
                  <FeedbackLoading mensagem="Carregando equipes..." />
                )}
                {equipes.isError && !equipes.isFetching && (
                  <FeedbackErro mensagem="Não foi possível carregar as equipes."
                    onTentarNovamente={() => { void equipes.refetch(); }} />
                )}
                {equipes.isSuccess && !equipes.isFetching && opcoes?.length === 0 && (
                  <EmptyState titulo="Nenhuma equipe cadastrada."
                    descricao="Cadastre uma equipe antes de criar um instalador."
                    acao={{ label: "Cadastrar equipe", onClick: () => { void navigate("/equipes"); } }} />
                )}
              </div>
            )}
            <div className="relative">
              <Input id="usuario-senha" type={mostrarSenha ? "text" : "password"}
                label="Senha inicial" autoComplete="new-password" required
                className="pr-12" {...register("senha")} error={errors.senha?.message} />
              <button type="button" disabled={ocupado}
                onClick={() => setMostrarSenha((visivel) => !visivel)}
                aria-label={mostrarSenha ? "Ocultar senha" : "Mostrar senha"}
                className="absolute right-2 top-7 rounded p-2 text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-strong">
                {mostrarSenha ? <EyeOff className="h-4 w-4" aria-hidden="true" />
                  : <Eye className="h-4 w-4" aria-hidden="true" />}
              </button>
            </div>
            <Button type="submit" disabled={ocupado || equipeIndisponivel}
              className="w-full sm:w-auto" aria-busy={ocupado}>
              {ocupado && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
              {ocupado ? "Cadastrando usuário..." : "Cadastrar usuário"}
            </Button>
          </fieldset>
        </form>
      </div>
    </div>
  );
}
