import { useState, useRef, useId, useLayoutEffect, type FormEvent } from "react";
import { toast } from "sonner";
import { useAuthStore } from "@/shared/stores/useAuthStore";
import { Modal } from "@/shared/components/ui/Modal";
import { Button } from "@/shared/components/ui/Button";
import { Package, Loader2, ChevronDown } from "lucide-react";
import type { Material, StatusLogistico } from "@/shared/types/materiais";
import type { Produto } from "@/shared/types/produtos";
import { formatarMoeda } from "@/shared/lib/formatters";
import {
  STATUS_LOGISTICO_OPCOES,
  obterMetaStatusLogistico,
  podeAlterarStatusEmEdicaoCadastral,
} from "@/shared/constants/statusLogistico";
import {
  useAdicionarMaterial,
  useAtualizarDadosMaterial,
  useProdutosCatalogoAtivos,
} from "../hooks/useMateriais";
import { useSessaoMontadaMaterial } from "../hooks/useSessaoMontadaMaterial";
import { validarFormularioMaterial, type FalhaValidacaoMaterial } from "../lib/validacaoMaterial";

interface ModalMaterialProps {
  isOpen: boolean;
  onClose: () => void;
  obraId: number;
  materialParaEditar?: Material | null;
}

interface DadosSubmitModalMaterial {
  produtoId?: number;
  tipo: string;
  quantidade: number;
  quantidadeUtilizada?: number | null;
  statusLogistico: StatusLogistico;
}

interface FormularioMaterialProps {
  materialParaEditar?: Material | null;
  produtosCatalogo: Produto[];
  carregandoCatalogo: boolean;
  erroCatalogo: boolean;
  podeVerValores: boolean;
  podeAlterarStatus: boolean;
  isPending: boolean;
  onSalvar: (dados: DadosSubmitModalMaterial) => Promise<void>;
  onCancelar: () => void;
}

