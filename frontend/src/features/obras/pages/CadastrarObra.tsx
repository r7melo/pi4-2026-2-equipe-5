import { contextoDemonstracao, contextoDemonstracaoVigente } from "@/shared/lib/contextoDemonstracao";
import { useClientes } from "../hooks/useClientes";
import FeedbackLoading from "@/shared/components/feedback/FeedbackLoading";
import FeedbackErro from "@/shared/components/feedback/FeedbackErro";
import { EmptyState } from "@/shared/components/feedback/EmptyState";
import { useState, useEffect, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Save,
  Building2,
  Calendar,
  Zap,
  User,
  ExternalLink,
  FileText,
  Clock,
  Loader2,
  CheckCircle2,
  AlertCircle,
  X,
  MapPin,
} from "lucide-react";
import { PageHeader } from "@/shared/components/ui/PageHeader";
import { Button } from "@/shared/components/ui/Button";
import { Input } from "@/shared/components/ui/Input";
import { toast as sonnerToast } from "sonner";
import {
  novaObraSchema,
  type NovaObraFormData,
  type NovaObraInput,
  type CriarObraPayload,
} from "@/features/obras/types/obrasCadastro";

import { useCriarObra } from "../hooks/useObras";
import {
  capturarSessaoOperacional,
  erroDaSessaoAnterior,
  sessaoOperacionalVigente,
} from "@/shared/lib/sessaoOperacao";

interface ToastState {
  tipo: "sucesso" | "erro";
  mensagem: string;
}

const CATEGORIAS_OBRA = [
  "Residencial",
  "Comercial",
] as const;

