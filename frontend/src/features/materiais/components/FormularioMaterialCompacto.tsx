import { useId, useLayoutEffect, useMemo, useRef, type FormEvent } from "react";
import type { Material, StatusLogistico } from "@/shared/types/materiais";
import type { Produto } from "@/shared/types/produtos";
import { STATUS_LOGISTICO_OPCOES, obterMetaStatusLogistico } from "@/shared/constants/statusLogistico";
import { formatarMoeda } from "@/shared/lib/formatters";
import { AlertBanner } from "@/shared/components/ui/AlertBanner";
import { ComboboxPesquisavel, type OpcaoCombobox } from "@/shared/components/ui/ComboboxPesquisavel";
import type {
  CampoValidacaoMaterial,
  FalhaValidacaoMaterial,
  ValidadeInputMaterial,
} from "../lib/validacaoMaterial";

const LISTA_PRODUTOS_VAZIA: Produto[] = [];

interface FormularioMaterialCompactoProps {
  itemEmEdicao: Material | null;
  podeAlterarStatus: boolean;
  podeVerValores?: boolean;
  produtosCatalogo?: Produto[];
  carregandoCatalogo?: boolean;
  formProdutoId?: number | null;
  onFormProdutoIdChange?: (produtoId: number | null, produto?: Produto) => void;
  formTipo: string;
  onFormTipoChange: (valor: string) => void;
  formQuantidade: string;
  onFormQuantidadeChange: (valor: string) => void;
  formStatus: StatusLogistico;
  onFormStatusChange: (valor: StatusLogistico) => void;
  salvando: boolean;
  falha: FalhaValidacaoMaterial | null;
  onLimparFalhaCampo: (campo: CampoValidacaoMaterial) => void;
  onSubmeter: (validadeQuantidade?: ValidadeInputMaterial) => void;
  onCancelar: () => void;
}

