// RF-03: Cadastro de novas obras
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { 
  Save, 
  Building2, 
  Calendar, 
  Zap, 
  User, 
  FileText, 
  Clock, 
  Loader2, 
  CheckCircle2, 
  AlertCircle,
  X
} from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useQueryClient } from "@tanstack/react-query";
import { toast as sonnerToast } from "sonner";
import { novaObraSchema, type NovaObraFormData, type NovaObraInput, type CriarObraPayload, type ListaObras } from "@/types";
import { criarObra } from "@/services/obras";

interface ToastState {
  tipo: "sucesso" | "erro";
  mensagem: string;
}

export default function CadastrarObra() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [toast, setToast] = useState<ToastState | null>(null);


  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<NovaObraInput, unknown, NovaObraFormData>({
    resolver: zodResolver(novaObraSchema),
    mode: "onBlur",
    defaultValues: {
      clienteNome: "",
      cidade: "",
      dataInicioEstimada: "",
      dataFimEstimada: "",
      quantidadePaineis: undefined,
      pagamento: {
        prazoContratualDias: undefined,
      },
    },
  });

  const onSubmit = async (dados: NovaObraFormData) => {
    try {
      // clienteId: 45 fixado para cumprir integridade referencial com seed do banco (conforme mitigação V2)
      const payload: CriarObraPayload = {
        clienteId: 45,
        clienteNome: dados.clienteNome.trim(),
        cidade: dados.cidade.trim(),
        quantidadePaineis: Number(dados.quantidadePaineis),
        dataInicioEstimada: dados.dataInicioEstimada,
        dataFimEstimada: dados.dataFimEstimada,
        pagamento: {
          prazoContratualDias: Number(dados.pagamento.prazoContratualDias),
        },
      };

      const novaObra = await criarObra(payload);
      
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
        void navigate("/kanban");
      }, 700);
    } catch (erro) {
      console.error("Falha ao criar obra:", erro);
      setToast({
        tipo: "erro",
        mensagem: erro instanceof Error ? erro.message : "Erro ao cadastrar obra. Tente novamente.",
      });
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      {/* Toast flutuante de feedback */}
      {toast && (
        <div 
          className={`fixed top-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg border text-sm transition-all duration-300 animate-in fade-in slide-in-from-top-4 ${
            toast.tipo === "sucesso"
              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
              : "bg-red-50 border-red-200 text-red-800"
          }`}
          role="status"
          aria-live="polite"
        >
          {toast.tipo === "sucesso" ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
          )}
          <span className="font-medium">{toast.mensagem}</span>
          <button 
            type="button" 
            onClick={() => setToast(null)}
            className="p-1 hover:bg-black/5 rounded-md transition-colors cursor-pointer"
            aria-label="Fechar notificação"
          >
            <X className="w-4 h-4 text-slate-500" />
          </button>
        </div>
      )}

      {/* Header Reutilizável com Botão Voltar */}
      <PageHeader
        title="Nova Obra"
        subtitle="Cadastrar dados de contrato e dimensionamento"
        backTo="/kanban"
      />

      {/* Área do Formulário */}
      <main className="flex-1 overflow-y-auto p-4 md:p-8 flex justify-center bg-background-app custom-scrollbar">
        <div className="w-full max-w-3xl bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden h-fit my-auto">
          <form onSubmit={(e) => void handleSubmit(onSubmit)(e)} className="p-6 md:p-8 space-y-8" noValidate>
            
            {/* Seção: Dados do Cliente */}
            <div>
              <h3 className="text-base md:text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                <User className="w-5 h-5 text-slate-400" /> Dados do Cliente
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="md:col-span-2">
                  <Input
                    label="Nome / Razão Social"
                    placeholder="Ex: João da Silva ou Rede Alfa Supermercados"
                    required
                    icon={<User className="w-4 h-4" />}
                    error={errors.clienteNome?.message}
                    {...register("clienteNome")}
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
                <div>
                  <Input
                    label="Prazo Contratual (Dias)"
                    type="number"
                    placeholder="Ex: 45"
                    min={1}
                    required
                    icon={<Clock className="w-4 h-4" />}
                    error={errors.pagamento?.prazoContratualDias?.message}
                    {...register("pagamento.prazoContratualDias")}
                  />
                </div>
              </div>
            </div>

            <hr className="border-slate-100" />

            {/* Seção: Contrato e Prazos */}
            <div>
              <h3 className="text-base md:text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5 text-slate-400" /> Prazos Estimados
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
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
              </div>
            </div>

            <hr className="border-slate-100" />

            {/* Seção: Dimensionamento e Equipamentos */}
            <div>
              <h3 className="text-base md:text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                <Zap className="w-5 h-5 text-amber-500" /> Dimensionamento
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
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
              </div>
            </div>

            {/* Ações */}
            <div className="pt-4 flex flex-col-reverse sm:flex-row justify-end gap-3 border-t border-slate-100">
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
                disabled={isSubmitting}
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