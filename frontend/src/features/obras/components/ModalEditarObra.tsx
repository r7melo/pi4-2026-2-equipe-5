import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Modal } from "@/shared/components/ui/Modal";
import { Button } from "@/shared/components/ui/Button";
import { Input } from "@/shared/components/ui/Input";
import { useEditarObra } from "@/features/obras/hooks/useObraDetalhe";
import {
  Edit3,
  Loader2,
  Building2,
  MapPin,
  Zap,
  Cpu,
  Clock,
  ChevronDown,
  FileText,
} from "lucide-react";
import type { ObraDetalhe, EditarObraPayload } from "@/types";

const editarObraFormSchema = z.object({
  cidade: z.string().trim().min(2, "Informe ao menos 2 caracteres para a cidade"),
  endereco: z.string().trim().min(3, "Informe um endereço válido"),
  categoria: z.enum(["Residencial", "Comercial"]),
  quantidadePaineis: z
    .number({ error: "Informe a quantidade de painéis" })
    .int("Deve ser um número inteiro")
    .positive("A quantidade deve ser maior que zero"),
  quantidadeInversores: z
    .number({ error: "Informe a quantidade de inversores" })
    .int("Deve ser um número inteiro")
    .min(0, "A quantidade não pode ser negativa"),
  prazoContratualDias: z
    .number({ error: "Informe o prazo contratual" })
    .int("Deve ser um número inteiro")
    .positive("O prazo contratual deve ser de ao menos 1 dia"),
  dataInicioEstimada: z.string().optional(),
  dataFimEstimada: z.string().optional(),
  descricao: z.string().optional(),
});

type EditarObraFormData = z.infer<typeof editarObraFormSchema>;

interface ModalEditarObraProps {
  isOpen: boolean;
  onClose: () => void;
  obra: ObraDetalhe;
}

