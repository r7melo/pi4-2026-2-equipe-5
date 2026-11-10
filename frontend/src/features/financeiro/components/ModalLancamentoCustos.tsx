import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { Modal } from "@/shared/components/ui/Modal";
import { Button } from "@/shared/components/ui/Button";
import { Input } from "@/shared/components/ui/Input";
import { toast } from "sonner";
import {
  DollarSign,
  HardHat,
  Package,
  AlertCircle,
  Building2,
  Calculator,
  Loader2,
} from "lucide-react";
import { useAtualizarCustosObra } from "../hooks/useRelatorios";
import { formatarMoeda } from "@/shared/lib/formatters";
import type { CustosObra } from "@/types";

interface ModalLancamentoCustosProps {
  isOpen: boolean;
  onClose: () => void;
  obraId: number;
  clienteNome: string;
  custosAtuais?: CustosObra | null;
}

interface FormValores {
  valorObra: string;
  custoMaoObra: string;
  custoInsumos: string;
}

export function ModalLancamentoCustos({
  isOpen,
  onClose,
  obraId,
  clienteNome,
  custosAtuais,
}: ModalLancamentoCustosProps) {
  const [erroValidacao, setErroValidacao] = useState<string | null>(null);
  const atualizarCustos = useAtualizarCustosObra(obraId);

  const handleClose = () => {
    setErroValidacao(null);
    onClose();
  };

  const {
    register,
    handleSubmit,
    control,
    formState: { isSubmitting },
    reset,
  } = useForm<FormValores>({
    values: {
      valorObra: custosAtuais?.valorObra != null ? String(custosAtuais.valorObra) : "",
      custoMaoObra: custosAtuais?.custoMaoObra != null ? String(custosAtuais.custoMaoObra) : "",
      custoInsumos: custosAtuais?.custoInsumos != null ? String(custosAtuais.custoInsumos) : "",
    },
    resetOptions: {
      keepDirtyValues: true,
    },
  });

  // Cálculos dinâmicos em tempo real para pré-visualização contábil
  const valoresObservados = useWatch({ control });
  const valorObraWatch = valoresObservados?.valorObra;
  const custoMaoObraWatch = valoresObservados?.custoMaoObra;
  const custoInsumosWatch = valoresObservados?.custoInsumos;

  const valorObraNum = Math.max(0, Number(String(valorObraWatch || "0").replace(",", ".")) || 0);
  const maoObraNum = Math.max(0, Number(String(custoMaoObraWatch || "0").replace(",", ".")) || 0);
  const insumosNum = Math.max(0, Number(String(custoInsumosWatch || "0").replace(",", ".")) || 0);

  const totalCustosDiretos = maoObraNum + insumosNum;
  const margemEstimada = valorObraNum - totalCustosDiretos;
  const margemPercentual = valorObraNum > 0 ? (margemEstimada / valorObraNum) * 100 : 0;

  const onSubmit = async (dados: FormValores) => {
    setErroValidacao(null);

    const valorObraParsed = dados.valorObra.trim() !== "" ? Number(dados.valorObra.replace(",", ".")) : null;
    const custoMaoObraParsed = dados.custoMaoObra.trim() !== "" ? Number(dados.custoMaoObra.replace(",", ".")) : null;
    const custoInsumosParsed = dados.custoInsumos.trim() !== "" ? Number(dados.custoInsumos.replace(",", ".")) : null;

    for (const [campo, num] of [
      ["Valor da Obra", valorObraParsed],
      ["Custo de Mão de Obra", custoMaoObraParsed],
      ["Custo de Insumos", custoInsumosParsed],
    ] as const) {
      if (num !== null && (isNaN(num) || num < 0)) {
        setErroValidacao(`O campo ${campo} deve ser um valor numérico válido e não negativo.`);
        return;
      }
    }

    try {
      await atualizarCustos.mutateAsync({
        valorObra: valorObraParsed,
        custoMaoObra: custoMaoObraParsed,
        custoInsumos: custoInsumosParsed,
      });

      toast.success("Custos e valores da obra atualizados com sucesso!");
      onClose();
      reset();
    } catch (erro) {
      const msg = erro instanceof Error ? erro.message : "Erro ao atualizar valores da obra.";
      setErroValidacao(msg);
    }
  };

  const isSalvando = isSubmitting || atualizarCustos.isPending;

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      fecharBloqueado={isSubmitting}
      titulo="Lançamento de Custos e Valor da Obra"
      subtitulo={`Obra #${obraId} • Cliente: ${clienteNome}`}
      icone={
        <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center shrink-0">
          <DollarSign className="w-5 h-5" />
        </div>
      }
      className="max-w-xl"
    >
      <form onSubmit={(e) => void handleSubmit(onSubmit)(e)} className="p-6 space-y-5">
        {/* Banner de Contexto Operacional */}
        <div className="flex items-center justify-between p-3.5 rounded-xl bg-surface-subtle border border-border-subtle text-xs">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-2 rounded-lg bg-surface border border-border-subtle text-foreground-muted shrink-0">
              <Building2 className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-foreground truncate">{clienteNome}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">Identificador do Contrato: #{obraId}</p>
            </div>
          </div>
          <span className="text-[11px] font-medium px-2.5 py-1 rounded-md bg-surface border border-border-subtle text-foreground-secondary shrink-0">
            Apuração DRE
          </span>
        </div>

        {erroValidacao && (
          <div className="p-3.5 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive flex items-center gap-2.5 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span className="font-medium">{erroValidacao}</span>
          </div>
        )}

        {/* Campo Principal: Receita Contratual */}
        <div>
          <label
            htmlFor="input-valor-obra"
            className="block text-xs font-semibold text-foreground-secondary mb-1.5 uppercase tracking-wide"
          >
            Valor do Contrato / Obra (R$)
          </label>
          <div className="relative">
            <div className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none flex items-center gap-1 text-muted-foreground">
              <DollarSign className="w-4 h-4 text-foreground-muted" />
              <span className="text-xs font-bold font-mono">R$</span>
            </div>
            <Input
              id="input-valor-obra"
              type="number"
              step="0.01"
              min="0"
              placeholder="0,00"
              className="pl-14 font-mono text-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              {...register("valorObra")}
            />
          </div>
          <p className="text-[11px] text-muted-foreground mt-1">
            Receita bruta negociada junto ao cliente da obra para a apuração da DRE.
          </p>
        </div>

        {/* Grid de Custos Diretos */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label
              htmlFor="input-custo-mao-obra"
              className="block text-xs font-semibold text-foreground-secondary mb-1.5 uppercase tracking-wide"
            >
              Mão de Obra (R$)
            </label>
            <div className="relative">
              <div className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none flex items-center gap-1 text-muted-foreground">
                <HardHat className="w-4 h-4 text-foreground-muted" />
                <span className="text-xs font-bold font-mono">R$</span>
              </div>
              <Input
                id="input-custo-mao-obra"
                type="number"
                step="0.01"
                min="0"
                placeholder="0,00"
                className="pl-14 font-mono text-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                {...register("custoMaoObra")}
              />
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              Pagamentos a instaladores e terceiros.
            </p>
          </div>

          <div>
            <label
              htmlFor="input-custo-insumos"
              className="block text-xs font-semibold text-foreground-secondary mb-1.5 uppercase tracking-wide"
            >
              Insumos e Peças (R$)
            </label>
            <div className="relative">
              <div className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none flex items-center gap-1 text-muted-foreground">
                <Package className="w-4 h-4 text-foreground-muted" />
                <span className="text-xs font-bold font-mono">R$</span>
              </div>
              <Input
                id="input-custo-insumos"
                type="number"
                step="0.01"
                min="0"
                placeholder="0,00"
                className="pl-14 font-mono text-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                {...register("custoInsumos")}
              />
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              Cabos, fixadores e complementos.
            </p>
          </div>
        </div>

        {/* Quadro de Apuração Estimada em Tempo Real */}
        <div className="p-4 rounded-xl bg-surface-subtle border border-border-subtle">
          <div className="flex items-center justify-between mb-3 pb-2.5 border-b border-border-subtle">
            <span className="text-xs font-bold uppercase tracking-wider text-foreground-muted flex items-center gap-2">
              <Calculator className="w-4 h-4 text-foreground-muted" />
              Prévia da Margem Operacional
            </span>
            <span className="text-xs font-semibold text-muted-foreground">
              {valorObraNum > 0 ? `${margemPercentual.toFixed(1)}% de margem` : "Aguardando valores"}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4 text-xs">
            <div>
              <p className="text-[11px] text-muted-foreground">Custos Totais Lançados</p>
              <p className="font-mono font-bold text-sm text-foreground mt-0.5">
                {formatarMoeda(totalCustosDiretos)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-[11px] text-muted-foreground">Margem Bruta Estimada</p>
              <p
                className={`font-mono font-bold text-sm mt-0.5 ${
                  margemEstimada >= 0 ? "text-success" : "text-destructive"
                }`}
              >
                {formatarMoeda(margemEstimada)}
              </p>
            </div>
          </div>
        </div>

        {/* Ações do Rodapé */}
        <div className="pt-4 border-t border-border-subtle flex items-center justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={isSalvando}
            className="cursor-pointer"
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            disabled={isSalvando}
            className="flex items-center gap-2 cursor-pointer"
          >
            {isSalvando ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Gravando...</span>
              </>
            ) : (
              "Salvar Valores"
            )}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
