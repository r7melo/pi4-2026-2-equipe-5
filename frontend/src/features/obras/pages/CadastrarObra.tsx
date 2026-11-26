import { contextoDemonstracao, contextoDemonstracaoVigente } from "@/shared/lib/contextoDemonstracao";
import { useClientes } from "../hooks/useClientes";
import FeedbackLoading from "@/shared/components/feedback/FeedbackLoading";
import FeedbackErro from "@/shared/components/feedback/FeedbackErro";
import { EmptyState } from "@/shared/components/feedback/EmptyState";
import { useState, useEffect, useId, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Save,
  Building2,
  ExternalLink,
  Loader2,
} from "lucide-react";
import { PageHeader } from "@/shared/components/ui/PageHeader";
import { Button } from "@/shared/components/ui/Button";
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

const CATEGORIAS_OBRA = [
  "Residencial",
  "Comercial",
] as const;

const CLASSE_CONTROLE_OBRA =
  "w-full h-11 rounded-lg border border-border-strong bg-surface-subtle focus:bg-surface px-3 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:border-info focus-visible:ring-2 focus-visible:ring-info/25 disabled:opacity-50 transition-colors";

const CLASSE_CONTROLE_PAINEL =
  "w-full h-11 rounded-lg border border-border-strong bg-surface px-3 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:border-info focus-visible:ring-2 focus-visible:ring-info/25 disabled:opacity-50 transition-colors";

