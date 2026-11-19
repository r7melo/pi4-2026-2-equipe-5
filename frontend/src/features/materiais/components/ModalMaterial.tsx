import { useState, useRef, useId, useLayoutEffect, type FormEvent } from "react";
import { toast } from "sonner";
import { useAuthStore } from "@/shared/stores/useAuthStore";
import { Modal } from "@/shared/components/ui/Modal";
import { Button } from "@/shared/components/ui/Button";
import { Package, Loader2, ChevronDown } from "lucide-react";
import type { Material, StatusLogistico } from "@/shared/types/materiais";
import {
  STATUS_LOGISTICO_OPCOES,
  obterMetaStatusLogistico,
  podeAlterarStatusEmEdicaoCadastral,
} from "@/shared/constants/statusLogistico";
import { useAdicionarMaterial, useAtualizarDadosMaterial } from "../hooks/useMateriais";
import { useSessaoMontadaMaterial } from "../hooks/useSessaoMontadaMaterial";
import { validarFormularioMaterial, type FalhaValidacaoMaterial } from "../lib/validacaoMaterial";

interface ModalMaterialProps {
  isOpen: boolean;
  onClose: () => void;
  obraId: number;
  materialParaEditar?: Material | null;
}

interface DadosSubmitModalMaterial {
  tipo: string;
  quantidade: number;
  statusLogistico: StatusLogistico;
}

interface FormularioMaterialProps {
  materialParaEditar?: Material | null;
  podeAlterarStatus: boolean;
  isPending: boolean;
  onSalvar: (dados: DadosSubmitModalMaterial) => Promise<void>;
  onCancelar: () => void;
}

