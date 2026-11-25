import { NOMES_PERFIS, ROTULOS_PERFIS } from "@/shared/constants/perfis";
import { cn } from "@/shared/lib/utils";
import { useContextoUsuario } from "../hooks/useContextoUsuario";
import { usePerdaPermissao } from "../hooks/usePerdaPermissao";
import { erroDaSessaoAnterior } from "@/shared/lib/sessaoOperacao";
import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { ApiErro } from "@/shared/api/api";
import type { FormularioCadastroProps } from "../types/gestaoUsuarios";
import { BotaoVisibilidadeSenha } from "@/shared/components/ui/BotaoVisibilidadeSenha";
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
const CLASSE_SELECT = "w-full h-11 min-w-0 rounded-lg border border-border-subtle bg-surface-subtle px-3.5 text-sm text-foreground-secondary focus:bg-surface focus:border-border-strong disabled:opacity-50";
const CLASSE_LABEL = "block text-sm font-medium text-foreground-secondary";

export default function FormularioCadastrarUsuario({ onConcluido, onOcupado, onSemPermissao, emModal = false, onCancelar }: FormularioCadastroProps) {
  const capturarContexto = useContextoUsuario();
  const navigate = useNavigate();
  const [semPermissao, setSemPermissao] = useState(false);
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
  function negarAcesso() { reset(VALORES_INICIAIS); setMostrarSenha(false); setSemPermissao(true); onSemPermissao?.(); }
  usePerdaPermissao(semPermissao ? null : equipes.error, negarAcesso);
  const ocupado = isSubmitting || cadastro.isPending;
  useEffect(() => { onOcupado?.(ocupado); }, [ocupado, onOcupado]);
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
      setError("equipeId", { type: "validate", message: "A equipe selecionada não está mais disponível. Selecione outra ou mantenha sem equipe." });
    }
  }, [instalador, equipes.isSuccess, equipes.isFetching, equipeId, opcoes, setValue, setError]);

  useEffect(() => {
    if (!focoPendente || ocupado) return;
    const frame = requestAnimationFrame(() => {
      setFocus("nome");
      setFocoPendente(false);
    });
    return () => cancelAnimationFrame(frame);
  }, [focoPendente, ocupado, setFocus]);

  async function enviar(dados: CadastroUsuarioDados) {
    if (dados.perfil === "InstaladorCampo" && dados.equipeId !== null &&
        (equipeIndisponivel || !opcoes?.some((equipe) => equipe.id === dados.equipeId))) {
      setError("equipeId", { type: "validate", message: "Confirme uma equipe disponível ou mantenha sem equipe." },
        { shouldFocus: true });
      return;
    }
    const vigente = capturarContexto();
    let erroObsoleto = false;
    try {
      await cadastro.mutateAsync(dados);
      if (!vigente()) { erroObsoleto = true; return; }
      toast.success("Usuário cadastrado com sucesso.");
      if (onConcluido) { onConcluido(); return; }
      reset(VALORES_INICIAIS);
      setMostrarSenha(false);
      setFocoPendente(true);
    } catch (erro) {
      if (!vigente() || erroDaSessaoAnterior(erro)) { erroObsoleto = true; return; }
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
          negarAcesso();
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
      if (!erroObsoleto && vigente()) cadastro.reset();
    }
  }

  async function submeter(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (travaEnvio.current) return;
    travaEnvio.current = true;
    setFocoPendente(false);
    const vigente = capturarContexto();
    try {
      await handleSubmit(enviar)(evento);
    } catch {
      if (!vigente()) return;
      toast.error("Não foi possível confirmar o cadastro. Tente novamente.");
    } finally {
      travaEnvio.current = false;
    }
  }

  if (semPermissao) return <p role="alert" className="p-4 text-destructive">Você não tem permissão para cadastrar usuários.</p>;
  return (
    <form
      noValidate
      onSubmit={(evento) => void submeter(evento)}
      className={cn(
        "w-full",
        emModal ? "p-5" : "mx-auto max-w-xl rounded-xl border border-border-subtle bg-surface p-4 sm:p-6"
      )}
    >
      <fieldset disabled={ocupado} className="min-w-0 space-y-4">
        <legend className="sr-only">Dados do usuário</legend>
        <Input
          id="usuario-nome"
          label="Nome completo"
          placeholder="Ex.: Mariana Costa"
          autoComplete="off"
          className="h-11 py-0"
          required
          {...register("nome")}
          error={errors.nome?.message}
        />
        <Input
          id="usuario-email"
          type="email"
          label="E-mail"
          placeholder="nome@zl.com.br"
          autoComplete="off"
          className="h-11 py-0"
          required
          {...register("email")}
          error={errors.email?.message}
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 items-start">
          <div className="space-y-1.5">
            <label htmlFor="usuario-perfil" className={CLASSE_LABEL}>Perfil de acesso</label>
            <select
              id="usuario-perfil"
              required
              autoComplete="off"
              className={CLASSE_SELECT}
              {...register("perfil")}
              aria-invalid={!!errors.perfil}
              aria-describedby={errors.perfil ? "usuario-perfil-erro" : undefined}
            >
              <option value="">Selecionar perfil</option>
              {NOMES_PERFIS.map(nomePerfil => <option key={nomePerfil} value={nomePerfil}>{ROTULOS_PERFIS[nomePerfil]}</option>)}
            </select>
            {errors.perfil && (
              <p id="usuario-perfil-erro" className="text-xs text-destructive">
                {errors.perfil.message}
              </p>
            )}
          </div>
          <Input
            id="usuario-senha"
            type={mostrarSenha ? "text" : "password"}
            label="Senha inicial"
            placeholder="Mínimo 8 caracteres"
            autoComplete="new-password"
            required
            className="h-11 py-0 pr-14"
            {...register("senha")}
            error={errors.senha?.message}
            acaoDireita={
              <BotaoVisibilidadeSenha
                visivel={mostrarSenha}
                onAlternar={() => setMostrarSenha((visivel) => !visivel)}
                disabled={ocupado}
              />
            }
          />
        </div>
        {instalador && (
          <div className="space-y-1.5">
            <label htmlFor="usuario-equipe" className={CLASSE_LABEL}>Equipe (opcional)</label>
            <select
              id="usuario-equipe"
              autoComplete="off"
              className={CLASSE_SELECT}
              {...register("equipeId")}
              disabled={ocupado}
              aria-invalid={!!errors.equipeId}
              aria-describedby={`usuario-equipe-ajuda${errors.equipeId ? " usuario-equipe-erro" : ""}`}
            >
              <option value="">Sem equipe — vincular depois</option>
              {opcoes?.map((equipe) => (
                <option key={equipe.id} value={equipe.id}>{equipe.nome}</option>
              ))}
            </select>
            <p id="usuario-equipe-ajuda" className="text-xs text-foreground-muted">
              Você pode cadastrar o instalador sem equipe e vinculá-lo ao criar a equipe.
            </p>
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
                descricao="O instalador pode ser cadastrado sem equipe e vinculado depois."
                acao={{ label: "Cadastrar equipe", onClick: () => { void navigate("/equipes"); } }} />
            )}
          </div>
        )}
        <div className="pt-3 border-t border-border-subtle flex items-center justify-end gap-2">
          {onCancelar && (
            <Button type="button" variant="outline" onClick={onCancelar} disabled={ocupado} className="h-10">
              Cancelar
            </Button>
          )}
          <Button type="submit" disabled={ocupado} className="h-10 w-full sm:w-auto" aria-busy={ocupado}>
            {ocupado && <Loader2 className="h-4 w-4 motion-safe:animate-spin" aria-hidden="true" />}
            {ocupado ? "Cadastrando usuário..." : "Cadastrar usuário"}
          </Button>
        </div>
      </fieldset>
    </form>
  );
}
