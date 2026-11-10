import { contextoDemonstracao, contextoDemonstracaoVigente } from "@/shared/lib/contextoDemonstracao";
import { useClientes } from "../hooks/useClientes";
import FeedbackLoading from "@/shared/components/feedback/FeedbackLoading";
import FeedbackErro from "@/shared/components/feedback/FeedbackErro";
import { EmptyState } from "@/shared/components/feedback/EmptyState";
import { erroDaSessaoAnterior } from "@/shared/lib/sessaoOperacao";
// Cadastro de novas obras com suporte a cliente existente e novo cliente
import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Save,
  Building2,
  Calendar,
  Zap,
  User,
  UserCheck,
  UserPlus,
  FileText,
  Clock,
  Loader2,
  CheckCircle2,
  AlertCircle,
  X,
  CreditCard,
  MapPin,
  Phone,
  Mail,
} from "lucide-react";
import { PageHeader } from "@/shared/components/ui/PageHeader";
import { Button } from "@/shared/components/ui/Button";
import { Input } from "@/shared/components/ui/Input";
import { useQueryClient } from "@tanstack/react-query";
import { toast as sonnerToast } from "sonner";
import {
  novaObraSchema,
  type NovaObraFormData,
  type NovaObraInput,
  type CriarObraPayload,
  type ListaObras,
} from "@/types";