function FormularioMaterial({
  materialParaEditar,
  podeAlterarStatus,
  isPending,
  onSalvar,
  onCancelar,
}: FormularioMaterialProps) {
  const isEditing = Boolean(materialParaEditar);

  const [tipo, setTipo] = useState(materialParaEditar?.tipo || materialParaEditar?.descricao || "");
  const [quantidade, setQuantidade] = useState(String(materialParaEditar?.quantidade ?? 1));
  const [statusLogistico, setStatusLogistico] = useState<StatusLogistico>(
    materialParaEditar?.statusLogistico || "EmSolicitacao"
  );
  const [falha, setFalha] = useState<FalhaValidacaoMaterial | null>(null);
  const tipoRef = useRef<HTMLInputElement>(null);
  const quantidadeRef = useRef<HTMLInputElement>(null);
  const erroId = useId();
  useLayoutEffect(() => {
    if (falha) (falha.campo === "tipo" ? tipoRef : quantidadeRef).current?.focus();
  }, [falha]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFalha(null);

    const inputQtd = quantidadeRef.current;
    const validacao = validarFormularioMaterial({
      tipo,
      quantidade,
      validadeQuantidade: inputQtd
        ? {
            valid: inputQtd.validity.valid,
            badInput: inputQtd.validity.badInput,
            validationMessage: inputQtd.validationMessage,
          }
        : undefined,
    });

    if (!validacao.ok) {
      setFalha({ ...validacao.falha });
      return;
    }

    await onSalvar({
      tipo: validacao.tipo,
      quantidade: validacao.quantidade,
      statusLogistico,
    });
  };

  return (
    <form noValidate onSubmit={(e) => void handleSubmit(e)} className="p-6 space-y-4">
      {falha && (
        <div
          id={erroId}
          role="alert"
          className="bg-destructive-light text-destructive border border-destructive-border px-3.5 py-2.5 rounded-lg text-xs font-medium"
        >
          {falha.mensagem}
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
        <label
          htmlFor="material-tipo"
          className="block text-xs font-semibold text-foreground-muted mb-1.5 uppercase tracking-wide"
        >
          Descrição / Tipo do Material <span className="text-destructive">*</span>
        </label>
        <div className="space-y-1.5">
          <input
            id="material-tipo"
            ref={tipoRef}
            aria-invalid={falha?.campo === "tipo" || undefined}
            aria-describedby={falha?.campo === "tipo" ? erroId : undefined}
            type="text"
            required
            list="catalogo-produtos-sugeridos"
            disabled={isPending}
            value={tipo}
            onChange={(e) => {
              setTipo(e.target.value);
              setFalha((atual) => (atual?.campo === "tipo" ? null : atual));
            }}
            placeholder="Selecione ou digite o insumo (Ex: Módulo Solar 550W)"
            className="w-full h-9 border border-border-subtle bg-surface-subtle rounded-lg px-3 text-sm text-foreground focus:bg-surface focus:outline-none focus:ring-1 focus:ring-border-strong transition-colors disabled:opacity-60"
          />
          <datalist id="catalogo-produtos-sugeridos">
            <option value="Módulo Solar 550W Monocristalino" />
            <option value="Módulo Solar 600W Bifacial" />
            <option value="Inversor Solar String 5kW" />
            <option value="Inversor Solar String 10kW" />
            <option value="Microinversor 2000W" />
            <option value="Cabo Solar 6mm² Vermelho" />
            <option value="Cabo Solar 6mm² Preto" />
            <option value="Conector MC4 Par (Macho/Fêmea)" />
            <option value="Kit Estrutura Fixação Telhado Cerâmico" />
            <option value="Kit Estrutura Fixação Telhado Metálico" />
            <option value="Disjuntor DC 1000V" />
            <option value="String Box Solar 2 Entradas / 2 Saídas" />
          </datalist>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label
            htmlFor="material-quantidade"
            className="block text-xs font-semibold text-foreground-muted mb-1.5 uppercase tracking-wide"
          >
            Quantidade <span className="text-destructive">*</span>
          </label>
          <input
            id="material-quantidade"
            ref={quantidadeRef}
            aria-invalid={falha?.campo === "quantidade" || undefined}
            aria-describedby={falha?.campo === "quantidade" ? erroId : undefined}
            type="number"
            required
            min="1"
            step="1"
            disabled={isPending}
            value={quantidade}
            onChange={(e) => {
              setQuantidade(e.target.value);
              setFalha((atual) => (atual?.campo === "quantidade" ? null : atual));
            }}
            placeholder="Ex: 10"
            className="w-full h-9 border border-border-subtle bg-surface-subtle rounded-lg px-3 text-sm text-foreground font-mono focus:bg-surface focus:outline-none focus:ring-1 focus:ring-border-strong transition-colors disabled:opacity-60"
          />
        </div>

        {isEditing && podeAlterarStatus ? (
          <div>
            <label
              htmlFor="material-status"
              className="block text-xs font-semibold text-foreground-muted mb-1.5 uppercase tracking-wide"
            >
              Status Logístico
            </label>
            <div className="relative">
              <select
                id="material-status"
                disabled={isPending}
                value={statusLogistico}
                onChange={(e) => setStatusLogistico(e.target.value as StatusLogistico)}
                className="w-full h-9 appearance-none border border-border-subtle bg-surface-subtle rounded-lg pl-3 pr-8 text-sm text-foreground focus:bg-surface focus:outline-none focus:ring-1 focus:ring-border-strong transition-colors cursor-pointer disabled:opacity-60"
              >
                {STATUS_LOGISTICO_OPCOES.map((opcao) => (
                  <option
                    key={opcao.valor}
                    value={opcao.valor}
                    className="bg-surface text-foreground"
                  >
                    {opcao.rotuloTitulo}
                  </option>
                ))}
              </select>
              <ChevronDown
                aria-hidden="true"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none"
              />
            </div>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground self-center">
            Status: {isEditing ? obterMetaStatusLogistico(statusLogistico).rotulo : "Em Solicitação"}
          </p>
        )}
      </div>

      <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-border-subtle">
        <Button
          type="button"
          variant="outline"
          disabled={isPending}
          onClick={onCancelar}
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
              <Loader2 className="w-3.5 h-3.5 motion-safe:animate-spin" aria-hidden="true" />
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
}: ModalMaterialProps) {
  const isEditing = Boolean(materialParaEditar);
  const perfil = useAuthStore((s) => s.usuario?.perfil?.nomePerfil);
  const podeAlterarStatus = podeAlterarStatusEmEdicaoCadastral(perfil);

  const adicionarMutation = useAdicionarMaterial();
  const atualizarMutation = useAtualizarDadosMaterial();
  const isPending = adicionarMutation.isPending || atualizarMutation.isPending;
  const { vigente, iniciarOperacao, liberarOperacao, informarErro } = useSessaoMontadaMaterial();

  const fecharModal = () => {
    if (!isPending) onClose();
  };

  const handleSalvar = async (dados: DadosSubmitModalMaterial) => {
    const sessao = iniciarOperacao(true);
    if (sessao === undefined) return;
    try {
      if (isEditing && materialParaEditar) {
        await atualizarMutation.mutateAsync(
          {
            id: materialParaEditar.id,
            obraId,
            payload: {
              tipo: dados.tipo,
              quantidade: dados.quantidade,
              ...(podeAlterarStatus ? { statusLogistico: dados.statusLogistico } : {}),
            },
          },
          undefined,
          sessao
        );
        if (vigente(sessao)) {
          toast.success("Insumo atualizado com sucesso");
          onClose();
        }
      } else {
        await adicionarMutation.mutateAsync(
          {
            obraId,
            payload: {
              tipo: dados.tipo,
              quantidade: dados.quantidade,
            },
          },
          undefined,
          sessao
        );
        if (vigente(sessao)) {
          toast.success("Material registrado com sucesso");
          onClose();
        }
      }
    } catch (erro) {
      informarErro(erro, sessao, isEditing ? "Erro ao atualizar insumo" : "Erro ao registrar material");
    } finally {
      liberarOperacao();
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={fecharModal}
      fecharBloqueado={isPending}
      titulo={isEditing ? "Editar Insumo da Obra" : "Adicionar Insumo à Obra"}
      subtitulo={
        isEditing
          ? `Atualize as especificações e quantidades do item #${materialParaEditar?.id}`
          : "Preencha os dados do material para controle e acompanhamento logístico"
      }
      icone={
        <div className="w-10 h-10 rounded-xl bg-surface border border-border-subtle text-foreground-muted flex items-center justify-center shrink-0">
          <Package className="w-5 h-5" aria-hidden="true" />
        </div>
      }
      className="max-w-md w-full"
    >
      {isOpen && (
        <FormularioMaterial
          key={materialParaEditar?.id ?? "novo"}
          materialParaEditar={materialParaEditar}
          podeAlterarStatus={podeAlterarStatus}
          isPending={isPending}
          onSalvar={handleSalvar}
          onCancelar={fecharModal}
        />
      )}
    </Modal>
  );
}
