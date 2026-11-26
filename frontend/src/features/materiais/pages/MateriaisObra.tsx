import { useEffect, useRef, useState } from "react";
import { useParams, useLocation } from "react-router-dom";
import { toast } from "sonner";
import { useAuthStore } from "@/shared/stores/useAuthStore";
import {
  useMateriais,
  useObraContextoMateriais,
  useAtualizarStatusMaterial,
  useExcluirMaterial,
} from "../hooks/useMateriais";
import { useSessaoMontadaMaterial } from "../hooks/useSessaoMontadaMaterial";
import { ModalMaterial } from "../components/ModalMaterial";
import { PageHeader } from "@/shared/components/ui/PageHeader";
import { Button } from "@/shared/components/ui/Button";
import { IconActionButton } from "@/shared/components/ui/IconActionButton";
import { ConfirmDialog } from "@/shared/components/feedback/ConfirmDialog";
import FeedbackLoading from "@/shared/components/feedback/FeedbackLoading";
import FeedbackErro from "@/shared/components/feedback/FeedbackErro";
import { EmptyState } from "@/shared/components/feedback/EmptyState";
import {
  STATUS_LOGISTICO_OPCOES,
  obterMetaStatusLogistico,
  podeAlterarStatusMaterialObra,
  podeGerenciarCadastroMaterial,
} from "@/shared/constants/statusLogistico";
import {
  Package,
  Plus,
  Pencil,
  Trash2,
  CheckCircle2,
  Clock,
  Truck,
  ShieldCheck,
  ChevronDown,
} from "lucide-react";
import type { StatusLogistico, Material } from "@/shared/types/materiais";
import { formatarMoeda } from "@/shared/lib/formatters";
import { cn } from "@/shared/lib/utils";

const ICONE_TABELA_POR_STATUS: Record<StatusLogistico, typeof Clock> = {
  EmSolicitacao: Clock,
  Comprado: Clock,
  EmTransito: Truck,
  Disponivel: CheckCircle2,
  Utilizado: ShieldCheck,
};

