import { useState } from "react";
import { useParams, useLocation } from "react-router-dom";
import { useAuthStore } from "@/features/auth/stores/useAuthStore";
import {
  useMateriais,
  useObraContextoMateriais,
  useAtualizarStatusMaterial,
  useExcluirMaterial,
} from "@/features/materiais/hooks/useMateriais";
import { ModalMaterial } from "@/features/materiais/components/ModalMaterial";
import { PageHeader } from "@/shared/components/ui/PageHeader";
import { Button } from "@/shared/components/ui/Button";
import { Modal } from "@/shared/components/ui/Modal";
import FeedbackLoading from "@/shared/components/feedback/FeedbackLoading";
import FeedbackErro from "@/shared/components/feedback/FeedbackErro";
import { EmptyState } from "@/shared/components/feedback/EmptyState";
import {
  Package,
  Plus,
  Pencil,
  Trash2,
  CheckCircle2,
  Clock,
  Truck,
  ShieldCheck,
  AlertTriangle,
  ChevronDown,
} from "lucide-react";
import type { StatusLogistico, Material } from "@/types";
import { formatarMoeda } from "@/shared/lib/formatters";
import { cn } from "@/shared/lib/utils";

export default function MateriaisObra() {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const locationState = location.state as unknown;
  const obraId = Number(id);

  const perfil = useAuthStore((s) => s.usuario?.perfil?.nomePerfil);
  const podeAlterarStatus = perfil === "Administrador" || perfil === "Financeiro";
  const podeVerCustos = perfil === "Administrador" || perfil === "Financeiro";

  const { data: materiais, isLoading, isError, error, refetch } = useMateriais(obraId);
  const { data: obra } = useObraContextoMateriais(obraId);

  const atualizarStatusMutation = useAtualizarStatusMaterial();
  const excluirMutation = useExcluirMaterial();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [materialParaEditar, setMaterialParaEditar] = useState<Material | null>(null);
  const [materialParaExcluir, setMaterialParaExcluir] = useState<Material | null>(null);

  const handleAlterarStatus = (materialId: number, novoStatus: StatusLogistico) => {
    atualizarStatusMutation.mutate({
      id: materialId,
      statusLogistico: novoStatus,
      obraId,
    });
  };

  const handleConfirmarExclusao = async () => {
    if (!materialParaExcluir) return;
    try {
      await excluirMutation.mutateAsync({
        id: materialParaExcluir.id,
        obraId,
      });
      setMaterialParaExcluir(null);
    } catch {
      // O hook já emite o toast de erro
    }
  };

  const getStatusBadge = (status?: string | null) => {
    switch (status) {
      case "Disponivel":
        return (
          <span className="inline-flex items-center gap-1.5 bg-success-light text-success px-2.5 py-0.5 rounded-full text-xs font-semibold border border-success-border">
            <CheckCircle2 className="w-3.5 h-3.5" /> Disponível no Depósito
          </span>
        );
      case "EmTransito":
        return (
          <span className="inline-flex items-center gap-1.5 bg-warning-light text-warning px-2.5 py-0.5 rounded-full text-xs font-semibold border border-warning-border">
            <Truck className="w-3.5 h-3.5" /> Em Trânsito
          </span>
        );
      case "Utilizado":
        return (
          <span className="inline-flex items-center gap-1.5 bg-info-light text-info px-2.5 py-0.5 rounded-full text-xs font-semibold border border-info-border">
            <ShieldCheck className="w-3.5 h-3.5" /> Instalado na Obra
          </span>
        );
      case "Comprado":
      default:
        return (
          <span className="inline-flex items-center gap-1.5 bg-surface-subtle text-foreground-muted px-2.5 py-0.5 rounded-full text-xs font-semibold border border-border-subtle">
            <Clock className="w-3.5 h-3.5" /> Pedido Comprado
          </span>
        );
    }
  };

  const clienteNome = obra?.cliente?.nome;

  // 1. ESTADO DE CARREGAMENTO
  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col h-full overflow-hidden bg-background-app">
        <PageHeader
          title="Gestão de Insumos e Materiais"
          subtitle="Carregando insumos da obra no servidor..."
          backTo={`/obras/${obraId}`}
          backState={locationState}
        />
        <FeedbackLoading mensagem="Consultando registros de materiais no banco de dados..." />
      </div>
    );
  }

  // 2. ESTADO DE ERRO
  if (isError) {
    return (
      <div className="flex-1 flex flex-col h-full overflow-hidden bg-background-app">
        <PageHeader
          title="Gestão de Insumos e Materiais"
          subtitle="Falha na comunicação com o servidor"
          backTo={`/obras/${obraId}`}
          backState={locationState}
        />
        <FeedbackErro
          titulo="Não foi possível carregar os materiais"
          mensagem={
            error instanceof Error
              ? error.message
              : "Erro ao conectar com a API de materiais. Verifique se o servidor está ativo."
          }
          onTentarNovamente={() => void refetch()}
        />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-background-app">
      {/* CABEÇALHO UNIFICADO CANÔNICO */}
      <PageHeader
        title="Gestão de Insumos e Materiais"
        subtitle={clienteNome ? `Cliente: ${clienteNome} • Obra #${obraId}` : `Obra #${obraId} • Acompanhamento Logístico`}
        backTo={`/obras/${obraId}`}
        backState={locationState}
      >
        <Button
          onClick={() => {
            setMaterialParaEditar(null);
            setIsModalOpen(true);
          }}
          className="flex items-center gap-1.5 h-8 sm:h-9 px-3 text-xs font-medium cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          Novo Insumo
        </Button>
      </PageHeader>

      {/* ÁREA DE CONTEÚDO */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-6">
        <div className="max-w-5xl mx-auto">
          {/* TABELA DE ALTA DENSIDADE ANTI-SLOP OU EMPTY STATE */}
          <div className="bg-surface rounded-xl border border-border-subtle overflow-hidden">
            {!materiais || materiais.length === 0 ? (
              <EmptyState
                icone={Package}
                titulo="Nenhum material registrado"
                descricao="Esta obra ainda não possui módulos, inversores ou insumos logísticos cadastrados no sistema."
                acao={{
                  label: "Adicionar Primeiro Insumo",
                  onClick: () => {
                    setMaterialParaEditar(null);
                    setIsModalOpen(true);
                  },
                }}
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-surface-subtle border-b border-border-subtle text-xs font-semibold text-muted-foreground">
                      <th className="py-2.5 px-4">Item / Insumo</th>
                      <th className="py-2.5 px-4 text-right">Quantidade</th>
                      {podeVerCustos && (
                        <th className="py-2.5 px-4 text-right">Custo Unitário</th>
                      )}
                      <th className="py-2.5 px-4">Status Logístico</th>
                      <th className="py-2.5 px-4 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-subtle">
                    {materiais.map((mat) => (
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
                        {podeVerCustos && (
                          <td className="py-2.5 px-4 text-right font-mono">
                            <span className="text-sm font-medium text-foreground">
                              {mat.custoUnitario ? formatarMoeda(mat.custoUnitario) : "—"}
                            </span>
                          </td>
                        )}
                        <td className="py-2.5 px-4">
                          {podeAlterarStatus ? (
                            <div className="relative inline-flex items-center">
                              <select
                                value={mat.statusLogistico || "Comprado"}
                                disabled={atualizarStatusMutation.isPending}
                                onChange={(e) =>
                                  handleAlterarStatus(mat.id, e.target.value as StatusLogistico)
                                }
                                className={cn(
                                  "appearance-none text-xs font-semibold pl-2.5 pr-6 py-1 rounded-full border cursor-pointer focus:outline-none transition-colors",
                                  mat.statusLogistico === "Comprado" &&
                                    "bg-surface-subtle text-foreground-muted border-border-subtle hover:bg-surface",
                                  mat.statusLogistico === "EmTransito" &&
                                    "bg-warning-light text-warning border-warning-border hover:bg-warning-light/80",
                                  mat.statusLogistico === "Disponivel" &&
                                    "bg-success-light text-success border-success-border hover:bg-success-light/80",
                                  mat.statusLogistico === "Utilizado" &&
                                    "bg-info-light text-info border-info-border hover:bg-info-light/80"
                                )}
                                title="Alterar status logístico"
                              >
                                <option value="Comprado" className="bg-surface text-foreground">Pedido Comprado</option>
                                <option value="EmTransito" className="bg-surface text-foreground">Em Trânsito</option>
                                <option value="Disponivel" className="bg-surface text-foreground">Disponível no Depósito</option>
                                <option value="Utilizado" className="bg-surface text-foreground">Instalado na Obra</option>
                              </select>
                              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-current pointer-events-none opacity-60" />
                            </div>
                          ) : (
                            getStatusBadge(mat.statusLogistico)
                          )}
                        </td>
                        <td className="py-2.5 px-4 text-right">
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
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setMaterialParaExcluir(mat)}
                              className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive-light/30 rounded-md transition-colors cursor-pointer"
                              title="Remover este insumo"
                              aria-label={`Remover ${mat.tipo || mat.descricao}`}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* MODAL DE CADASTRO / EDIÇÃO */}
      <ModalMaterial
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setMaterialParaEditar(null);
        }}
        obraId={obraId}
        materialParaEditar={materialParaEditar}
        podeVerCustos={podeVerCustos}
      />

      {/* DIÁLOGO DE CONFIRMAÇÃO DE EXCLUSÃO */}
      <Modal
        isOpen={Boolean(materialParaExcluir)}
        onClose={() => setMaterialParaExcluir(null)}
        titulo="Remover Insumo da Obra"
        subtitulo="Confirmação de exclusão do material"
        icone={
          <div className="w-10 h-10 rounded-xl bg-destructive-light border border-destructive-border text-destructive flex items-center justify-center shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </div>
        }
        className="max-w-sm w-full"
        fecharBloqueado={excluirMutation.isPending}
      >
        <div className="p-6 space-y-4">
          <p className="text-sm text-foreground leading-relaxed">
            Tem certeza de que deseja remover o item{" "}
            <strong className="text-foreground font-semibold">
              "{materialParaExcluir?.tipo || materialParaExcluir?.descricao || "Insumo"}"
            </strong>{" "}
            desta obra? Esta ação é definitiva.
          </p>
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-border-subtle">
            <Button
              type="button"
              variant="outline"
              disabled={excluirMutation.isPending}
              onClick={() => setMaterialParaExcluir(null)}
              className="h-9 px-3.5 text-xs cursor-pointer"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="danger"
              disabled={excluirMutation.isPending}
              onClick={handleConfirmarExclusao}
              className="h-9 px-3.5 text-xs font-medium cursor-pointer"
            >
              {excluirMutation.isPending ? "Removendo..." : "Sim, Remover"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
