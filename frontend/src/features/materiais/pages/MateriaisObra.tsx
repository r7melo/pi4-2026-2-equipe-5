import { useRef, useState } from "react";
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

  const { data: materiais, isLoading, isError, error, refetch } = useMateriais(obraId);
  const { data: obra } = useObraContextoMateriais(obraId);

  const atualizarStatusMutation = useAtualizarStatusMaterial();
  const excluirMutation = useExcluirMaterial();
  const { vigente, iniciarOperacao, liberarOperacao, informarErro } = useSessaoMontadaMaterial();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [materialParaEditar, setMaterialParaEditar] = useState<Material | null>(null);
  const [materialParaExcluir, setMaterialParaExcluir] = useState<Material | null>(null);
  const origemExclusaoRef = useRef<HTMLButtonElement | null>(null);

  const handleAlterarStatus = async (materialId: number, novoStatus: StatusLogistico) => {
    if (!podeAlterarStatus) return;
    // Sem trava global para permitir alterações independentes por linha.
    const sessao = iniciarOperacao(false);
    if (sessao === undefined) return;
    try {
      await atualizarStatusMutation.mutateAsync(
        {
          id: materialId,
          statusLogistico: novoStatus,
          obraId,
        },
        undefined,
        sessao
      );
      if (vigente(sessao)) {
        toast.success("Status logístico atualizado com sucesso");
      }
    } catch (erro) {
      informarErro(erro, sessao, "Erro ao atualizar status logístico");
    }
  };

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

  const clienteNome = obra?.cliente?.nome;
  const subtituloHeader = isLoading
    ? "Carregando insumos da obra no servidor..."
    : isError
      ? "Falha na comunicação com o servidor"
      : clienteNome
        ? `Cliente: ${clienteNome} • Obra #${obraId}`
        : `Obra #${obraId} • Acompanhamento Logístico`;

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
            className="flex items-center gap-1.5 h-8 sm:h-9 px-3 text-xs font-medium cursor-pointer"
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
          <div className="max-w-5xl mx-auto">
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
              ) : (
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
                        <th scope="col" className="py-2.5 px-4">Status Logístico</th>
                        <th scope="col" className="py-2.5 px-4 text-right">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border-subtle">
                      {materiais.map((mat) => {
                        const metaStatus = obterMetaStatusLogistico(mat.statusLogistico);
                        const IconeStatus = ICONE_TABELA_POR_STATUS[metaStatus.valor];
                        return (
                          <tr
                            key={mat.id}
                            className="hover:bg-surface-subtle/50 transition-colors"
                          >
                            <td className="py-2.5 px-4">
                              <p className="text-sm font-semibold text-foreground leading-tight">
                                {mat.tipo || mat.descricao || "Item sem descrição"}
                              </p>
                              <p className="text-[11px] text-muted-foreground mt-0.5">
                                Identificador #{mat.id}
                              </p>
                            </td>
                            <td className="py-2.5 px-4 text-right font-mono">
                              <span className="text-sm font-bold text-foreground">
                                {mat.quantidade}
                              </span>
                              {mat.quantidadeUtilizada ? (
                                <span className="text-xs text-muted-foreground ml-1.5 font-sans font-normal">
                                  ({mat.quantidadeUtilizada} inst.)
                                </span>
                              ) : null}
                            </td>
                            <td className="py-2.5 px-4">
                              {podeAlterarStatus ? (
                                <div className="relative inline-flex items-center">
                                  <select
                                    aria-label="Status do material"
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
                                      "appearance-none text-xs font-semibold pl-2.5 pr-6 py-1 rounded-full border cursor-pointer focus:outline-none transition-colors",
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
                              ) : (
                                <span
                                  className={cn(
                                    "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border",
                                    metaStatus.badgeClasse
                                  )}
                                >
                                  <IconeStatus className="w-3.5 h-3.5" aria-hidden="true" />{" "}
                                  {metaStatus.rotuloTabela}
                                </span>
                              )}
                            </td>
                            <td className="py-2.5 px-4 text-right">
                              {podeAdicionar && (
                                <div className="flex items-center justify-end gap-1">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setMaterialParaEditar(mat);
                                      setIsModalOpen(true);
                                    }}
                                    className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-surface-subtle rounded-md transition-colors cursor-pointer"
                                    title="Editar este insumo"
                                    aria-label={`Editar ${mat.tipo || mat.descricao}`}
                                  >
                                    <Pencil className="w-3.5 h-3.5" aria-hidden="true" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      origemExclusaoRef.current = e.currentTarget;
                                      setMaterialParaExcluir(mat);
                                    }}
                                    className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive-light/30 rounded-md transition-colors cursor-pointer"
                                    title="Remover este insumo"
                                    aria-label={`Remover ${mat.tipo || mat.descricao}`}
                                  >
                                    <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                                  </button>
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
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