export default function CadastrarObra() {
  const navigate = useNavigate();
  const criarObraMutation = useCriarObra();
  const [toast, setToast] = useState<ToastState | null>(null);
  const [redirecionando, setRedirecionando] = useState(false);
  const catalogo = useClientes();
  const listaClientes = catalogo.data ?? [];
  const catalogoAplicado = useRef(false);
  const montadoRef = useRef(true);
  const enviandoRef = useRef(false);
  const timerNavegacaoRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [clienteIdSelecionadoState, setClienteIdSelecionado] = useState<number | null | undefined>(undefined);

  useEffect(() => {
    montadoRef.current = true;
    return () => {
      montadoRef.current = false;
      enviandoRef.current = false;
      if (timerNavegacaoRef.current !== null) {
        clearTimeout(timerNavegacaoRef.current);
        timerNavegacaoRef.current = null;
      }
    };
  }, []);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<NovaObraInput, unknown, NovaObraFormData>({
    resolver: zodResolver(novaObraSchema),
    mode: "onBlur",
    defaultValues: {
      tipoCliente: "existente",
      clienteId: undefined,
      clienteNome: "",
      cidade: "",
      endereco: "",
      cpfCnpj: "",
      telefone: "",
      email: "",
      categoria: "Residencial",
      quantidadePaineis: undefined,
      quantidadeInversores: 1,
      dataInicioEstimada: "",
      dataFimEstimada: "",
      pagamento: {
        prazoContratualDias: 30,
      },
    },
  });

  useEffect(() => {
    const primeiro = catalogo.data?.[0];
    if (!primeiro || catalogoAplicado.current) return;
    catalogoAplicado.current = true;
    setClienteIdSelecionado(primeiro.id);
    setValue("clienteId", primeiro.id);
    setValue("clienteNome", primeiro.nome);
    setValue("cidade", primeiro.cidade);
    setValue("endereco", primeiro.endereco);
  }, [catalogo.data, setValue]);

  const clienteIdSelecionado = clienteIdSelecionadoState === undefined ? catalogo.data?.[0]?.id : clienteIdSelecionadoState ?? undefined;

  const onSubmit = async (dados: NovaObraFormData) => {
    if (enviandoRef.current || redirecionando) return;
    enviandoRef.current = true;
    const origem = contextoDemonstracao();
    const sessao = capturarSessaoOperacional();
    try {
      const dataConfirmacao = dados.dataInicioEstimada || new Date().toISOString().split("T")[0];

      const payload: CriarObraPayload = {
        clienteId: dados.clienteId,
        clienteNome: dados.clienteNome,
        cidade: dados.cidade,
        endereco: dados.endereco?.trim() || "",
        categoria: dados.categoria,
        quantidadePaineis: Number(dados.quantidadePaineis),
        quantidadeInversores: Number(dados.quantidadeInversores ?? 1),
        dataInicioEstimada: dados.dataInicioEstimada,
        dataFimEstimada: dados.dataFimEstimada,
        pagamento: {
          prazoContratualDias: Number(dados.pagamento.prazoContratualDias),
          dataConfirmacao,
        },
      };

      await criarObraMutation.mutateAsync(payload, undefined, sessao);
      if (
        !montadoRef.current ||
        !sessaoOperacionalVigente(sessao) ||
        !contextoDemonstracaoVigente(origem)
      ) {
        enviandoRef.current = false;
        return;
      }

      setRedirecionando(true);
      sonnerToast.success("Obra cadastrada com sucesso!");
      setToast({
        tipo: "sucesso",
        mensagem: "Obra cadastrada com sucesso! Redirecionando para o funil...",
      });

      if (timerNavegacaoRef.current !== null) {
        clearTimeout(timerNavegacaoRef.current);
      }
      // Aguarda breve animação do toast e redireciona para o Kanban
      timerNavegacaoRef.current = setTimeout(() => {
        timerNavegacaoRef.current = null;
        if (
          !montadoRef.current ||
          !sessaoOperacionalVigente(sessao) ||
          !contextoDemonstracaoVigente(origem)
        ) {
          if (montadoRef.current) {
            enviandoRef.current = false;
            setRedirecionando(false);
          }
          return;
        }
        void navigate("/kanban");
      }, 700);
    } catch (erro: unknown) {
      enviandoRef.current = false;
      if (
        !montadoRef.current ||
        !contextoDemonstracaoVigente(origem) ||
        !sessaoOperacionalVigente(sessao) ||
        erroDaSessaoAnterior(erro)
      ) {
        return;
      }
      console.error("Falha ao criar obra:", erro);
      const errObj = erro as { response?: { data?: { error?: { message?: string } } } };
      const mensagem =
        errObj?.response?.data?.error?.message ||
        (erro instanceof Error ? erro.message : "Erro ao cadastrar obra. Tente novamente.");
      setToast({
        tipo: "erro",
        mensagem,
      });
      sonnerToast.error(mensagem);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      {/* Toast flutuante de feedback */}
      {toast && (
        <div
          className={`fixed top-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl border text-sm transition-all duration-300 animate-in fade-in slide-in-from-top-4 ${
            toast.tipo === "sucesso"
              ? "bg-success-light border-success-border text-success"
              : "bg-destructive-light border-destructive-border text-destructive"
          }`}
          role="status"
          aria-live="polite"
        >
          {toast.tipo === "sucesso" ? (
            <CheckCircle2 className="w-5 h-5 text-success shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-destructive shrink-0" />
          )}
          <span className="font-medium">{toast.mensagem}</span>
          <button
            type="button"
            onClick={() => setToast(null)}
            className="p-1 hover:bg-surface-overlay/5 rounded-md transition-colors cursor-pointer"
            aria-label="Fechar notificação"
          >
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
      )}

      {/* Header Reutilizável com Botão Voltar */}
      <PageHeader
        title="Nova Obra"
        subtitle="Cadastrar dados do cliente, dimensionamento e contrato"
        backTo="/kanban"
      />

      {catalogo.isLoading && <FeedbackLoading />}
      {catalogo.isError && <FeedbackErro mensagem={catalogo.error.message} />}
      {catalogo.isSuccess && listaClientes.length === 0 && (
        <EmptyState
          titulo="Nenhum cliente cadastrado"
          descricao="Cadastre o cliente na Gestão de Clientes antes de abrir uma nova obra."
        />
      )}
      {/* Área do Formulário */}
      <section className="flex-1 overflow-y-auto p-4 md:p-8 flex justify-center bg-background-app custom-scrollbar">
        <div className="w-full max-w-3xl bg-surface rounded-2xl border border-border-subtle overflow-hidden h-fit my-auto">
          <form onSubmit={(e) => void handleSubmit(onSubmit)(e)} className="p-6 md:p-8 space-y-8" noValidate>

            {/* Seção: Dados do Cliente */}
            <div>
              <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center justify-between gap-3 mb-5">
                <h3 className="text-base md:text-lg font-bold text-foreground flex items-center gap-2">
                  <User className="w-5 h-5 text-warning" /> Identificação do Cliente
                </h3>

                <Link
                  to="/clientes"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-foreground-secondary bg-surface-subtle hover:bg-surface hover:text-foreground border border-border-subtle transition-colors w-fit"
                >
                  <span>Gerenciar ou cadastrar cliente</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </Link>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 p-5 bg-surface-subtle/80 rounded-2xl border border-border-subtle">
                <div className="md:col-span-2 flex flex-col gap-1.5">
                  <label htmlFor="obra-cliente" className="text-sm font-semibold text-foreground-secondary">
                    Selecione o Cliente <span className="text-destructive">*</span>
                  </label>
                  <select id="obra-cliente" {...register("clienteId", { valueAsNumber: true })}
                    aria-invalid={!!errors.clienteId} aria-describedby={errors.clienteId ? "obra-cliente-erro" : undefined}
                    value={clienteIdSelecionado || ""}
                    onChange={(e) => {
                      const id = Number(e.target.value);
                      const idValido = Number.isFinite(id) && id > 0 ? id : undefined;
                      setClienteIdSelecionado(idValido ?? null);
                      setValue("clienteId", idValido, { shouldValidate: true });
                      const c = listaClientes.find((item) => item.id === idValido);
                      if (c) {
                        setValue("clienteNome", c.nome, { shouldValidate: true });
                        setValue("cidade", c.cidade, { shouldValidate: true });
                        setValue("endereco", c.endereco, { shouldValidate: true });
                      }
                    }}
                    className="w-full text-sm px-3.5 py-2.5 bg-surface border border-border-subtle rounded-xl text-foreground font-medium focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-warning-border cursor-pointer transition-colors"
                  >
                    <option value="">Selecione um cliente</option>
                    {listaClientes.map((c) => (
                      <option key={c.id} value={c.id} className="bg-surface text-foreground">
                        {c.nome} — {c.cidade}
                      </option>
                    ))}
                  </select>

                  {errors.clienteId?.message && (
                    <p id="obra-cliente-erro" className="text-xs text-destructive font-medium mt-1">{errors.clienteId.message}</p>
                  )}
                </div>

                <div className="md:col-span-2">
                  <Input
                    label="Nome / Razão Social"
                    required
                    icon={<User className="w-4 h-4" />}
                    readOnly
                    className="bg-surface-subtle cursor-not-allowed text-muted-foreground"
                    error={errors.clienteNome?.message}
                    {...register("clienteNome")}
                  />
                </div>
                <div>
                  <Input
                    label="Cidade"
                    required
                    icon={<Building2 className="w-4 h-4" />}
                    readOnly
                    className="bg-surface-subtle cursor-not-allowed text-muted-foreground"
                    error={errors.cidade?.message}
                    {...register("cidade")}
                  />
                </div>
                <div>
                  <Input
                    label="Endereço Padrão"
                    required
                    icon={<MapPin className="w-4 h-4" />}
                    readOnly
                    className="bg-surface-subtle cursor-not-allowed text-muted-foreground"
                    error={errors.endereco?.message}
                    {...register("endereco")}
                  />
                </div>
              </div>
            </div>

            <hr className="border-border-subtle" />

            {/* Seção: Dimensionamento e Categoria */}
            <div>
              <h3 className="text-base md:text-lg font-bold text-foreground mb-4 flex items-center gap-2">
                <Zap className="w-5 h-5 text-warning" /> Dimensionamento e Categoria
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="obra-categoria" className="text-sm font-semibold text-foreground-secondary">
                    Categoria da Obra <span className="text-destructive">*</span>
                  </label>
                  <select id="obra-categoria" aria-invalid={!!errors.categoria} aria-describedby={errors.categoria ? "obra-categoria-erro" : undefined}
                    {...register("categoria")}
                    className="w-full text-sm px-3.5 py-2.5 bg-surface border border-border-subtle rounded-xl text-foreground font-medium focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-warning-border cursor-pointer transition-colors"
                  >
                    {CATEGORIAS_OBRA.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                  {errors.categoria && <p id="obra-categoria-erro" className="text-xs text-destructive">{errors.categoria.message}</p>}
                </div>
                <div>
                  <Input
                    label="Quantidade de Painéis"
                    type="number"
                    placeholder="Ex: 45"
                    min={1}
                    required
                    icon={<Zap className="w-4 h-4" />}
                    error={errors.quantidadePaineis?.message}
                    {...register("quantidadePaineis")}
                  />
                </div>
                <div>
                  <Input
                    label="Inversores"
                    type="number"
                    placeholder="Ex: 1"
                    min={0}
                    required
                    icon={<Zap className="w-4 h-4" />}
                    error={errors.quantidadeInversores?.message}
                    {...register("quantidadeInversores")}
                  />
                </div>
              </div>
            </div>

            <hr className="border-border-subtle" />

            {/* Seção: Contrato e Prazos */}
            <div>
              <h3 className="text-base md:text-lg font-bold text-foreground mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5 text-muted-foreground" /> Contrato e Cronograma Estimado
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div>
                  <Input
                    label="Data de Início Estimada"
                    type="date"
                    required
                    icon={<Calendar className="w-4 h-4" />}
                    error={errors.dataInicioEstimada?.message}
                    {...register("dataInicioEstimada")}
                  />
                </div>
                <div>
                  <Input
                    label="Data de Término Estimada"
                    type="date"
                    required
                    icon={<Calendar className="w-4 h-4" />}
                    error={errors.dataFimEstimada?.message}
                    {...register("dataFimEstimada")}
                  />
                </div>
                <div>
                  <Input
                    label="Prazo Contratual (Dias)"
                    type="number"
                    placeholder="Ex: 30"
                    min={1}
                    required
                    icon={<Clock className="w-4 h-4" />}
                    error={errors.pagamento?.prazoContratualDias?.message}
                    {...register("pagamento.prazoContratualDias")}
                  />
                </div>
              </div>
            </div>

            {/* Ações */}
            <div className="pt-4 flex flex-col-reverse sm:flex-row justify-end gap-3 border-t border-border-subtle">
              <Button
                type="button"
                variant="ghost"
                onClick={() => void navigate("/kanban")}
                disabled={isSubmitting || redirecionando}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                variant="primary"
                disabled={isSubmitting || redirecionando || catalogo.isLoading || catalogo.isError || listaClientes.length === 0}
                className="min-w-36"
              >
                {isSubmitting || redirecionando ? (
                  <>
                    <Loader2 className="w-4 h-4 motion-safe:animate-spin" />
                    <span>Cadastrando...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>Salvar Obra</span>
                  </>
                )}
              </Button>
            </div>
          </form>
        </div>
      </section>
    </div>
  );
}