import { criarObra } from "@/features/obras/services/obras";
import { formatarCpfCnpj, formatarTelefone } from "@/shared/lib/validacoesDocumento";

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
  const queryClient = useQueryClient();
  const [toast, setToast] = useState<ToastState | null>(null);
  const [tipoCliente, setTipoCliente] = useState<"existente" | "novo">("existente");
  const catalogo = useClientes();
  const listaClientes = catalogo.data ?? [];
  const catalogoAplicado = useRef(false);
  const [clienteIdSelecionadoState, setClienteIdSelecionado] = useState<number | undefined>(undefined);

  const {
    register,
    handleSubmit,
    setValue,
    control,
    clearErrors,
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
    if (!primeiro || catalogoAplicado.current || tipoCliente !== "existente") return;
    catalogoAplicado.current = true;
    setClienteIdSelecionado(primeiro.id);
    setValue("clienteId", primeiro.id);
    setValue("clienteNome", primeiro.nome);
    setValue("cidade", primeiro.cidade);
    setValue("endereco", primeiro.endereco);
  }, [catalogo.data, tipoCliente, setValue]);

  const clienteIdSelecionado = clienteIdSelecionadoState ?? catalogo.data?.[0]?.id;

  const cpfCnpjValue = useWatch({ control, name: "cpfCnpj" });
  const telefoneValue = useWatch({ control, name: "telefone" });

  const handleMudarTipoCliente = (novoTipo: "existente" | "novo") => {
    setTipoCliente(novoTipo);
    setValue("tipoCliente", novoTipo);
    clearErrors();

    if (novoTipo === "existente") {
      const clientePadrao = listaClientes.find((c) => c.id === clienteIdSelecionado) || listaClientes[0];
      if (!clientePadrao) return;
      setClienteIdSelecionado(clientePadrao.id);
      setValue("clienteId", clientePadrao.id);
      setValue("clienteNome", clientePadrao.nome);
      setValue("cidade", clientePadrao.cidade);
      setValue("endereco", clientePadrao.endereco);
    } else {
      setValue("clienteId", undefined);
      setValue("clienteNome", "");
      setValue("cidade", "");
      setValue("endereco", "");
      setValue("cpfCnpj", "");
      setValue("telefone", "");
      setValue("email", "");
    }
  };

  const onSubmit = async (dados: NovaObraFormData) => {
    const origem = contextoDemonstracao();
    try {
      const dataConfirmacao = dados.dataInicioEstimada || new Date().toISOString().split("T")[0];

      let payload: CriarObraPayload;

      if (dados.tipoCliente === "existente") {
        payload = {
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
      } else {
        payload = {
          cliente: {
            nome: dados.clienteNome!.trim(),
            cpfCnpj: dados.cpfCnpj!.replace(/\D/g, ""),
            cidade: dados.cidade?.trim(),
            endereco: dados.endereco?.trim(),
            telefone: dados.telefone?.trim() || undefined,
            email: dados.email?.trim() || undefined,
          },
          categoria: dados.categoria,
          quantidadePaineis: Number(dados.quantidadePaineis),
          quantidadeInversores: Number(dados.quantidadeInversores ?? 1),
          endereco: dados.endereco!.trim(),
          dataInicioEstimada: dados.dataInicioEstimada,
          dataFimEstimada: dados.dataFimEstimada,
          pagamento: {
            prazoContratualDias: Number(dados.pagamento.prazoContratualDias),
            dataConfirmacao,
          },
        };
      }

      const novaObra = await criarObra(payload);
      if (!contextoDemonstracaoVigente(origem)) return;

      void queryClient.invalidateQueries({ queryKey: ["clientes"] });
      // Atualiza o cache do React Query imediatamente e agenda revalidação
      queryClient.setQueryData<ListaObras>(["obras"], (old) => {
        if (!old) return old;
        return {
          ...old,
          total: old.total + 1,
          itens: [novaObra, ...old.itens],
        };
      });
      void queryClient.invalidateQueries({ queryKey: ["obras"] });

      sonnerToast.success("Obra cadastrada com sucesso!");
      setToast({
        tipo: "sucesso",
        mensagem: "Obra cadastrada com sucesso! Redirecionando para o funil...",
      });

      // Aguarda breve animação do toast e redireciona para o Kanban
      setTimeout(() => {
        if (contextoDemonstracaoVigente(origem)) void navigate("/kanban");
      }, 700);
    } catch (erro: unknown) {
      if (!contextoDemonstracaoVigente(origem) || erroDaSessaoAnterior(erro)) return;
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
            className="p-1 hover:bg-black/5 rounded-md transition-colors cursor-pointer"
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
      {catalogo.isSuccess && tipoCliente === "existente" && listaClientes.length === 0 && (
        <EmptyState titulo="Nenhum cliente cadastrado" descricao="Cadastre um novo cliente junto com a obra." />
      )}
      {/* Área do Formulário */}
      <main className="flex-1 overflow-y-auto p-4 md:p-8 flex justify-center bg-background-app custom-scrollbar">
        <div className="w-full max-w-3xl bg-surface rounded-2xl border border-border-subtle overflow-hidden h-fit my-auto">
          <form onSubmit={(e) => void handleSubmit(onSubmit)(e)} className="p-6 md:p-8 space-y-8" noValidate>

            {/* Seção: Dados do Cliente com Alternador */}
            <div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
                <h3 className="text-base md:text-lg font-bold text-foreground flex items-center gap-2">
                  <User className="w-5 h-5 text-amber-500" /> Identificação do Cliente
                </h3>

                {/* Alternador Visual (Tabs) */}
                <div className="flex items-center p-1 bg-surface-subtle rounded-xl w-fit border border-border-subtle">
                  <button
                    type="button"
                    onClick={() => handleMudarTipoCliente("existente")}
                    className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      tipoCliente === "existente"
                        ? "bg-surface text-foreground border border-border-subtle"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <UserCheck className="w-4 h-4" />
                    <span>Cliente Cadastrado</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleMudarTipoCliente("novo")}
                    className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      tipoCliente === "novo"
                        ? "bg-surface text-foreground border border-border-subtle"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <UserPlus className="w-4 h-4" />
                    <span>Novo Cliente</span>
                  </button>
                </div>
              </div>

              {/* Modo: Cliente Existente */}
              {tipoCliente === "existente" ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 p-5 bg-surface-subtle/80 rounded-2xl border border-border-subtle">
                  <div className="md:col-span-2 flex flex-col gap-1.5">
                    <label className="text-sm font-semibold text-foreground-secondary">
                      Selecione o Cliente <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={clienteIdSelecionado || ""}
                      onChange={(e) => {
                        const id = Number(e.target.value);
                        const idValido = Number.isFinite(id) && id > 0 ? id : undefined;
                        setClienteIdSelecionado(idValido);
                        setValue("clienteId", idValido, { shouldValidate: true });
                        const c = listaClientes.find((item) => item.id === idValido);
                        if (c) {
                          setValue("clienteNome", c.nome, { shouldValidate: true });
                          setValue("cidade", c.cidade, { shouldValidate: true });
                          setValue("endereco", c.endereco, { shouldValidate: true });
                        }
                      }}
                      className="w-full text-sm px-3.5 py-2.5 bg-surface border border-border-subtle rounded-xl text-foreground font-medium focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 cursor-pointer transition-colors"
                    >
                      {listaClientes.map((c) => (
                        <option key={c.id} value={c.id} className="bg-surface text-foreground">
                          {c.nome} — {c.cidade}
                        </option>
                      ))}
                    </select>

                    {errors.clienteId?.message && (
                      <p className="text-xs text-red-600 font-medium mt-1">{errors.clienteId.message}</p>
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
              ) : (
                /* Modo: Novo Cliente */
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 p-5 bg-surface-subtle/80 rounded-2xl border border-border-subtle">
                  <div className="md:col-span-2">
                    <Input
                      label="Nome Completo ou Razão Social"
                      placeholder="Ex: João da Silva ou Solartech Comércio Ltda"
                      required
                      icon={<User className="w-4 h-4" />}
                      error={errors.clienteNome?.message}
                      {...register("clienteNome")}
                    />
                  </div>
                  <div>
                    <Input
                      label="CPF ou CNPJ"
                      placeholder="000.000.000-00 ou 00.000.000/0000-00"
                      required
                      icon={<CreditCard className="w-4 h-4" />}
                      value={cpfCnpjValue || ""}
                      onChange={(e) => {
                        const formatado = formatarCpfCnpj(e.target.value);
                        setValue("cpfCnpj", formatado, { shouldValidate: true });
                      }}
                      error={errors.cpfCnpj?.message}
                    />
                  </div>
                  <div>
                    <Input
                      label="Cidade"
                      placeholder="Ex: Campinas"
                      required
                      icon={<Building2 className="w-4 h-4" />}
                      error={errors.cidade?.message}
                      {...register("cidade")}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <Input
                      label="Endereço da Instalação"
                      placeholder="Ex: Av. Paulista, 1000 - Bela Vista"
                      required
                      icon={<MapPin className="w-4 h-4" />}
                      error={errors.endereco?.message}
                      {...register("endereco")}
                    />
                  </div>
                  <div>
                    <Input
                      label="Telefone / WhatsApp"
                      placeholder="(99) 99999-9999"
                      icon={<Phone className="w-4 h-4" />}
                      value={telefoneValue || ""}
                      onChange={(e) => {
                        const formatado = formatarTelefone(e.target.value);
                        setValue("telefone", formatado, { shouldValidate: true });
                      }}
                      error={errors.telefone?.message}
                    />
                  </div>

                  <div>
                    <Input
                      label="E-mail de Contato"
                      type="email"
                      placeholder="contato@cliente.com.br"
                      icon={<Mail className="w-4 h-4" />}
                      error={errors.email?.message}
                      {...register("email")}
                    />
                  </div>
                </div>
              )}
            </div>

            <hr className="border-border-subtle" />

            {/* Seção: Dimensionamento e Categoria */}
            <div>
              <h3 className="text-base md:text-lg font-bold text-foreground mb-4 flex items-center gap-2">
                <Zap className="w-5 h-5 text-amber-500" /> Dimensionamento e Categoria
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-semibold text-foreground-secondary">
                    Categoria da Obra <span className="text-red-500">*</span>
                  </label>
                  <select
                    {...register("categoria")}
                    className="w-full text-sm px-3.5 py-2.5 bg-surface border border-border-subtle rounded-xl text-foreground font-medium focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 cursor-pointer transition-colors"
                  >
                    {CATEGORIAS_OBRA.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
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
                disabled={isSubmitting}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                variant="primary"
                disabled={isSubmitting || (tipoCliente === "existente" && (catalogo.isLoading || catalogo.isError))}
                className="min-w-36"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
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
      </main>
    </div>
  );
}