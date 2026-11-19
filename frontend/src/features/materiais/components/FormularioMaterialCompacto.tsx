import { useId, useLayoutEffect, useRef, type FormEvent } from "react";
import type { Material, StatusLogistico } from "@/shared/types/materiais";
import { STATUS_LOGISTICO_OPCOES, obterMetaStatusLogistico } from "@/shared/constants/statusLogistico";
import type {
  CampoValidacaoMaterial,
  FalhaValidacaoMaterial,
  ValidadeInputMaterial,
} from "../lib/validacaoMaterial";

interface FormularioMaterialCompactoProps {
  itemEmEdicao: Material | null;
  podeAlterarStatus: boolean;
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
  const tipoRef = useRef<HTMLInputElement>(null);
  const quantidadeRef = useRef<HTMLInputElement>(null);
  const erroId = useId();

  useLayoutEffect(() => {
    if (falha) {
      (falha.campo === "tipo" ? tipoRef : quantidadeRef).current?.focus();
    }
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
      className="bg-surface-subtle border border-border-subtle rounded-lg p-3 mb-3 flex flex-col gap-2.5 shadow-xs"
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-foreground">
          {itemEmEdicao ? `Alterar Insumo #${itemEmEdicao.id}` : "Cadastrar Novo Insumo"}
        </span>
        <button
          type="button"
          onClick={onCancelar}
          className="text-muted-foreground hover:text-foreground text-xs"
        >
          Cancelar
        </button>
      </div>

      {falha && (
        <div
          id={erroId}
          role="alert"
          className="bg-destructive-light text-destructive border border-destructive-border px-2.5 py-1.5 rounded-md text-xs font-medium"
        >
          {falha.mensagem}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <div className="sm:col-span-1.5 flex flex-col gap-1">
          <label htmlFor="formTipoInput" className="text-[11px] font-semibold text-muted-foreground">
            Nome / Tipo do Insumo *
          </label>
          <input
            id="formTipoInput"
            ref={tipoRef}
            type="text"
            required
            aria-invalid={falha?.campo === "tipo" || undefined}
            aria-describedby={falha?.campo === "tipo" ? erroId : undefined}
            value={formTipo}
            onChange={(e) => {
              onFormTipoChange(e.target.value);
              onLimparFalhaCampo("tipo");
            }}
            placeholder="Ex: Módulos Fotovoltaicos 550W"
            className="w-full text-xs px-2.5 py-1.5 rounded-md border border-border-subtle bg-surface focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="formQtdInput" className="text-[11px] font-semibold text-muted-foreground">
            Quantidade *
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
            className="w-full text-xs px-2.5 py-1.5 rounded-md border border-border-subtle bg-surface focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>

        {itemEmEdicao && podeAlterarStatus ? (
          <div className="flex flex-col gap-1">
            <label htmlFor="formStatusSelect" className="text-[11px] font-semibold text-muted-foreground">
              Status Logístico
            </label>
            <select
              id="formStatusSelect"
              value={formStatus}
              onChange={(e) => onFormStatusChange(e.target.value as StatusLogistico)}
              className="w-full text-xs px-2 py-1.5 rounded-md border border-border-subtle bg-surface focus:outline-none focus:ring-1 focus:ring-primary"
            >
              {STATUS_LOGISTICO_OPCOES.map((opcao) => (
                <option key={opcao.valor} value={opcao.valor}>
                  {opcao.rotulo}
                </option>
              ))}
            </select>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground self-center">
            Status: {itemEmEdicao ? obterMetaStatusLogistico(formStatus).rotulo : "Em Solicitação"}
          </p>
        )}
      </div>

      <div className="flex items-center justify-end gap-2 pt-1">
        <button
          type="submit"
          disabled={salvando}
          className="text-xs font-semibold px-3 py-1.5 rounded-md bg-primary text-primary-foreground hover:bg-primary-hover disabled:opacity-50 transition-colors cursor-pointer"
        >
          {salvando ? "Salvando..." : itemEmEdicao ? "Salvar Alterações" : "Cadastrar Insumo"}
        </button>
      </div>
    </form>
  );
}