export default function MateriaisObra() {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const locationState = location.state as unknown;
  const obraId = Number(id);

  const perfil = useAuthStore((s) => s.usuario?.perfil?.nomePerfil);
  const podeAlterarStatus = podeAlterarStatusMaterialObra(perfil);
  const podeAdicionar = podeGerenciarCadastroMaterial(perfil);
  const podeVerValores = perfil === "Administrador" || perfil === "Financeiro";

  const { data: materiais, isLoading, isError, error, refetch } = useMateriais(obraId);
  const { data: obra } = useObraContextoMateriais(obraId);

  const atualizarStatusMutation = useAtualizarStatusMaterial();
  const excluirMutation = useExcluirMaterial();
  const { vigente, iniciarOperacao, liberarOperacao, informarErro } = useSessaoMontadaMaterial();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [materialParaEditar, setMaterialParaEditar] = useState<Material | null>(null);
  const [materialParaExcluir, setMaterialParaExcluir] = useState<Material | null>(null);
  const origemExclusaoRef = useRef<HTMLButtonElement | null>(null);
  const [desktop, setDesktop] = useState(() =>
    typeof window !== "undefined" && typeof window.matchMedia === "function"
      ? window.matchMedia("(min-width: 1024px)").matches
      : true
  );

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;
    const media = window.matchMedia("(min-width: 1024px)");
    const atualizar = () => setDesktop(media.matches);
    atualizar();
    media.addEventListener("change", atualizar);
    return () => media.removeEventListener("change", atualizar);
  }, []);

  const handleAlterarStatus = async (
    materialId: number,
    novoStatus?: StatusLogistico,
    quantidadeUtilizada?: number | null
  ): Promise<boolean> => {
    if (!podeAlterarStatus) return false;
    // Sem trava global para permitir alterações independentes por linha.
    const sessao = iniciarOperacao(false);
    if (sessao === undefined) return false;
    try {
      await atualizarStatusMutation.mutateAsync(
        {
          id: materialId,
          ...(novoStatus !== undefined ? { statusLogistico: novoStatus } : {}),
          ...(quantidadeUtilizada !== undefined ? { quantidadeUtilizada } : {}),
          obraId,
        },
        undefined,
        sessao
      );
      if (vigente(sessao)) {
        toast.success("Material atualizado com sucesso");
      }
      return true;
    } catch (erro) {
      informarErro(erro, sessao, "Erro ao atualizar material");
      return false;
    }
  };

  const totalMateriaisEstimado = (materiais ?? []).reduce(
    (acc, mat) =>
      typeof mat.custoUnitario === "number" ? acc + mat.custoUnitario * mat.quantidade : acc,
    0
  );
  const possuiCustos = (materiais ?? []).some((m) => typeof m.custoUnitario === "number");

  const handleConfirmarExclusao = async () => {
    if (!materialParaExcluir || !podeAdicionar) return;
    const sessao = iniciarOperacao(true);
    if (sessao === undefined) return;
    try {
      await excluirMutation.mutateAsync(
        {
          id: materialParaExcluir.id,
          obraId,
        },
        undefined,
        sessao
      );
      if (vigente(sessao)) {
        toast.success("Material removido com sucesso");
        setMaterialParaExcluir(null);
      }
    } catch (erro) {
      informarErro(erro, sessao, "Erro ao remover material");
    } finally {
      liberarOperacao();
    }
  };

  const renderCampoUtilizada = (mat: Material, nomeExibicao: string) => {
    if (podeAlterarStatus) {
      return (
        <label className="inline-flex items-center gap-1 text-[11px] text-muted-foreground font-sans">
          <span>Util.:</span>
          <input
            key={`${mat.id}-${mat.quantidadeUtilizada ?? "vazio"}`}
            type="number"
            min={0}
            max={mat.quantidade}
            step={1}
            defaultValue={mat.quantidadeUtilizada ?? ""}
            aria-label={`Quantidade utilizada de ${nomeExibicao}`}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                e.currentTarget.blur();
              } else if (e.key === "Escape") {
                const atual = mat.quantidadeUtilizada ?? null;
                e.currentTarget.value = atual === null ? "" : String(atual);
                e.currentTarget.blur();
              }
            }}
            onBlur={(e) => {
              const inputEl = e.currentTarget;
              const bruto = inputEl.value.trim();
              const novoValor = bruto === "" ? null : Number(bruto);
              const atual = mat.quantidadeUtilizada ?? null;
              if (novoValor === atual) return;
              if (
                novoValor !== null &&
                (!Number.isSafeInteger(novoValor) ||
                  novoValor < 0 ||
                  novoValor > mat.quantidade)
              ) {
                toast.error("Informe uma quantidade utilizada entre 0 e a quantidade solicitada.");
                inputEl.value = atual === null ? "" : String(atual);
                return;
              }
              void handleAlterarStatus(mat.id, undefined, novoValor).then((ok) => {
                if (!ok) {
                  inputEl.value = atual === null ? "" : String(atual);
                }
              });
            }}
            className="w-14 h-6 px-1.5 rounded border border-border-strong bg-surface-subtle text-right font-mono text-xs tabular-nums text-foreground focus:bg-surface focus-visible:outline-none focus-visible:border-info focus-visible:ring-2 focus-visible:ring-info/25"
          />
        </label>
      );
    }
    if (mat.quantidadeUtilizada) {
      return (
        <span className="text-xs text-muted-foreground font-sans font-normal tabular-nums">
          ({mat.quantidadeUtilizada} util.)
        </span>
      );
    }
    return null;
  };

  const renderSeletorStatus = (mat: Material, nomeExibicao: string) => {
    const metaStatus = obterMetaStatusLogistico(mat.statusLogistico);
    const IconeStatus = ICONE_TABELA_POR_STATUS[metaStatus.valor];
    if (podeAlterarStatus) {
      return (
        <div className="relative inline-flex items-center">
          <select
            aria-label={`Status logístico de ${nomeExibicao}`}
            value={metaStatus.valor}
            disabled={
              atualizarStatusMutation.isPending &&
              atualizarStatusMutation.variables?.id === mat.id
            }
            onChange={(e) =>
              void handleAlterarStatus(
                mat.id,
                e.target.value as StatusLogistico
              )
            }
            className={cn(
              "appearance-none text-xs font-semibold pl-2.5 pr-6 py-1 rounded-full border cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-info/25 transition-colors",
              metaStatus.badgeClasse
            )}
            title="Alterar status logístico"
          >
            {STATUS_LOGISTICO_OPCOES.map((opcao) => (
              <option
                key={opcao.valor}
                value={opcao.valor}
                className="bg-surface text-foreground"
              >
                {opcao.rotuloTabela}
              </option>
            ))}
          </select>
          <ChevronDown
            aria-hidden="true"
            className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-current pointer-events-none opacity-60"
          />
        </div>
      );
    }
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border",
          metaStatus.badgeClasse
        )}
      >
        <IconeStatus className="w-3.5 h-3.5" aria-hidden="true" />{" "}
        {metaStatus.rotuloTabela}
      </span>
    );
  };

  const renderAcoesLinha = (mat: Material) => {
    if (!podeAdicionar) return null;
    return (
      <div className="flex items-center justify-end gap-1">
        <IconActionButton
          size="sm"
          onClick={() => {
            setMaterialParaEditar(mat);
            setIsModalOpen(true);
          }}
          title="Editar este insumo"
          label={`Editar ${mat.produtoNome || mat.tipo || mat.descricao || "insumo"}`}
        >
          <Pencil className="w-3.5 h-3.5" aria-hidden="true" />
        </IconActionButton>
        <IconActionButton
          size="sm"
          tone="destructive"
          onClick={(e) => {
            origemExclusaoRef.current = e.currentTarget;
            setMaterialParaExcluir(mat);
          }}
          title="Remover este insumo"
          label={`Remover ${mat.produtoNome || mat.tipo || mat.descricao || "insumo"}`}
        >
          <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
        </IconActionButton>
      </div>
    );
  };

  const clienteNome = obra?.cliente?.nome;
  const subtituloHeader = isLoading
    ? "Carregando insumos da obra no servidor..."
    : isError
      ? "Falha na comunicação com o servidor"
      : clienteNome
        ? `Cliente: ${clienteNome} · Acompanhamento Logístico`
        : "Acompanhamento Logístico";

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-background-app">
      <PageHeader
        title="Gestão de Insumos e Materiais"
        subtitle={subtituloHeader}
        backTo={`/obras/${obraId}`}
        backState={locationState}
      >
        {podeAdicionar && !isLoading && !isError && (
          <Button
            onClick={() => {
              setMaterialParaEditar(null);
              setIsModalOpen(true);
            }}
            className="controle-compacto flex items-center gap-1.5 h-7 px-2.5 text-xs font-medium cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" aria-hidden="true" />
            Novo Insumo
          </Button>
        )}
      </PageHeader>

      {isLoading ? (
        <FeedbackLoading mensagem="Consultando registros de materiais no banco de dados..." />
      ) : isError ? (
        <FeedbackErro
          titulo="Não foi possível carregar os materiais"
          mensagem={
            error instanceof Error
              ? error.message
              : "Erro ao conectar com a API de materiais. Verifique se o servidor está ativo."
          }
          onTentarNovamente={() => void refetch()}
        />
      ) : (
        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-6">
          <div className="max-w-6xl mx-auto">
            <div className="bg-surface rounded-xl border border-border-subtle overflow-hidden">
              {!materiais || materiais.length === 0 ? (
                <EmptyState
                  icone={Package}
                  titulo="Nenhum material registrado"
                  descricao="Esta obra ainda não possui módulos, inversores ou insumos logísticos cadastrados no sistema."
                  acao={
                    podeAdicionar
                      ? {
                          label: "Adicionar Primeiro Insumo",
                          onClick: () => {
                            setMaterialParaEditar(null);
                            setIsModalOpen(true);
                          },
                        }
                      : undefined
                  }
                />
              ) : desktop ? (
                <div
                  className="overflow-x-auto"
                  tabIndex={0}
                  role="region"
                  aria-label="Tabela com rolagem horizontal"
                >
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-surface-subtle border-b border-border-subtle text-xs font-semibold text-muted-foreground">
                        <th scope="col" className="py-2.5 px-4">Item / Insumo</th>
                        <th scope="col" className="py-2.5 px-4 text-right">Quantidade</th>
                        {podeVerValores && (
                          <>
                            <th scope="col" className="py-2.5 px-4 text-right">Custo Unitário</th>
                            <th scope="col" className="py-2.5 px-4 text-right">Subtotal</th>
                          </>
                        )}
                        <th scope="col" className="py-2.5 px-4">Status Logístico</th>
                        <th scope="col" className="py-2.5 px-4 text-right">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border-subtle">
                      {materiais.map((mat) => {
                        const nomeExibicao = mat.produtoNome || mat.tipo || mat.descricao || "Item sem descrição";
                        return (
                          <tr
                            key={mat.id}
                            className="hover:bg-surface-subtle/50 transition-colors"
                          >
                            <td className="py-2.5 px-4">
                              <p className="text-sm font-semibold text-foreground leading-tight">
                                {nomeExibicao}
                              </p>
                              <p className="text-[11px] text-muted-foreground mt-0.5">
                                {mat.tipo && mat.tipo !== nomeExibicao ? `${mat.tipo} · ` : ""}
                                {mat.unidade ? `${mat.unidade} · ` : ""}
                                <span className="font-mono">#{mat.id}</span>
                              </p>
                            </td>
                            <td className="py-2.5 px-4 text-right font-mono">
                              <div className="inline-flex flex-col items-end gap-1">
                                <span className="text-sm font-bold text-foreground tabular-nums">
                                  {mat.quantidade}
                                  {mat.unidade ? (
                                    <span className="text-xs font-sans font-normal text-muted-foreground ml-1">
                                      {mat.unidade}
                                    </span>
                                  ) : null}
                                </span>
                                {renderCampoUtilizada(mat, nomeExibicao)}
                              </div>
                            </td>
                            {podeVerValores && (
                              <>
                                <td className="py-2.5 px-4 text-right font-mono text-sm text-foreground-secondary tabular-nums whitespace-nowrap">
                                  {typeof mat.custoUnitario === "number"
                                    ? formatarMoeda(mat.custoUnitario)
                                    : "—"}
                                </td>
                                <td className="py-2.5 px-4 text-right font-mono text-sm font-semibold text-foreground tabular-nums whitespace-nowrap">
                                  {typeof mat.custoUnitario === "number"
                                    ? formatarMoeda(mat.custoUnitario * mat.quantidade)
                                    : "—"}
                                </td>
                              </>
                            )}
                            <td className="py-2.5 px-4">{renderSeletorStatus(mat, nomeExibicao)}</td>
                            <td className="py-2.5 px-4 text-right">{renderAcoesLinha(mat)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                    {podeVerValores && possuiCustos && (
                      <tfoot>
                        <tr className="bg-surface-subtle/60 border-t border-border-subtle text-sm">
                          <td
                            colSpan={3}
                            className="py-2.5 px-4 text-right font-semibold text-foreground-secondary"
                          >
                            Total estimado dos materiais
                          </td>
                          <td className="py-2.5 px-4 text-right font-mono font-bold text-foreground tabular-nums whitespace-nowrap">
                            {formatarMoeda(totalMateriaisEstimado)}
                          </td>
                          <td colSpan={2} />
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>
              ) : (
                <>
                  <ul className="divide-y divide-border-subtle text-xs">
                    {materiais.map((mat) => {
                      const nomeExibicao = mat.produtoNome || mat.tipo || mat.descricao || "Item sem descrição";
                      return (
                        <li key={mat.id} className="p-3.5 space-y-2.5">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-foreground leading-snug">
                                {nomeExibicao}
                              </p>
                              <p className="text-[11px] text-muted-foreground mt-0.5">
                                {mat.tipo && mat.tipo !== nomeExibicao ? `${mat.tipo} · ` : ""}
                                {mat.unidade ? `${mat.unidade} · ` : ""}
                                <span className="font-mono">#{mat.id}</span>
                              </p>
                            </div>
                            <div className="shrink-0">{renderAcoesLinha(mat)}</div>
                          </div>

                          <div
                            className={cn(
                              "grid gap-2 rounded-lg border border-border-subtle bg-surface-subtle px-2.5 py-2",
                              podeVerValores ? "grid-cols-3" : "grid-cols-1"
                            )}
                          >
                            <div>
                              <p className="text-[10px] text-muted-foreground">Qtd.</p>
                              <p className="font-mono font-semibold text-foreground tabular-nums">
                                {mat.quantidade} {mat.unidade || ""}
                              </p>
                            </div>
                            {podeVerValores && (
                              <>
                                <div>
                                  <p className="text-[10px] text-muted-foreground">Unitário</p>
                                  <p className="font-mono text-foreground-secondary tabular-nums">
                                    {typeof mat.custoUnitario === "number"
                                      ? formatarMoeda(mat.custoUnitario)
                                      : "—"}
                                  </p>
                                </div>
                                <div className="text-right">
                                  <p className="text-[10px] text-muted-foreground">Subtotal</p>
                                  <p className="font-mono font-semibold text-foreground tabular-nums">
                                    {typeof mat.custoUnitario === "number"
                                      ? formatarMoeda(mat.custoUnitario * mat.quantidade)
                                      : "—"}
                                  </p>
                                </div>
                              </>
                            )}
                          </div>

                          <div className="flex items-center justify-between gap-2">
                            <div>{renderCampoUtilizada(mat, nomeExibicao)}</div>
                            <div>{renderSeletorStatus(mat, nomeExibicao)}</div>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                  {podeVerValores && possuiCustos && (
                    <div className="px-3.5 py-3 border-t border-border-subtle bg-surface-subtle flex items-center justify-between text-xs">
                      <span className="font-semibold text-foreground-secondary">
                        Total estimado dos materiais
                      </span>
                      <span className="font-mono font-bold text-sm text-foreground tabular-nums">
                        {formatarMoeda(totalMateriaisEstimado)}
                      </span>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      <ModalMaterial
        isOpen={isModalOpen && podeAdicionar}
        onClose={() => {
          setIsModalOpen(false);
          setMaterialParaEditar(null);
        }}
        obraId={obraId}
        materialParaEditar={materialParaEditar}
      />

      <ConfirmDialog
        isOpen={Boolean(materialParaExcluir) && podeAdicionar}
        onClose={() => {
          if (!excluirMutation.isPending) setMaterialParaExcluir(null);
        }}
        onConfirm={() => void handleConfirmarExclusao()}
        titulo="Excluir insumo?"
        descricao={
          materialParaExcluir
            ? `Tem certeza que deseja remover o item "${materialParaExcluir.tipo || materialParaExcluir.descricao || "Insumo"}" desta obra? Esta ação não pode ser desfeita.`
            : undefined
        }
        labelConfirmar="Excluir"
        labelCancelar="Cancelar"
        variant="danger"
        isLoading={excluirMutation.isPending}
        origemFoco={origemExclusaoRef}
      />
    </div>
  );
}
