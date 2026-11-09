import { useState } from "react";
import { Modal } from "@/shared/components/ui/Modal";
import { Button } from "@/shared/components/ui/Button";
import { Package, Loader2, ChevronDown } from "lucide-react";
import type { Material, StatusLogistico } from "@/types";
import { useAdicionarMaterial, useAtualizarDadosMaterial } from "@/features/materiais/hooks/useMateriais";

interface ModalMaterialProps {
  isOpen: boolean;
  onClose: () => void;
  obraId: number;
  materialParaEditar?: Material | null;
  podeVerCustos?: boolean;
}

interface FormularioMaterialProps {
  obraId: number;
  materialParaEditar?: Material | null;
  podeVerCustos: boolean;
  onClose: () => void;
}

function FormularioMaterial({
  obraId,
  materialParaEditar,
  podeVerCustos,
  onClose,
}: FormularioMaterialProps) {
  const isEditing = Boolean(materialParaEditar);

  const [tipo, setTipo] = useState(materialParaEditar?.tipo || materialParaEditar?.descricao || "");
  const [quantidade, setQuantidade] = useState(String(materialParaEditar?.quantidade ?? 1));
  const [custoUnitario, setCustoUnitario] = useState(
    materialParaEditar?.custoUnitario != null ? String(materialParaEditar.custoUnitario) : ""
  );
  const [statusLogistico, setStatusLogistico] = useState<StatusLogistico>(
    materialParaEditar?.statusLogistico || "Comprado"
  );
  const [erro, setErro] = useState<string | null>(null);

  const adicionarMutation = useAdicionarMaterial();
  const atualizarMutation = useAtualizarDadosMaterial();
  const isPending = adicionarMutation.isPending || atualizarMutation.isPending;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro(null);

    const tipoTrim = tipo.trim();
    if (!tipoTrim) {
      setErro("Informe o nome ou especificação do insumo.");
      return;
    }
    if (tipoTrim.length > 200) {
      setErro("O nome do insumo não pode exceder 200 caracteres.");
      return;
    }

    const qtdNum = Number(quantidade);
    if (!Number.isInteger(qtdNum) || qtdNum <= 0) {
      setErro("A quantidade deve ser um número inteiro positivo maior que zero.");
      return;
    }

    const custoNum = custoUnitario ? Number(custoUnitario) : undefined;
    if (custoNum !== undefined && (isNaN(custoNum) || custoNum < 0)) {
      setErro("O custo unitário deve ser um valor numérico não-negativo.");
      return;
    }

    try {
      if (isEditing && materialParaEditar) {
        await atualizarMutation.mutateAsync({
          id: materialParaEditar.id,
          obraId,
          payload: {
            tipo: tipoTrim,
            quantidade: qtdNum,
            custoUnitario: podeVerCustos ? custoNum : undefined,
            statusLogistico,
          },
        });
      } else {
        await adicionarMutation.mutateAsync({
          obraId,
          payload: {
            tipo: tipoTrim,
            quantidade: qtdNum,
            custoUnitario: podeVerCustos ? custoNum : undefined,
            statusLogistico,
          },
        });
      }
      onClose();
    } catch {
      // O hook já emite o toast de erro correspondente
    }
  };

  return (
    <form onSubmit={handleSubmit} className="p-6 space-y-4">
      {erro && (
        <div className="bg-destructive-light text-destructive border border-destructive-border px-3.5 py-2.5 rounded-lg text-xs font-medium">
          {erro}
        </div>
      )}

      {isEditing && materialParaEditar && (
        <div className="flex items-center justify-between p-3 rounded-lg bg-surface-subtle border border-border-subtle text-xs">
          <div className="min-w-0">
            <p className="font-semibold text-foreground truncate">
              {materialParaEditar.tipo || materialParaEditar.descricao || "Insumo"}
            </p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Identificador: #{materialParaEditar.id}
            </p>
          </div>
          <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-surface border border-border-subtle text-foreground-secondary shrink-0">
            Qtd atual: {materialParaEditar.quantidade}
          </span>
        </div>
      )}

      <div>
        <label className="block text-xs font-semibold text-foreground-muted mb-1.5 uppercase tracking-wide">
          Descrição / Tipo do Material <span className="text-destructive">*</span>
        </label>
        <input
          type="text"
          required
          disabled={isPending}
          value={tipo}
          onChange={(e) => setTipo(e.target.value)}
          placeholder="Ex: Módulo Solar 550W Monocristalino"
          className="w-full h-9 border border-border-subtle bg-surface-subtle rounded-lg px-3 text-sm text-foreground focus:bg-surface focus:outline-none focus:ring-1 focus:ring-border-strong transition-colors disabled:opacity-60"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold text-foreground-muted mb-1.5 uppercase tracking-wide">
            Quantidade <span className="text-destructive">*</span>
          </label>
          <input
            type="number"
            required
            min="1"
            step="1"
            disabled={isPending}
            value={quantidade}
            onChange={(e) => setQuantidade(e.target.value)}
            placeholder="Ex: 10"
            className="w-full h-9 border border-border-subtle bg-surface-subtle rounded-lg px-3 text-sm text-foreground font-mono focus:bg-surface focus:outline-none focus:ring-1 focus:ring-border-strong transition-colors disabled:opacity-60"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-foreground-muted mb-1.5 uppercase tracking-wide">
            Status Logístico
          </label>
          <div className="relative">
            <select
              disabled={isPending}
              value={statusLogistico}
              onChange={(e) => setStatusLogistico(e.target.value as StatusLogistico)}
              className="w-full h-9 appearance-none border border-border-subtle bg-surface-subtle rounded-lg pl-3 pr-8 text-sm text-foreground focus:bg-surface focus:outline-none focus:ring-1 focus:ring-border-strong transition-colors cursor-pointer disabled:opacity-60"
            >
              <option value="Comprado" className="bg-surface text-foreground">Comprado</option>
              <option value="EmTransito" className="bg-surface text-foreground">Em Trânsito</option>
              <option value="Disponivel" className="bg-surface text-foreground">Disponível</option>
              <option value="Utilizado" className="bg-surface text-foreground">Utilizado</option>
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          </div>
        </div>
      </div>

      {podeVerCustos && (
        <div>
          <label className="block text-xs font-semibold text-foreground-muted mb-1.5 uppercase tracking-wide">
            Custo Unitário Estimado (R$)
          </label>
          <input
            type="number"
            min="0"
            step="0.01"
            disabled={isPending}
            value={custoUnitario}
            onChange={(e) => setCustoUnitario(e.target.value)}
            placeholder="0,00"
            className="w-full h-9 border border-border-subtle bg-surface-subtle rounded-lg px-3 text-sm text-foreground font-mono focus:bg-surface focus:outline-none focus:ring-1 focus:ring-border-strong transition-colors disabled:opacity-60"
          />
          <p className="text-[11px] text-muted-foreground mt-1">
            Visível apenas para perfis autorizados da gestão financeira.
          </p>
        </div>
      )}

      <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-border-subtle">
        <Button
          type="button"
          variant="outline"
          disabled={isPending}
          onClick={onClose}
          className="h-9 px-4 text-xs cursor-pointer"
        >
          Cancelar
        </Button>
        <Button
          type="submit"
          disabled={isPending}
          className="h-9 px-4 text-xs font-medium cursor-pointer flex items-center gap-1.5"
        >
          {isPending ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Salvando...
            </>
          ) : isEditing ? (
            "Salvar Alterações"
          ) : (
            "Adicionar Insumo"
          )}
        </Button>
      </div>
    </form>
  );
}

export function ModalMaterial({
  isOpen,
  onClose,
  obraId,
  materialParaEditar,
  podeVerCustos = true,
}: ModalMaterialProps) {
  const isEditing = Boolean(materialParaEditar);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      titulo={isEditing ? "Editar Insumo da Obra" : "Adicionar Insumo à Obra"}
      subtitulo={
        isEditing
          ? `Atualize as especificações e quantidades do item #${materialParaEditar?.id}`
          : "Preencha os dados do material para controle e acompanhamento logístico"
      }
      icone={
        <div className="w-10 h-10 rounded-xl bg-surface border border-border-subtle text-foreground-muted flex items-center justify-center shrink-0">
          <Package className="w-5 h-5" />
        </div>
      }
      className="max-w-md w-full"
    >
      {isOpen && (
        <FormularioMaterial
          key={materialParaEditar?.id ?? "novo"}
          obraId={obraId}
          materialParaEditar={materialParaEditar}
          podeVerCustos={podeVerCustos}
          onClose={onClose}
        />
      )}
    </Modal>
  );
}