export function FormularioMaterialCompacto({
  itemEmEdicao,
  podeAlterarStatus,
  podeVerValores = false,
  produtosCatalogo = LISTA_PRODUTOS_VAZIA,
  carregandoCatalogo = false,
  formProdutoId = null,
  onFormProdutoIdChange,
  formTipo,
  onFormTipoChange,
  formQuantidade,
  onFormQuantidadeChange,
  formStatus,
  onFormStatusChange,
  salvando,
  falha,
  onLimparFalhaCampo,
  onSubmeter,
  onCancelar,
}: FormularioMaterialCompactoProps) {
  const produtoRef = useRef<HTMLInputElement>(null);
  const tipoRef = useRef<HTMLInputElement>(null);
  const quantidadeRef = useRef<HTMLInputElement>(null);
  const erroId = useId();
  const usarSelecaoCatalogo = Boolean(onFormProdutoIdChange);

  const produtoSelecionado = useMemo(
    () => (formProdutoId ? produtosCatalogo.find((p) => p.id === formProdutoId) ?? null : null),
    [formProdutoId, produtosCatalogo]
  );

  const opcoesCatalogo: OpcaoCombobox[] = useMemo(
    () =>
      produtosCatalogo.map((prod) => ({
        valor: String(prod.id),
        rotulo: prod.nome,
        subtitulo: `${prod.tipo ? `${prod.tipo} · ` : ""}Unidade: ${prod.unidade}${
          podeVerValores && typeof prod.precoUnitario === "number"
            ? ` · ${formatarMoeda(prod.precoUnitario)}`
            : ""
        }`,
        textoBusca: [prod.nome, prod.tipo, prod.unidade].filter(Boolean).join(" "),
      })),
    [podeVerValores, produtosCatalogo]
  );

  useLayoutEffect(() => {
    if (!falha) return;
    if (falha.campo === "produtoId") produtoRef.current?.focus();
    else if (falha.campo === "tipo") (tipoRef.current ?? produtoRef.current)?.focus();
    else quantidadeRef.current?.focus();
  }, [falha]);

  const handleFormSubmit = (e: FormEvent) => {
    e.preventDefault();
    const inputQtd = quantidadeRef.current;
    onSubmeter(
      inputQtd
        ? {
            valid: inputQtd.validity.valid,
            badInput: inputQtd.validity.badInput,
            validationMessage: inputQtd.validationMessage,
          }
        : undefined
    );
  };

  return (
    <form
      noValidate
      onSubmit={handleFormSubmit}
      className="bg-surface-subtle border border-border-subtle rounded-lg p-3 mb-3 flex flex-col gap-2.5"
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-foreground">
          {itemEmEdicao ? "Alterar Insumo" : "Adicionar do Catálogo de Produtos"}
        </span>
        <button
          type="button"
          onClick={onCancelar}
          className="controle-compacto h-7 px-2 rounded text-muted-foreground hover:text-foreground hover:bg-muted text-xs cursor-pointer"
        >
          Cancelar
        </button>
      </div>

      {falha && (
        <AlertBanner
          id={erroId}
          variante="destructive"
          className="rounded-md px-2.5 py-1.5 font-medium"
        >
          {falha.mensagem}
        </AlertBanner>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        {usarSelecaoCatalogo ? (
          <div className="sm:col-span-2 flex flex-col gap-1">
            <label htmlFor="formProdutoSelect" className="text-[11px] font-semibold text-muted-foreground">
              Produto do catálogo *
            </label>
            <ComboboxPesquisavel
              id="formProdutoSelect"
              inputRef={produtoRef}
              compacto
              listboxAriaLabel="Produtos do catálogo"
              ariaInvalid={falha?.campo === "produtoId" || falha?.campo === "tipo" || undefined}
              ariaDescribedBy={falha?.campo === "produtoId" || falha?.campo === "tipo" ? erroId : undefined}
              opcoes={opcoesCatalogo}
              valorSelecionado={formProdutoId ? String(formProdutoId) : ""}
              textoInicial={formTipo}
              desabilitado={carregandoCatalogo || salvando}
              permitirTextoLivre={Boolean(itemEmEdicao && !itemEmEdicao.produtoId)}
              placeholder={carregandoCatalogo ? "Carregando catálogo..." : "Digite nome ou tipo (ex: inversor, cabo, 550W)..."}
              onSelecionar={(valor) => {
                const idNum = valor ? Number(valor) : null;
                const prod = idNum ? produtosCatalogo.find((p) => p.id === idNum) : undefined;
                onFormProdutoIdChange?.(idNum, prod);
                onLimparFalhaCampo("produtoId");
              }}
              onTextoChange={(texto) => {
                if (itemEmEdicao && !itemEmEdicao.produtoId) {
                  onFormTipoChange(texto);
                  onLimparFalhaCampo("tipo");
                }
              }}
            />
          </div>
        ) : (
          <div className="sm:col-span-2 flex flex-col gap-1">
            <label htmlFor="formTipoInput" className="text-[11px] font-semibold text-muted-foreground">
              Nome / Tipo do Insumo *
            </label>
            <input
              id="formTipoInput"
              ref={tipoRef}
              type="text"
              required
              disabled={Boolean(itemEmEdicao?.produtoId)}
              aria-invalid={falha?.campo === "tipo" || undefined}
              aria-describedby={falha?.campo === "tipo" ? erroId : undefined}
              value={formTipo}
              onChange={(e) => {
                onFormTipoChange(e.target.value);
                onLimparFalhaCampo("tipo");
              }}
              placeholder="Ex: Módulos Fotovoltaicos 550W"
              className="controle-compacto w-full h-8 text-xs px-2.5 rounded-md border border-border-strong bg-surface text-foreground disabled:opacity-60"
            />
          </div>
        )}

        <div className="flex flex-col gap-1">
          <label htmlFor="formQtdInput" className="text-[11px] font-semibold text-muted-foreground">
            Quantidade{produtoSelecionado ? ` (${produtoSelecionado.unidade})` : ""} *
          </label>
          <input
            id="formQtdInput"
            ref={quantidadeRef}
            type="number"
            min="1"
            step="1"
            required
            aria-invalid={falha?.campo === "quantidade" || undefined}
            aria-describedby={falha?.campo === "quantidade" ? erroId : undefined}
            value={formQuantidade}
            onChange={(e) => {
              onFormQuantidadeChange(e.target.value);
              onLimparFalhaCampo("quantidade");
            }}
            className="controle-compacto w-full h-8 text-xs px-2.5 rounded-md border border-border-strong bg-surface font-mono tabular-nums text-right text-foreground"
          />
        </div>

        {itemEmEdicao && podeAlterarStatus && (
          <div className="sm:col-span-3 flex flex-col gap-1">
            <label htmlFor="formStatusSelect" className="text-[11px] font-semibold text-muted-foreground">
              Status Logístico
            </label>
            <select
              id="formStatusSelect"
              value={formStatus}
              onChange={(e) => onFormStatusChange(e.target.value as StatusLogistico)}
              className="controle-compacto w-full h-8 text-xs px-2 rounded-md border border-border-strong bg-surface text-foreground"
            >
              {STATUS_LOGISTICO_OPCOES.map((opcao) => (
                <option key={opcao.valor} value={opcao.valor}>
                  {opcao.rotulo}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between gap-2 pt-1">
        <span className="text-xs text-muted-foreground">
          {itemEmEdicao ? `Status atual: ${obterMetaStatusLogistico(formStatus).rotulo}` : "Status inicial: Em Solicitação"}
        </span>
        <button
          type="submit"
          disabled={salvando || (usarSelecaoCatalogo && carregandoCatalogo)}
          className="controle-compacto h-8 text-xs font-semibold px-3.5 rounded-md bg-primary text-primary-foreground hover:bg-primary-hover disabled:opacity-50 transition-colors cursor-pointer shrink-0"
        >
          {salvando ? "Salvando..." : itemEmEdicao ? "Salvar alterações" : "Cadastrar insumo"}
        </button>
      </div>
    </form>
  );
}
