import { useState, useMemo } from "react";
import { Link } from "react-router";
import { ExternalLink, Plus, X, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import FeedbackLoading from "@/shared/components/feedback/FeedbackLoading";
import FeedbackErro from "@/shared/components/feedback/FeedbackErro";
import { EmptyState } from "@/shared/components/feedback/EmptyState";
import { ConfirmDialog } from "@/shared/components/feedback/ConfirmDialog";
import { deveExibirErroLocal, statusHttp } from "@/shared/lib/sessaoOperacao";
import { cn } from "@/shared/lib/utils";
import type { Material, StatusLogistico } from "@/shared/types/materiais";
import { STATUS_LOGISTICO_OPCOES, obterMetaStatusLogistico } from "@/shared/constants/statusLogistico";
import {
  useMateriais,
  useAdicionarMaterial,
  useAtualizarDadosMaterial,
  useAtualizarStatusMaterial,
  useLoteMateriais,
} from "../hooks/useMateriais";
import { MENSAGEM_ERRO_403_MATERIAL, useSessaoMontadaMaterial } from "../hooks/useSessaoMontadaMaterial";
import {
  validarFormularioMaterial,
  type CampoValidacaoMaterial,
  type FalhaValidacaoMaterial,
  type ValidadeInputMaterial,
} from "../lib/validacaoMaterial";
import type { LoteMateriais } from "../types/gestaoMateriais";
import { FormularioMaterialCompacto } from "./FormularioMaterialCompacto";
import { BarraLoteMateriais } from "./BarraLoteMateriais";

interface PainelMateriaisObraProps {
  obraId: number;
  somenteLeitura?: boolean;
  podeAlterarStatus?: boolean;
}

export function PainelMateriaisObra({
  obraId,
  somenteLeitura = true,
  podeAlterarStatus = false,
}: PainelMateriaisObraProps) {
  const podeEditar = !somenteLeitura;
  const podeMudarStatus = podeEditar && podeAlterarStatus;

  const { data: materiais, isLoading, isError, refetch } = useMateriais(obraId);
  const { mutateAsync: adicionarMaterial, isPending: criando } = useAdicionarMaterial();
  const { mutateAsync: atualizarDadosMaterial, isPending: editando } = useAtualizarDadosMaterial();
  const { mutateAsync: atualizarStatus, isPending: mudandoStatus } = useAtualizarStatusMaterial();
  const { mutateAsync: executarLote, isPending: lotePendente } = useLoteMateriais();
  const ocupado = criando || editando || mudandoStatus || lotePendente;

  const { vigente, iniciarOperacao, liberarOperacao, informarErro } = useSessaoMontadaMaterial();

  const [itensSelecionados, setItensSelecionados] = useState<Set<number>>(new Set());
  const [formularioAberto, setFormularioAberto] = useState(false);
  const [itemEmEdicao, setItemEmEdicao] = useState<Material | null>(null);

  const [formTipo, setFormTipo] = useState("");
  const [formQuantidade, setFormQuantidade] = useState("1");
  const [formStatus, setFormStatus] = useState<StatusLogistico>("Comprado");
  const [falha, setFalha] = useState<FalhaValidacaoMaterial | null>(null);

  const [dialogoExclusaoAberto, setDialogoExclusaoAberto] = useState(false);
  const [idsParaExcluir, setIdsParaExcluir] = useState<number[]>([]);

  const listaMateriais = useMemo(() => materiais || [], [materiais]);
  const todosSelecionados =
    listaMateriais.length > 0 && itensSelecionados.size === listaMateriais.length;
  const temSelecao = itensSelecionados.size > 0;

  const toggleSelecionarTodos = () => {
    if (todosSelecionados) {
      setItensSelecionados(new Set());
    } else {
      setItensSelecionados(new Set(listaMateriais.map((m) => m.id)));
    }
  };

  const toggleSelecionarItem = (id: number) => {
    setItensSelecionados((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const limparSelecao = () => setItensSelecionados(new Set());

  const limparFalhaCampo = (campo: CampoValidacaoMaterial) => {
    setFalha((atual) => (atual?.campo === campo ? null : atual));
  };

  const abrirFormCriacao = () => {
    setFalha(null);
    setItemEmEdicao(null);
    setFormTipo("");
    setFormQuantidade("1");
    setFormStatus("Comprado");
    setFormularioAberto((prev) => !prev);
  };

  const abrirFormEdicao = (mat: Material) => {
    setFalha(null);
    setItemEmEdicao(mat);
    setFormTipo(mat.tipo || mat.descricao || "");
    setFormQuantidade(String(mat.quantidade));
    setFormStatus(mat.statusLogistico || "Comprado");
    setFormularioAberto(true);
  };

  const fecharFormulario = () => {
    setFalha(null);
    setFormularioAberto(false);
    setItemEmEdicao(null);
  };

  const handleSalvarFormulario = async (validadeQuantidade?: ValidadeInputMaterial) => {
    setFalha(null);
    const validacao = validarFormularioMaterial({
      tipo: formTipo,
      quantidade: formQuantidade,
      validadeQuantidade,
    });
    if (!validacao.ok) {
      setFalha({ ...validacao.falha });
      return;
    }

    if (!podeEditar || ocupado) return;
    const sessao = iniciarOperacao(true);
    if (sessao === undefined) return;

    try {
      if (itemEmEdicao) {
        await atualizarDadosMaterial(
          {
            id: itemEmEdicao.id,
            obraId,
            payload: {
              tipo: validacao.tipo,
              quantidade: validacao.quantidade,
              ...(podeMudarStatus ? { statusLogistico: formStatus } : {}),
            },
          },
          undefined,
          sessao
        );
        if (vigente(sessao)) {
          toast.success(`Insumo "${validacao.tipo}" atualizado com sucesso`);
          fecharFormulario();
        }
      } else {
        await adicionarMaterial(
          {
            obraId,
            payload: { tipo: validacao.tipo, quantidade: validacao.quantidade },
          },
          undefined,
          sessao
        );
        if (vigente(sessao)) {
          toast.success("Material registrado com sucesso");
          fecharFormulario();
        }
      }
    } catch (erro) {
      informarErro(erro, sessao, "Não foi possível salvar os materiais. Tente novamente.");
    } finally {
      liberarOperacao();
    }
  };

  const handleAlterarStatusIndividual = async (id: number, novoStatus: StatusLogistico) => {
    if (!podeMudarStatus || ocupado) return;
    const sessao = iniciarOperacao(true);
    if (sessao === undefined) return;
    try {
      await atualizarStatus({ id, statusLogistico: novoStatus, obraId }, undefined, sessao);
      if (vigente(sessao)) toast.success("Status do insumo atualizado com sucesso");
    } catch (erro) {
      informarErro(erro, sessao, "Não foi possível salvar os materiais. Tente novamente.");
    } finally {
      liberarOperacao();
    }
  };

  const processarLote = async (lote: LoteMateriais) => {
    if (!podeEditar || ocupado) return;
    if (lote.acao === "status" && !podeMudarStatus) return;
    if (lote.ids.length === 0) return;

    const sessao = iniciarOperacao(true);
    if (sessao === undefined) return;

    try {
      const resultados = await executarLote(lote, undefined, sessao);
      if (!vigente(sessao)) return;
      const falhados = lote.ids.filter((_, i) => resultados[i].status === "rejected");
      const sucessos = lote.ids.length - falhados.length;
      setItensSelecionados(new Set(falhados));

      if (falhados.length) {
        const apenas403Visivel =
          sucessos === 0 &&
          resultados.every(
            (r) =>
              r.status === "rejected" &&
              statusHttp(r.reason) === 403 &&
              deveExibirErroLocal(r.reason)
          );
        if (apenas403Visivel) {
          toast.error(MENSAGEM_ERRO_403_MATERIAL);
        } else {
          toast.warning(
            `${sucessos} concluídos. ${falhados.length} falharam. Tente novamente os itens selecionados.`
          );
        }
      } else {
        toast.success(
          lote.acao === "excluir"
            ? "Insumos removidos com sucesso"
            : "Insumos atualizados com sucesso"
        );
      }
      setDialogoExclusaoAberto(false);
      setIdsParaExcluir([]);
    } catch (erro) {
      informarErro(erro, sessao, "Não foi possível salvar os materiais. Tente novamente.");
    } finally {
      liberarOperacao();
    }
  };

  const handleAplicarStatusEmLote = (statusLogistico: StatusLogistico) => {
    void processarLote({
      ids: Array.from(itensSelecionados),
      obraId,
      acao: "status",
      statusLogistico,
    });
  };

  const solicitarExclusaoIndividual = (id: number) => {
    setIdsParaExcluir([id]);
    setDialogoExclusaoAberto(true);
  };

  const solicitarExclusaoLote = () => {
    if (itensSelecionados.size === 0) return;
    setIdsParaExcluir(Array.from(itensSelecionados));
    setDialogoExclusaoAberto(true);
  };

  const executarExclusao = () => {
    void processarLote({ ids: [...idsParaExcluir], obraId, acao: "excluir" });
  };

  if (isLoading) return <FeedbackLoading mensagem="Carregando insumos da obra..." />;
  if (isError) {
    return (
      <FeedbackErro
        mensagem="Não foi possível carregar os materiais da obra."
        onTentarNovamente={() => void refetch()}
      />
    );
  }

  return (
    <div className="flex flex-col relative pb-20" aria-busy={ocupado}>
      {lotePendente && (
        <output className="block text-xs text-muted-foreground">
          Processando materiais...
        </output>
      )}
      <fieldset disabled={ocupado} className="min-w-0 border-0 p-0 m-0">
        <div className="flex items-center justify-between px-1.5 py-1 mb-2">
          <div className="flex items-center gap-2">
            {podeEditar && listaMateriais.length > 0 && (
              <input
                type="checkbox"
                id="chkMasterA"
                checked={todosSelecionados}
                onChange={toggleSelecionarTodos}
                className="w-3.5 h-3.5 mt-0.5 rounded text-primary focus:ring-primary cursor-pointer accent-primary shrink-0"
                title="Selecionar todos os insumos"
                aria-label="Selecionar todos os insumos"
              />
            )}

            {temSelecao && (
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-info-light text-info border border-info-border">
                  {itensSelecionados.size} selecionado{itensSelecionados.size > 1 ? "s" : ""}
                </span>
                <button
                  type="button"
                  onClick={limparSelecao}
                  className="w-5 h-5 rounded flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-surface-subtle transition-colors cursor-pointer"
                  title="Desmarcar seleção"
                  aria-label="Desmarcar seleção"
                >
                  <X className="w-3 h-3 stroke-[2.5]" aria-hidden="true" />
                </button>
              </div>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            <Link
              to={`/obras/${obraId}/materiais`}
              className="w-7 h-7 rounded-md border border-border-subtle bg-surface text-muted-foreground hover:text-foreground hover:bg-surface-subtle flex items-center justify-center transition-colors"
              title="Abrir tela completa de materiais da obra"
              aria-label="Abrir tela completa de materiais"
            >
              <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
            </Link>

            {podeEditar && (
              <button
                type="button"
                onClick={abrirFormCriacao}
                className={cn(
                  "w-7 h-7 rounded-md flex items-center justify-center transition-colors cursor-pointer",
                  formularioAberto
                    ? "bg-surface-subtle text-foreground-muted hover:bg-muted border border-border-subtle"
                    : "bg-primary text-primary-foreground hover:bg-primary-hover shadow-xs"
                )}
                title={formularioAberto ? "Fechar formulário" : "Adicionar novo insumo"}
                aria-label={formularioAberto ? "Fechar formulário" : "Adicionar novo insumo"}
              >
                {formularioAberto ? (
                  <X className="w-3.5 h-3.5 stroke-[2.5]" aria-hidden="true" />
                ) : (
                  <Plus className="w-3.5 h-3.5 stroke-[2.5]" aria-hidden="true" />
                )}
              </button>
            )}
          </div>
        </div>

        {formularioAberto && podeEditar && (
          <FormularioMaterialCompacto
            itemEmEdicao={itemEmEdicao}
            formTipo={formTipo}
            onFormTipoChange={setFormTipo}
            formQuantidade={formQuantidade}
            onFormQuantidadeChange={setFormQuantidade}
            podeAlterarStatus={podeMudarStatus}
            formStatus={formStatus}
            onFormStatusChange={setFormStatus}
            salvando={criando || editando}
            falha={falha}
            onLimparFalhaCampo={limparFalhaCampo}
            onSubmeter={(validade) => void handleSalvarFormulario(validade)}
            onCancelar={fecharFormulario}
          />
        )}

        {listaMateriais.length === 0 ? (
          <EmptyState
            titulo="Nenhum insumo cadastrado nesta obra"
            descricao="Adicione insumos para acompanhar os materiais da obra."
            acao={
              podeEditar
                ? { label: "Adicionar primeiro insumo", onClick: abrirFormCriacao }
                : undefined
            }
          />
        ) : (
          <div className="flex flex-col divide-y divide-border-subtle/60">
            {listaMateriais.map((mat) => {
              const isSelected = itensSelecionados.has(mat.id);
              const metaStatus = obterMetaStatusLogistico(mat.statusLogistico);
              return (
                <div
                  key={mat.id}
                  data-material-id={mat.id}
                  className={cn(
                    "py-2 px-1.5 flex items-center justify-between gap-2.5 transition-colors group",
                    isSelected && "bg-info-light/40 rounded-md"
                  )}
                >
                  <div className="flex items-start gap-2.5 min-w-0 flex-1">
                    {podeEditar && (
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelecionarItem(mat.id)}
                        className="w-3.5 h-3.5 mt-0.5 rounded text-primary focus:ring-primary cursor-pointer accent-primary shrink-0"
                        title="Selecionar insumo"
                        aria-label={`Selecionar ${mat.tipo || mat.descricao}`}
                      />
                    )}
                    <div className="flex flex-col min-w-0">
                      <span className="text-xs font-semibold text-foreground leading-snug break-words">
                        {mat.tipo || mat.descricao || "Material"}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        Quantidade: <strong>{mat.quantidade} un.</strong>
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {podeMudarStatus ? (
                      <select
                        value={metaStatus.valor}
                        onChange={(e) =>
                          void handleAlterarStatusIndividual(mat.id, e.target.value as StatusLogistico)
                        }
                        disabled={mudandoStatus}
                        className={cn(
                          "text-xs font-semibold px-2 py-0.5 rounded-full border cursor-pointer focus:outline-none",
                          metaStatus.badgeClasse
                        )}
                        title="Alterar status deste insumo"
                        aria-label={`Alterar status de ${mat.tipo || mat.descricao}`}
                      >
                        {STATUS_LOGISTICO_OPCOES.map((opcao) => (
                          <option key={opcao.valor} value={opcao.valor}>
                            {opcao.rotulo}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <span
                        className={cn(
                          "text-xs font-semibold px-2 py-0.5 rounded-full border",
                          metaStatus.badgeClasse
                        )}
                      >
                        {metaStatus.rotulo}
                      </span>
                    )}

                    {podeEditar && (
                      <>
                        <button
                          type="button"
                          onClick={() => abrirFormEdicao(mat)}
                          className="w-6 h-6 rounded flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-surface-subtle transition-colors cursor-pointer"
                          title="Alterar dados cadastrais"
                          aria-label={`Alterar ${mat.tipo || mat.descricao}`}
                        >
                          <Pencil className="w-3 h-3" aria-hidden="true" />
                        </button>
                        <button
                          type="button"
                          onClick={() => solicitarExclusaoIndividual(mat.id)}
                          className="w-6 h-6 rounded flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive-light transition-colors cursor-pointer"
                          title="Excluir insumo"
                          aria-label={`Excluir ${mat.tipo || mat.descricao}`}
                        >
                          <Trash2 className="w-3 h-3" aria-hidden="true" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {temSelecao && podeEditar && (
          <BarraLoteMateriais
            podeAlterarStatus={podeMudarStatus}
            onAplicarStatus={handleAplicarStatusEmLote}
            onSolicitarExclusao={solicitarExclusaoLote}
            onLimparSelecao={limparSelecao}
          />
        )}
      </fieldset>

      <ConfirmDialog
        isOpen={dialogoExclusaoAberto}
        onClose={() => {
          if (!ocupado) setDialogoExclusaoAberto(false);
        }}
        titulo={idsParaExcluir.length > 1 ? "Excluir insumos selecionados?" : "Excluir insumo?"}
        descricao={
          idsParaExcluir.length > 1
            ? `Tem certeza que deseja excluir ${idsParaExcluir.length} insumos desta obra? Esta ação não pode ser desfeita.`
            : "Tem certeza que deseja remover este insumo da obra? Esta ação não pode ser desfeita."
        }
        labelConfirmar="Excluir"
        labelCancelar="Cancelar"
        isLoading={lotePendente}
        confirmarBloqueado={ocupado}
        variant="danger"
        onConfirm={executarExclusao}
      />
    </div>
  );
}