export default function CadastrarObra() {
  const navigate = useNavigate();
  const criarObraMutation = useCriarObra();
  const [redirecionando, setRedirecionando] = useState(false);
  const baseId = useId();
  const clienteSelectId = `${baseId}-cliente`;
  const clienteNomeId = `${baseId}-cliente-nome`;
  const cidadeId = `${baseId}-cidade`;
  const enderecoId = `${baseId}-endereco`;
  const categoriaId = `${baseId}-categoria`;
  const paineisId = `${baseId}-paineis`;
  const inversoresId = `${baseId}-inversores`;
  const descricaoId = `${baseId}-descricao`;
  const inicioId = `${baseId}-inicio`;
  const fimId = `${baseId}-fim`;
  const prazoId = `${baseId}-prazo`;
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
    setError,
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
      descricao: "",
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
    setValue("cidade", primeiro.cidade ?? "");
    setValue("endereco", primeiro.endereco ?? "");
  }, [catalogo.data, setValue]);

  const clienteIdSelecionado = clienteIdSelecionadoState === undefined ? catalogo.data?.[0]?.id : clienteIdSelecionadoState ?? undefined;

  const onSubmit = async (dados: NovaObraFormData) => {
    if (!dados.endereco?.trim()) {
      setError("endereco", {
        type: "manual",
        message: "Informe o endereço da obra",
      });
      return;
    }
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
        descricao: dados.descricao?.trim() || undefined,
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
      sonnerToast.error(mensagem);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      {/* Header Reutilizável com Botão Voltar */}
      <PageHeader
        title="Nova Obra"
        subtitle="Cadastrar dados do cliente, dimensionamento e contrato"
        backTo="/kanban"
      />

      {catalogo.isLoading ? (
        <FeedbackLoading mensagem="Carregando clientes cadastrados..." />
      ) : catalogo.isError ? (
        <FeedbackErro
          mensagem={
            catalogo.error instanceof Error
              ? catalogo.error.message
              : "Não foi possível carregar os clientes cadastrados."
          }
          onTentarNovamente={() => void catalogo.refetch()}
        />
      ) : listaClientes.length === 0 ? (
        <EmptyState
          icone={Building2}
          titulo="Nenhum cliente cadastrado"
          descricao="Cadastre o cliente na Gestão de Clientes antes de abrir uma nova obra."
          acao={{
            label: "Cadastrar primeiro cliente",
            onClick: () => void navigate("/clientes"),
          }}
        />
      ) : (
        <section className="flex-1 overflow-y-auto p-3 sm:p-6 flex justify-center bg-background-app custom-scrollbar">
          <div className="w-full max-w-3xl bg-surface rounded-xl border border-border-subtle overflow-hidden h-fit">
            <form onSubmit={(e) => void handleSubmit(onSubmit)(e)} className="p-4 sm:p-6 space-y-6" noValidate>

              {/* 1. Identificação do Cliente */}
              <section className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-border-subtle">
                  <h2 className="text-sm font-semibold text-foreground">
                    1. Identificação do Cliente
                  </h2>

                  <Link
                    to="/clientes"
                    className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-md border border-border-subtle bg-surface-subtle hover:bg-muted text-xs font-medium text-foreground-secondary hover:text-foreground transition-colors w-fit"
                  >
                    <span>Gerenciar ou cadastrar cliente</span>
                    <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
                  </Link>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 rounded-xl border border-border-subtle bg-surface-subtle p-4">
                  <div className="md:col-span-2 space-y-1.5">
                    <label htmlFor={clienteSelectId} className="text-xs font-medium text-foreground-secondary block">
                      Selecione o Cliente <span aria-hidden="true" className="text-destructive">*</span>
                    </label>
                    <select
                      id={clienteSelectId}
                      {...register("clienteId", { valueAsNumber: true })}
                      aria-invalid={!!errors.clienteId}
                      aria-describedby={errors.clienteId ? `${clienteSelectId}-erro` : undefined}
                      value={clienteIdSelecionado || ""}
                      onChange={(e) => {
                        const id = Number(e.target.value);
                        const idValido = Number.isFinite(id) && id > 0 ? id : undefined;
                        setClienteIdSelecionado(idValido ?? null);
                        setValue("clienteId", idValido, { shouldValidate: true });
                        const c = listaClientes.find((item) => item.id === idValido);
                        if (c) {
                          setValue("clienteNome", c.nome, { shouldValidate: true });
                          setValue("cidade", c.cidade ?? "", { shouldValidate: true });
                          setValue("endereco", c.endereco ?? "", { shouldValidate: true });
                          clearErrors(["cidade", "endereco"]);
                        }
                      }}
                      className={`${CLASSE_CONTROLE_PAINEL} cursor-pointer`}
                    >
                      <option value="">Selecione um cliente</option>
                      {listaClientes.map((c) => (
                        <option key={c.id} value={c.id} className="bg-surface text-foreground">
                          {c.cidade ? `${c.nome} — ${c.cidade}` : c.nome}
                        </option>
                      ))}
                    </select>
                    {errors.clienteId?.message && (
                      <p id={`${clienteSelectId}-erro`} className="text-xs text-destructive font-medium">
                        {errors.clienteId.message}
                      </p>
                    )}
                  </div>

                  <div className="md:col-span-2 space-y-1.5">
                    <label htmlFor={clienteNomeId} className="text-xs font-medium text-foreground-secondary block">
                      Nome / Razão Social <span aria-hidden="true" className="text-destructive">*</span>
                    </label>
                    <input
                      id={clienteNomeId}
                      type="text"
                      required
                      readOnly
                      aria-invalid={!!errors.clienteNome}
                      aria-describedby={errors.clienteNome ? `${clienteNomeId}-erro` : undefined}
                      className="w-full h-11 rounded-lg border border-border-subtle bg-muted px-3 text-sm text-muted-foreground cursor-not-allowed"
                      {...register("clienteNome")}
                    />
                    {errors.clienteNome?.message && (
                      <p id={`${clienteNomeId}-erro`} className="text-xs text-destructive font-medium">
                        {errors.clienteNome.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor={cidadeId} className="text-xs font-medium text-foreground-secondary block">
                      Cidade
                    </label>
                    <input
                      id={cidadeId}
                      type="text"
                      placeholder="Ex: Campinas / SP"
                      aria-invalid={!!errors.cidade}
                      aria-describedby={errors.cidade ? `${cidadeId}-erro` : undefined}
                      className={CLASSE_CONTROLE_PAINEL}
                      {...register("cidade")}
                    />
                    {errors.cidade?.message && (
                      <p id={`${cidadeId}-erro`} className="text-xs text-destructive font-medium">
                        {errors.cidade.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor={enderecoId} className="text-xs font-medium text-foreground-secondary block">
                      Endereço da Obra <span aria-hidden="true" className="text-destructive">*</span>
                    </label>
                    <input
                      id={enderecoId}
                      type="text"
                      required
                      placeholder="Rua, número, bairro..."
                      aria-invalid={!!errors.endereco}
                      aria-describedby={errors.endereco ? `${enderecoId}-erro` : undefined}
                      className={CLASSE_CONTROLE_PAINEL}
                      {...register("endereco")}
                    />
                    {errors.endereco?.message && (
                      <p id={`${enderecoId}-erro`} className="text-xs text-destructive font-medium">
                        {errors.endereco.message}
                      </p>
                    )}
                  </div>
                </div>
              </section>

              {/* 2. Dimensionamento e Categoria */}
              <section className="pt-4 border-t border-border-subtle space-y-4">
                <h2 className="text-sm font-semibold text-foreground">
                  2. Dimensionamento e Categoria
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                  <div className="space-y-1.5">
                    <label htmlFor={categoriaId} className="text-xs font-medium text-foreground-secondary block">
                      Categoria da Obra <span aria-hidden="true" className="text-destructive">*</span>
                    </label>
                    <select
                      id={categoriaId}
                      aria-invalid={!!errors.categoria}
                      aria-describedby={errors.categoria ? `${categoriaId}-erro` : undefined}
                      {...register("categoria")}
                      className={`${CLASSE_CONTROLE_OBRA} cursor-pointer`}
                    >
                      {CATEGORIAS_OBRA.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                    {errors.categoria?.message && (
                      <p id={`${categoriaId}-erro`} className="text-xs text-destructive font-medium">
                        {errors.categoria.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor={paineisId} className="text-xs font-medium text-foreground-secondary block">
                      Quantidade de Painéis <span aria-hidden="true" className="text-destructive">*</span>
                    </label>
                    <input
                      id={paineisId}
                      type="number"
                      placeholder="Ex: 45"
                      min={1}
                      required
                      aria-invalid={!!errors.quantidadePaineis}
                      aria-describedby={errors.quantidadePaineis ? `${paineisId}-erro` : undefined}
                      className={`${CLASSE_CONTROLE_OBRA} font-mono tabular-nums`}
                      {...register("quantidadePaineis")}
                    />
                    {errors.quantidadePaineis?.message && (
                      <p id={`${paineisId}-erro`} className="text-xs text-destructive font-medium">
                        {errors.quantidadePaineis.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor={inversoresId} className="text-xs font-medium text-foreground-secondary block">
                      Inversores
                    </label>
                    <input
                      id={inversoresId}
                      type="number"
                      placeholder="Ex: 1"
                      min={0}
                      aria-invalid={!!errors.quantidadeInversores}
                      aria-describedby={errors.quantidadeInversores ? `${inversoresId}-erro` : undefined}
                      className={`${CLASSE_CONTROLE_OBRA} font-mono tabular-nums`}
                      {...register("quantidadeInversores")}
                    />
                    {errors.quantidadeInversores?.message && (
                      <p id={`${inversoresId}-erro`} className="text-xs text-destructive font-medium">
                        {errors.quantidadeInversores.message}
                      </p>
                    )}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label htmlFor={descricaoId} className="text-xs font-medium text-foreground-secondary block">
                    Descrição / Observações da obra
                  </label>
                  <textarea
                    id={descricaoId}
                    rows={2}
                    placeholder="Tipo de telhado, padrão elétrico ou restrições de acesso..."
                    className="w-full rounded-lg border border-border-strong bg-surface-subtle focus:bg-surface px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:border-info focus-visible:ring-2 focus-visible:ring-info/25 transition-colors"
                    {...register("descricao")}
                  />
                </div>
              </section>

              {/* 3. Contrato e Cronograma Estimado */}
              <section className="pt-4 border-t border-border-subtle space-y-4">
                <h2 className="text-sm font-semibold text-foreground">
                  3. Contrato e Cronograma Estimado
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                  <div className="space-y-1.5">
                    <label htmlFor={inicioId} className="text-xs font-medium text-foreground-secondary block">
                      Data de Início Estimada <span aria-hidden="true" className="text-destructive">*</span>
                    </label>
                    <input
                      id={inicioId}
                      type="date"
                      required
                      aria-invalid={!!errors.dataInicioEstimada}
                      aria-describedby={errors.dataInicioEstimada ? `${inicioId}-erro` : undefined}
                      className={`${CLASSE_CONTROLE_OBRA} font-mono tabular-nums`}
                      {...register("dataInicioEstimada")}
                    />
                    {errors.dataInicioEstimada?.message && (
                      <p id={`${inicioId}-erro`} className="text-xs text-destructive font-medium">
                        {errors.dataInicioEstimada.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor={fimId} className="text-xs font-medium text-foreground-secondary block">
                      Data de Término Estimada <span aria-hidden="true" className="text-destructive">*</span>
                    </label>
                    <input
                      id={fimId}
                      type="date"
                      required
                      aria-invalid={!!errors.dataFimEstimada}
                      aria-describedby={errors.dataFimEstimada ? `${fimId}-erro` : undefined}
                      className={`${CLASSE_CONTROLE_OBRA} font-mono tabular-nums`}
                      {...register("dataFimEstimada")}
                    />
                    {errors.dataFimEstimada?.message && (
                      <p id={`${fimId}-erro`} className="text-xs text-destructive font-medium">
                        {errors.dataFimEstimada.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor={prazoId} className="text-xs font-medium text-foreground-secondary block">
                      Prazo Contratual (Dias) <span aria-hidden="true" className="text-destructive">*</span>
                    </label>
                    <input
                      id={prazoId}
                      type="number"
                      placeholder="Ex: 30"
                      min={1}
                      required
                      aria-invalid={!!errors.pagamento?.prazoContratualDias}
                      aria-describedby={errors.pagamento?.prazoContratualDias ? `${prazoId}-erro` : undefined}
                      className={`${CLASSE_CONTROLE_OBRA} font-mono tabular-nums`}
                      {...register("pagamento.prazoContratualDias")}
                    />
                    {errors.pagamento?.prazoContratualDias?.message && (
                      <p id={`${prazoId}-erro`} className="text-xs text-destructive font-medium">
                        {errors.pagamento.prazoContratualDias.message}
                      </p>
                    )}
                  </div>
                </div>
              </section>

              {/* Ações */}
              <div className="pt-4 border-t border-border-subtle flex flex-col-reverse sm:flex-row justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
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
      )}
    </div>
  );
}