import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Modal } from "@/shared/components/ui/Modal";
import { Button } from "@/shared/components/ui/Button";
import { Input } from "@/shared/components/ui/Input";
import { dataBRParaIso, isoParaDataBR, mascararDataBR } from "@/shared/lib/datasBrasileiras";
import { useEditarObra } from "@/features/obras/hooks/useObraDetalhe";
import {
  editarObraFormSchema,
  mapearValoresFormularioObra,
  type EditarObraFormData,
} from "../lib/editarObraFormulario";
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
import type { ObraDetalhe, EditarObraPayload } from "../types/obras";

interface ModalEditarObraProps {
  isOpen: boolean;
  onClose: () => void;
  obra: ObraDetalhe;
}

export function ModalEditarObra({ isOpen, onClose, obra }: ModalEditarObraProps) {
  const editarObraMutation = useEditarObra();
  const chaveSessao = `${isOpen}-${obra.id}-${obra.dataInicioEstimada ?? ""}-${obra.dataFimEstimada ?? ""}`;
  const [chaveAnterior, setChaveAnterior] = useState(chaveSessao);
  const [dataInicioBR, setDataInicioBR] = useState(() => isoParaDataBR(obra.dataInicioEstimada));
  const [dataFimBR, setDataFimBR] = useState(() => isoParaDataBR(obra.dataFimEstimada));
  const [erroDataInicio, setErroDataInicio] = useState<string | undefined>(undefined);
  const [erroDataFim, setErroDataFim] = useState<string | undefined>(undefined);

  if (chaveAnterior !== chaveSessao) {
    setChaveAnterior(chaveSessao);
    if (isOpen) {
      setDataInicioBR(isoParaDataBR(obra.dataInicioEstimada));
      setDataFimBR(isoParaDataBR(obra.dataFimEstimada));
      setErroDataInicio(undefined);
      setErroDataFim(undefined);
    }
  }

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<EditarObraFormData>({
    resolver: zodResolver(editarObraFormSchema),
    defaultValues: mapearValoresFormularioObra(obra),
  });

  // Atualiza valores do formulário quando a obra muda
  useEffect(() => {
    if (isOpen) {
      reset(mapearValoresFormularioObra(obra));
    }
  }, [isOpen, obra, reset]);

  const onSubmit = async (data: EditarObraFormData) => {
    const inicioLimpo = dataInicioBR.trim();
    const fimLimpo = dataFimBR.trim();
    const inicioISO = inicioLimpo ? dataBRParaIso(inicioLimpo) : undefined;
    const fimISO = fimLimpo ? dataBRParaIso(fimLimpo) : undefined;

    if (inicioLimpo && !inicioISO) {
      setErroDataInicio("Informe uma data válida no formato dd/mm/aaaa");
      document.getElementById("editar-inicio-estimado")?.focus();
      return;
    }
    if (fimLimpo && !fimISO) {
      setErroDataFim("Informe uma data válida no formato dd/mm/aaaa");
      document.getElementById("editar-conclusao-estimada")?.focus();
      return;
    }

    const payload: EditarObraPayload = {
      cidade: data.cidade,
      endereco: data.endereco,
      categoria: data.categoria,
      quantidadePaineis: data.quantidadePaineis,
      quantidadeInversores: data.quantidadeInversores,
      dataInicioEstimada: inicioISO ?? undefined,
      dataFimEstimada: fimISO ?? undefined,
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
                className="w-full appearance-none rounded-lg border bg-surface-subtle border-border-subtle pl-4 pr-10 py-2.5 text-sm text-foreground-secondary transition-all focus:bg-surface focus:border-border-strong cursor-pointer"
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
            icon={<Zap className="w-4 h-4 text-warning" />}
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
            id="editar-inicio-estimado"
            label="Início Estimado"
            type="text"
            inputMode="numeric"
            maxLength={10}
            placeholder="dd/mm/aaaa"
            className="font-mono tabular-nums"
            value={dataInicioBR}
            onChange={(e) => {
              setDataInicioBR(mascararDataBR(e.target.value));
              if (erroDataInicio) setErroDataInicio(undefined);
            }}
            error={erroDataInicio ?? errors.dataInicioEstimada?.message}
          />
          <Input
            id="editar-conclusao-estimada"
            label="Conclusão Estimada"
            type="text"
            inputMode="numeric"
            maxLength={10}
            placeholder="dd/mm/aaaa"
            className="font-mono tabular-nums"
            value={dataFimBR}
            onChange={(e) => {
              setDataFimBR(mascararDataBR(e.target.value));
              if (erroDataFim) setErroDataFim(undefined);
            }}
            error={erroDataFim ?? errors.dataFimEstimada?.message}
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
              <FileText className="w-4 h-4" aria-hidden="true" />
            </div>
            <textarea
              id="editar-descricao"
              rows={3}
              placeholder="Instruções de acesso, orientações técnicas..."
              className="w-full rounded-lg border bg-surface-subtle border-border-subtle pl-10 pr-4 py-2.5 text-sm text-foreground-secondary placeholder-subtle-foreground transition-all focus:bg-surface focus:border-border-strong custom-scrollbar resize-none"
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
            className="h-10 cursor-pointer"
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting}
            className="h-10 flex items-center gap-2 cursor-pointer"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 motion-safe:animate-spin" />
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