export function ModalEditarObra({ isOpen, onClose, obra }: ModalEditarObraProps) {
  const editarObraMutation = useEditarObra();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<EditarObraFormData>({
    resolver: zodResolver(editarObraFormSchema),
    defaultValues: {
      cidade: obra.cliente?.cidade || "",
      endereco: obra.endereco || "",
      categoria: (obra.categoria as "Residencial" | "Comercial") || "Residencial",
      quantidadePaineis: obra.quantidadePaineis ?? 1,
      quantidadeInversores: obra.quantidadeInversores ?? 1,
      prazoContratualDias: obra.pagamento?.prazoContratualDias ?? 30,
      dataInicioEstimada: obra.dataInicioEstimada ? obra.dataInicioEstimada.split("T")[0] : "",
      dataFimEstimada: obra.dataFimEstimada ? obra.dataFimEstimada.split("T")[0] : "",
      descricao: obra.descricao || "",
    },
  });

  // Atualiza valores do formulário quando a obra muda
  useEffect(() => {
    if (isOpen) {
      reset({
        cidade: obra.cliente?.cidade || "",
        endereco: obra.endereco || "",
        categoria: (obra.categoria as "Residencial" | "Comercial") || "Residencial",
        quantidadePaineis: obra.quantidadePaineis ?? 1,
        quantidadeInversores: obra.quantidadeInversores ?? 1,
        prazoContratualDias: obra.pagamento?.prazoContratualDias ?? 30,
        dataInicioEstimada: obra.dataInicioEstimada ? obra.dataInicioEstimada.split("T")[0] : "",
        dataFimEstimada: obra.dataFimEstimada ? obra.dataFimEstimada.split("T")[0] : "",
        descricao: obra.descricao || "",
      });
    }
  }, [isOpen, obra, reset]);

  const onSubmit = async (data: EditarObraFormData) => {
    const payload: EditarObraPayload = {
      cidade: data.cidade,
      endereco: data.endereco,
      categoria: data.categoria,
      quantidadePaineis: data.quantidadePaineis,
      quantidadeInversores: data.quantidadeInversores,
      dataInicioEstimada: data.dataInicioEstimada || undefined,
      dataFimEstimada: data.dataFimEstimada || undefined,
      descricao: data.descricao || undefined,
      pagamento: {
        prazoContratualDias: data.prazoContratualDias,
      },
    };

    try {
      await editarObraMutation.mutateAsync({ id: obra.id, payload });
      onClose();
    } catch {
      // O hook useEditarObra já exibe toast de erro tratado
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      fecharBloqueado={isSubmitting}
      titulo="Editar Dados da Obra"
      subtitulo={`Obra #${obra.id} • ${obra.cliente?.nome || "Cliente"}`}
      icone={
        <div className="w-10 h-10 rounded-xl bg-surface border border-border-subtle text-foreground-muted flex items-center justify-center shrink-0">
          <Edit3 className="w-5 h-5" />
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
              <p className="font-semibold text-foreground truncate">{obra.cliente?.nome || "Cliente"}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Obra #{obra.id} • Status: {obra.status}
              </p>
            </div>
          </div>
          <span className="text-[11px] font-medium px-2.5 py-1 rounded-md bg-surface border border-border-subtle text-foreground-secondary shrink-0">
            {obra.categoria || "Residencial"}
          </span>
        </div>

        {/* Linha 1: Cidade e Categoria */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Cidade"
            required
            placeholder="Ex: Campinas"
            icon={<Building2 className="w-4 h-4" />}
            error={errors.cidade?.message}
            {...register("cidade")}
          />

          <div className="space-y-1.5 w-full">
            <label
              htmlFor="editar-categoria"
              className="block text-sm font-semibold text-foreground-muted"
            >
              Categoria da Obra <span className="text-destructive ml-1">*</span>
            </label>
            <div className="relative">
              <select
                id="editar-categoria"
                {...register("categoria")}
                className="w-full appearance-none rounded-lg border bg-surface-subtle border-border-subtle pl-4 pr-10 py-2.5 text-sm text-foreground-secondary outline-none transition-all focus:bg-surface focus:border-border-strong focus:ring-2 focus:ring-border-subtle cursor-pointer"
              >
                <option value="Residencial" className="bg-surface text-foreground">
                  Residencial
                </option>
                <option value="Comercial" className="bg-surface text-foreground">
                  Comercial
                </option>
              </select>
              <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Linha 2: Endereço */}
        <Input
          label="Endereço Completo"
          required
          placeholder="Rua, número, bairro..."
          icon={<MapPin className="w-4 h-4" />}
          error={errors.endereco?.message}
          {...register("endereco")}
        />

        {/* Linha 3: Dimensionamento e Prazos (Anti-Slop com font-mono) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Input
            label="Painéis Solares"
            type="number"
            min={1}
            required
            icon={<Zap className="w-4 h-4 text-amber-500" />}
            className="font-mono text-foreground"
            error={errors.quantidadePaineis?.message}
            {...register("quantidadePaineis", { valueAsNumber: true })}
          />

          <Input
            label="Inversores"
            type="number"
            min={0}
            required
            icon={<Cpu className="w-4 h-4 text-muted-foreground" />}
            className="font-mono text-foreground"
            error={errors.quantidadeInversores?.message}
            {...register("quantidadeInversores", { valueAsNumber: true })}
          />

          <Input
            label="Prazo Contratual (dias)"
            type="number"
            min={1}
            required
            icon={<Clock className="w-4 h-4 text-muted-foreground" />}
            className="font-mono text-foreground"
            error={errors.prazoContratualDias?.message}
            {...register("prazoContratualDias", { valueAsNumber: true })}
          />
        </div>

        {/* Linha 4: Datas Estimadas da Obra (Rota #15) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Início Estimado"
            type="date"
            error={errors.dataInicioEstimada?.message}
            {...register("dataInicioEstimada")}
          />
          <Input
            label="Conclusão Estimada"
            type="date"
            error={errors.dataFimEstimada?.message}
            {...register("dataFimEstimada")}
          />
        </div>

        {/* Linha 5: Descrição e Observações */}
        <div className="space-y-1.5 w-full">
          <label
            htmlFor="editar-descricao"
            className="block text-sm font-semibold text-foreground-muted"
          >
            Observações / Descrição do Projeto
          </label>
          <div className="relative">
            <div className="absolute left-3.5 top-3 text-subtle-foreground pointer-events-none">
              <FileText className="w-4 h-4" />
            </div>
            <textarea
              id="editar-descricao"
              rows={3}
              placeholder="Instruções de acesso, orientações técnicas..."
              className="w-full rounded-lg border bg-surface-subtle border-border-subtle pl-10 pr-4 py-2.5 text-sm text-foreground-secondary placeholder-subtle-foreground outline-none transition-all focus:bg-surface focus:border-border-strong focus:ring-2 focus:ring-border-subtle custom-scrollbar resize-none"
              {...register("descricao")}
            />
          </div>
        </div>

        {/* Ações do Rodapé */}
        <div className="pt-4 border-t border-border-subtle flex items-center justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isSubmitting}
            className="cursor-pointer"
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting}
            className="flex items-center gap-2 cursor-pointer"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Salvando...</span>
              </>
            ) : (
              "Salvar Alterações"
            )}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