function FormularioMaterial({
  materialParaEditar,
  produtosCatalogo,
  carregandoCatalogo,
  erroCatalogo,
  podeVerValores,
  podeAlterarStatus,
  isPending,
  onSalvar,
  onCancelar,
}: FormularioMaterialProps) {
  const isEditing = Boolean(materialParaEditar);

  const [produtoIdSelecionado, setProdutoIdSelecionado] = useState<string>(
    materialParaEditar?.produtoId ? String(materialParaEditar.produtoId) : ""
  );
  const [tipo, setTipo] = useState(
    materialParaEditar?.produtoNome || materialParaEditar?.tipo || materialParaEditar?.descricao || ""
  );
  const [quantidade, setQuantidade] = useState(String(materialParaEditar?.quantidade ?? 1));
  const [quantidadeUtilizada, setQuantidadeUtilizada] = useState(
    materialParaEditar?.quantidadeUtilizada !== undefined &&
      materialParaEditar?.quantidadeUtilizada !== null
      ? String(materialParaEditar.quantidadeUtilizada)
      : ""
  );
  const [statusLogistico, setStatusLogistico] = useState<StatusLogistico>(
    materialParaEditar?.statusLogistico || "EmSolicitacao"
  );
  const [falha, setFalha] = useState<FalhaValidacaoMaterial | null>(null);
  const produtoRef = useRef<HTMLSelectElement>(null);
  const tipoRef = useRef<HTMLInputElement>(null);
  const quantidadeRef = useRef<HTMLInputElement>(null);
  const quantidadeUtilizadaRef = useRef<HTMLInputElement>(null);
  const erroId = useId();

  useLayoutEffect(() => {
    if (!falha) return;
    if (falha.campo === "produtoId") produtoRef.current?.focus();
    else if (falha.campo === "tipo") tipoRef.current?.focus();
    else if (falha.campo === "quantidadeUtilizada") quantidadeUtilizadaRef.current?.focus();
    else quantidadeRef.current?.focus();
  }, [falha]);

  const produtoAtivoSelecionado = produtosCatalogo.find(
    (p) => p.id === Number(produtoIdSelecionado)
  );

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (isPending) return;
    setFalha(null);

    const inputQtd = quantidadeRef.current;
    const validacao = validarFormularioMaterial({
      produtoId: !isEditing ? (produtoIdSelecionado ? Number(produtoIdSelecionado) : null) : undefined,
      exigirProduto: !isEditing,
      tipo: !isEditing ? (produtoAtivoSelecionado?.nome ?? tipo) : tipo,
      quantidade,
      ...(isEditing && podeAlterarStatus ? { quantidadeUtilizada } : {}),
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
      ...(validacao.produtoId ? { produtoId: validacao.produtoId } : {}),
      tipo: validacao.tipo,
      quantidade: validacao.quantidade,
      ...(validacao.quantidadeUtilizada !== undefined
        ? { quantidadeUtilizada: validacao.quantidadeUtilizada }
        : {}),
      statusLogistico,
    });
  };

  return (
    <form noValidate onSubmit={(e) => void handleSubmit(e)} className="p-6 space-y-5">
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
              {materialParaEditar.produtoNome || materialParaEditar.tipo || materialParaEditar.descricao || "Insumo"}
            </p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Identificador: #{materialParaEditar.id}
              {materialParaEditar.unidade ? ` · Unidade: ${materialParaEditar.unidade}` : ""}
            </p>
          </div>
          <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-surface border border-border-subtle text-foreground-secondary shrink-0">
            Qtd atual: {materialParaEditar.quantidade}
          </span>
        </div>
      )}

      {!isEditing ? (
        <div>
          <label
            htmlFor="material-produto"
            className="block text-sm font-semibold text-foreground-muted mb-1.5"
          >
            Produto do catálogo <span aria-hidden="true" className="text-destructive">*</span>
          </label>
          <div className="relative">
            <select
              id="material-produto"
              ref={produtoRef}
              required
              aria-invalid={falha?.campo === "produtoId" || undefined}
              aria-describedby={falha?.campo === "produtoId" ? erroId : undefined}
              disabled={isPending || carregandoCatalogo}
              value={produtoIdSelecionado}
              onChange={(e) => {
                const novoId = e.target.value;
                setProdutoIdSelecionado(novoId);
                const encontrado = produtosCatalogo.find((p) => p.id === Number(novoId));
                setTipo(encontrado?.nome ?? "");
                setFalha((atual) => (atual?.campo === "produtoId" ? null : atual));
              }}
              className="w-full h-10 appearance-none border border-border-subtle bg-surface-subtle rounded-lg pl-3.5 pr-9 text-sm text-foreground focus:bg-surface focus:outline-none focus:ring-2 focus:ring-border-subtle focus:border-border-strong transition-colors cursor-pointer disabled:opacity-60"
            >
              <option value="">
                {carregandoCatalogo
                  ? "Carregando catálogo de produtos..."
                  : erroCatalogo
                    ? "Erro ao carregar produtos"
                    : produtosCatalogo.length === 0
                      ? "Nenhum produto ativo no catálogo"
                      : "Selecione um produto ativo..."}
              </option>
              {produtosCatalogo.map((prod) => (
                <option key={prod.id} value={prod.id} className="bg-surface text-foreground">
                  {prod.nome} ({prod.unidade})
                  {podeVerValores && typeof prod.precoUnitario === "number"
                    ? ` — ${formatarMoeda(prod.precoUnitario)}`
                    : ""}
                </option>
              ))}
            </select>
            <ChevronDown
              aria-hidden="true"
              className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none"
            />
          </div>
          {produtoAtivoSelecionado && (
            <p className="text-xs text-muted-foreground mt-1.5">
              Categoria: {produtoAtivoSelecionado.tipo} · Unidade: {produtoAtivoSelecionado.unidade}
              {podeVerValores && typeof produtoAtivoSelecionado.precoUnitario === "number"
                ? ` · Valor unitário de referência: ${formatarMoeda(produtoAtivoSelecionado.precoUnitario)}`
                : ""}
            </p>
          )}
        </div>
      ) : (
        <div>
          <label
            htmlFor="material-tipo"
            className="block text-sm font-semibold text-foreground-muted mb-1.5"
          >
            Descrição / Tipo do Material <span aria-hidden="true" className="text-destructive">*</span>
          </label>
          <input
            id="material-tipo"
            ref={tipoRef}
            aria-invalid={falha?.campo === "tipo" || undefined}
            aria-describedby={falha?.campo === "tipo" ? erroId : undefined}
            type="text"
            required
            disabled={isPending || Boolean(materialParaEditar?.produtoId)}
            value={tipo}
            onChange={(e) => {
              setTipo(e.target.value);
              setFalha((atual) => (atual?.campo === "tipo" ? null : atual));
            }}
            placeholder="Descrição do insumo"
            className="w-full h-10 border border-border-subtle bg-surface-subtle rounded-lg px-3.5 text-sm text-foreground focus:bg-surface focus:outline-none focus:ring-2 focus:ring-border-subtle transition-colors disabled:opacity-60"
          />
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label
            htmlFor="material-quantidade"
            className="block text-sm font-semibold text-foreground-muted mb-1.5"
          >
            Quantidade {produtoAtivoSelecionado ? `(${produtoAtivoSelecionado.unidade})` : ""}{" "}
            <span aria-hidden="true" className="text-destructive">*</span>
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
            className="w-full h-10 border border-border-subtle bg-surface-subtle rounded-lg px-3.5 text-sm text-foreground font-mono text-right focus:bg-surface focus:outline-none focus:ring-2 focus:ring-border-subtle transition-colors disabled:opacity-60"
          />
        </div>

        {isEditing && podeAlterarStatus ? (
          <div>
            <label
              htmlFor="material-status"
              className="block text-sm font-semibold text-foreground-muted mb-1.5"
            >
              Status Logístico
            </label>
            <div className="relative">
              <select
                id="material-status"
                disabled={isPending}
                value={statusLogistico}
                onChange={(e) => setStatusLogistico(e.target.value as StatusLogistico)}
                className="w-full h-10 appearance-none border border-border-subtle bg-surface-subtle rounded-lg pl-3.5 pr-8 text-sm text-foreground focus:bg-surface focus:outline-none focus:ring-2 focus:ring-border-subtle transition-colors cursor-pointer disabled:opacity-60"
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
          <div className="flex flex-col justify-end pb-2">
            <p className="text-xs text-muted-foreground">
              Status inicial:{" "}
              <span className="font-semibold text-foreground-secondary">
                {isEditing ? obterMetaStatusLogistico(statusLogistico).rotulo : "Em Solicitação"}
              </span>
            </p>
          </div>
        )}
      </div>

      {isEditing && podeAlterarStatus && (
        <div>
          <label
            htmlFor="material-quantidade-utilizada"
            className="block text-sm font-semibold text-foreground-muted mb-1.5"
          >
            Quantidade Utilizada
          </label>
          <input
            id="material-quantidade-utilizada"
            ref={quantidadeUtilizadaRef}
            aria-invalid={falha?.campo === "quantidadeUtilizada" || undefined}
            aria-describedby={falha?.campo === "quantidadeUtilizada" ? erroId : undefined}
            type="number"
            min="0"
            max={quantidade || undefined}
            step="1"
            disabled={isPending}
            value={quantidadeUtilizada}
            onChange={(e) => {
              setQuantidadeUtilizada(e.target.value);
              setFalha((atual) => (atual?.campo === "quantidadeUtilizada" ? null : atual));
            }}
            placeholder="Opcional"
            className="w-full h-10 border border-border-subtle bg-surface-subtle rounded-lg px-3.5 text-sm text-foreground font-mono text-right focus:bg-surface focus:outline-none focus:ring-2 focus:ring-border-subtle transition-colors disabled:opacity-60"
          />
        </div>
      )}

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
          disabled={isPending || (!isEditing && carregandoCatalogo)}
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
  const podeVerValores = perfil === "Administrador" || perfil === "Financeiro";

  const {
    data: produtosCatalogo = [],
    isLoading: carregandoCatalogo,
    isError: erroCatalogo,
  } = useProdutosCatalogoAtivos(isOpen && !isEditing);

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
              ...(materialParaEditar.produtoId ? {} : { tipo: dados.tipo }),
              quantidade: dados.quantidade,
              ...(podeAlterarStatus
                ? {
                    statusLogistico: dados.statusLogistico,
                    ...(dados.quantidadeUtilizada !== undefined
                      ? { quantidadeUtilizada: dados.quantidadeUtilizada }
                      : {}),
                  }
                : {}),
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
              produtoId: dados.produtoId,
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
          : "Selecione um produto ativo do catálogo e defina a quantidade solicitada"
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
          produtosCatalogo={produtosCatalogo}
          carregandoCatalogo={carregandoCatalogo}
          erroCatalogo={erroCatalogo}
          podeVerValores={podeVerValores}
          podeAlterarStatus={podeAlterarStatus}
          isPending={isPending}
          onSalvar={handleSalvar}
          onCancelar={fecharModal}
        />
      )}
    </Modal>
  );
}
