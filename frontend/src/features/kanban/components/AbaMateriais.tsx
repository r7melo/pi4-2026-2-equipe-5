import React, { useState, useMemo, useRef, useLayoutEffect } from "react";
import { Link } from "react-router";
import {
  useMateriais,
  useAdicionarMaterial,
  useAtualizarMaterial,
  useAtualizarStatusMaterial,
  useLoteMateriais,
} from "@/features/kanban/hooks/useKanbanMateriais";
import FeedbackLoading from "@/shared/components/feedback/FeedbackLoading";
import FeedbackErro from "@/shared/components/feedback/FeedbackErro";
import { EmptyState } from "@/shared/components/feedback/EmptyState";
import { capturarSessaoOperacional, sessaoOperacionalVigente, deveExibirErroLocal, statusHttp } from "@/shared/lib/sessaoOperacao";
import type { LoteMateriais } from "../types/gestaoMateriais";
import type { Material, StatusLogistico } from "@/types";
import {
  ExternalLink,
  Plus,
  X,
  Pencil,
  Trash2,
  ShoppingCart,
  Truck,
  CheckCircle,
  Wrench,
} from "lucide-react";
import { cn } from "@/shared/lib/utils";
import { toast } from "sonner";
import { ConfirmDialog } from "@/shared/components/feedback/ConfirmDialog";

interface AbaMateriaisProps {
  obraId: number;
  somenteLeitura?: boolean;
}

export function AbaMateriais({ obraId, somenteLeitura = true }: AbaMateriaisProps) {
  // A permissão vem do Drawer protegido; o componente não depende da feature auth.
  const podeEditar = !somenteLeitura;

  const { data: materiais, isLoading, isError, refetch } = useMateriais(obraId);
  const { mutateAsync: adicionarMaterial, isPending: criando } = useAdicionarMaterial();
  const { mutateAsync: atualizarMaterial, isPending: editando } = useAtualizarMaterial();
  const { mutateAsync: atualizarStatus, isPending: mudandoStatus } = useAtualizarStatusMaterial();
  const { mutateAsync: executarLote, isPending: lotePendente } = useLoteMateriais();
  const ocupado = criando || editando || mudandoStatus || lotePendente;
  const trava = useRef(false);
  const montado = useRef(true);
  useLayoutEffect(() => { montado.current = true; return () => { montado.current = false; }; }, []);
  const iniciar = () => {
    if (!podeEditar || ocupado || trava.current) return undefined;
    trava.current = true;
    return capturarSessaoOperacional();
  };
  const vigente = (sessao: number) => montado.current && sessaoOperacionalVigente(sessao);
  const informarErroLocal = (erro: unknown, sessao: number) => {
    if (vigente(sessao) && deveExibirErroLocal(erro)) toast.error(statusHttp(erro) === 403
      ? "Você não possui permissão para realizar esta ação."
      : "Não foi possível salvar os materiais. Tente novamente.");
  };

  const [itensSelecionados, setItensSelecionados] = useState<Set<number>>(new Set());
  const [formularioAberto, setFormularioAberto] = useState(false);
  const [itemEmEdicao, setItemEmEdicao] = useState<Material | null>(null);

  // Estados do formulário
  const [formTipo, setFormTipo] = useState("");
  const [formQuantidade, setFormQuantidade] = useState("1");
  const [formStatus, setFormStatus] = useState<StatusLogistico>("Comprado");

  // Diálogo de confirmação para exclusão
  const [dialogoExclusaoAberto, setDialogoExclusaoAberto] = useState(false);
  const [idsParaExcluir, setIdsParaExcluir] = useState<number[]>([]);

  const listaMateriais = useMemo(() => materiais || [], [materiais]);
  const todosSelecionados = listaMateriais.length > 0 && itensSelecionados.size === listaMateriais.length;
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

  const abrirFormCriacao = () => {
    setItemEmEdicao(null);
    setFormTipo("");
    setFormQuantidade("1");
    setFormStatus("Comprado");
    setFormularioAberto((prev) => !prev);
  };

  const abrirFormEdicao = (mat: Material) => {
    setItemEmEdicao(mat);
    setFormTipo(mat.tipo || mat.descricao || "");
    setFormQuantidade(String(mat.quantidade));
    setFormStatus(mat.statusLogistico || "Comprado");
    setFormularioAberto(true);
  };

  const fecharFormulario = () => {
    setFormularioAberto(false);
    setItemEmEdicao(null);
  };

  const handleSalvarFormulario = async (e: React.FormEvent) => {
    e.preventDefault();
    const tipo = formTipo.trim();
    const qtd = Number(formQuantidade);
    if (!tipo || tipo.length > 200) {
      toast.error("Informe o nome ou tipo do insumo.");
      return;
    }
    if (!Number.isSafeInteger(qtd) || qtd <= 0) {
      toast.error("A quantidade deve ser um número maior que zero.");
      return;
    }

    const sessao = iniciar();
    if (sessao === undefined) return;
    try {
      if (itemEmEdicao) {
        await atualizarMaterial({
          id: itemEmEdicao.id,
          payload: { tipo, quantidade: qtd, statusLogistico: formStatus },
        });
        if (vigente(sessao)) toast.success(`Insumo "${tipo}" atualizado com sucesso`);
      } else {
        await adicionarMaterial({
          obraId,
          payload: { tipo, quantidade: qtd, statusLogistico: formStatus },
        });
      }
      if (vigente(sessao)) {
        if (!itemEmEdicao) toast.success("Material registrado com sucesso");
        fecharFormulario();
      }
    } catch (erro) { informarErroLocal(erro, sessao); }
    finally { trava.current = false; }
  };

  const handleAlterarStatusIndividual = async (id: number, novoStatus: StatusLogistico) => {
    const sessao = iniciar();
    if (sessao === undefined) return;
    try {
      await atualizarStatus({ id, statusLogistico: novoStatus, obraId });
      if (vigente(sessao)) toast.success("Status do insumo atualizado com sucesso");
    } catch (erro) { informarErroLocal(erro, sessao); }
    finally { trava.current = false; }
  };

  const processarLote = async (lote: LoteMateriais) => {
    const sessao = iniciar();
    if (sessao === undefined) return;
    if (lote.ids.length === 0) { trava.current = false; return; }
    try {
      const resultados = await executarLote(lote);
      if (!vigente(sessao)) return;
      const falhados = lote.ids.filter((_, i) => resultados[i].status === "rejected");
      const sucessos = lote.ids.length - falhados.length;
      setItensSelecionados(new Set(falhados));
      if (falhados.length) toast.warning(`${sucessos} concluídos. ${falhados.length} falharam. Tente novamente os itens selecionados.`);
      else toast.success(lote.acao === "excluir" ? "Insumos removidos com sucesso" : "Insumos atualizados com sucesso");
      setDialogoExclusaoAberto(false);
      setIdsParaExcluir([]);
    } catch (erro) { informarErroLocal(erro, sessao); }
    finally { trava.current = false; }
  };

  const handleAplicarStatusEmLote = (statusLogistico: StatusLogistico) =>
    processarLote({ ids: Array.from(itensSelecionados), obraId, acao: "status", statusLogistico });

  const solicitarExclusaoIndividual = (id: number) => {
    setIdsParaExcluir([id]);
    setDialogoExclusaoAberto(true);
  };

  const solicitarExclusaoLote = () => {
    if (itensSelecionados.size === 0) return;
    setIdsParaExcluir(Array.from(itensSelecionados));
    setDialogoExclusaoAberto(true);
  };

  const executarExclusao = () => processarLote({ ids: [...idsParaExcluir], obraId, acao: "excluir" });

  if (isLoading) return <FeedbackLoading mensagem="Carregando insumos da obra..." />;
  if (isError) return <FeedbackErro mensagem="Não foi possível carregar os materiais da obra." onTentarNovamente={() => void refetch()} />;

  return (
    <div className="flex flex-col relative pb-20" aria-busy={ocupado}>
      {lotePendente && <p role="status" className="text-xs text-muted-foreground">Processando materiais...</p>}
      <fieldset disabled={ocupado} className="min-w-0 border-0 p-0 m-0">
      {/* 1. Cabeçalho de Controle e Ações da Aba */}
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
                <X className="w-3 h-3 stroke-[2.5]" />
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
            <ExternalLink className="w-3.5 h-3.5" />
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
              {formularioAberto ? <X className="w-3.5 h-3.5 stroke-[2.5]" /> : <Plus className="w-3.5 h-3.5 stroke-[2.5]" />}
            </button>
          )}
        </div>
      </div>

      {/* 2. Formulário Retrátil (Criação e Edição Cadastral) */}
      {formularioAberto && podeEditar && (
        <form
          onSubmit={handleSalvarFormulario}
          className="bg-surface-subtle border border-border-subtle rounded-lg p-3 mb-3 flex flex-col gap-2.5 shadow-xs"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-foreground">
              {itemEmEdicao ? `Alterar Insumo #${itemEmEdicao.id}` : "Cadastrar Novo Insumo"}
            </span>
            <button
              type="button"
              onClick={fecharFormulario}
              className="text-muted-foreground hover:text-foreground text-xs"
            >
              Cancelar
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <div className="sm:col-span-1.5 flex flex-col gap-1">
              <label htmlFor="formTipoInput" className="text-[11px] font-semibold text-muted-foreground">
                Nome / Tipo do Insumo *
              </label>
              <input
                id="formTipoInput"
                type="text"
                required
                maxLength={200}
                value={formTipo}
                onChange={(e) => setFormTipo(e.target.value)}
                placeholder="Ex: Módulos Fotovoltaicos 550W"
                className="w-full text-xs px-2.5 py-1.5 rounded-md border border-border-subtle bg-surface focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label htmlFor="formQtdInput" className="text-[11px] font-semibold text-muted-foreground">
                Quantidade *
              </label>
              <input
                id="formQtdInput"
                type="number"
                min="1"
                required
                value={formQuantidade}
                onChange={(e) => setFormQuantidade(e.target.value)}
                className="w-full text-xs px-2.5 py-1.5 rounded-md border border-border-subtle bg-surface focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label htmlFor="formStatusSelect" className="text-[11px] font-semibold text-muted-foreground">
                Status Logístico
              </label>
              <select
                id="formStatusSelect"
                value={formStatus}
                onChange={(e) => setFormStatus(e.target.value as StatusLogistico)}
                className="w-full text-xs px-2 py-1.5 rounded-md border border-border-subtle bg-surface focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="Comprado">Comprado</option>
                <option value="EmTransito">Em trânsito</option>
                <option value="Disponivel">Disponível</option>
                <option value="Utilizado">Utilizado</option>
              </select>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="submit"
              disabled={criando || editando}
              className="text-xs font-semibold px-3 py-1.5 rounded-md bg-primary text-primary-foreground hover:bg-primary-hover disabled:opacity-50 transition-colors cursor-pointer"
            >
              {criando || editando ? "Salvando..." : itemEmEdicao ? "Salvar Alterações" : "Cadastrar Insumo"}
            </button>
          </div>
        </form>
      )}

      {/* 3. Listagem de Itens ou Estado Vazio */}
      {listaMateriais.length === 0 ? (
        <EmptyState titulo="Nenhum insumo cadastrado nesta obra" descricao="Adicione insumos para acompanhar os materiais da obra."
          acao={podeEditar ? { label: "Adicionar primeiro insumo", onClick: abrirFormCriacao } : undefined} />
      ) : (
        <div className="flex flex-col divide-y divide-border-subtle/60">
          {listaMateriais.map((mat) => {
            const isSelected = itensSelecionados.has(mat.id);
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
                  {podeEditar ? (
                    <select
                      value={mat.statusLogistico || "Comprado"}
                      onChange={(e) => handleAlterarStatusIndividual(mat.id, e.target.value as StatusLogistico)}
                      disabled={mudandoStatus}
                      className={cn(
                        "text-xs font-semibold px-2 py-0.5 rounded-full border cursor-pointer focus:outline-none",
                        mat.statusLogistico === "Comprado" && "bg-warning-light text-warning border-warning-border",
                        mat.statusLogistico === "EmTransito" && "bg-info-light text-info border-info-border",
                        mat.statusLogistico === "Disponivel" && "bg-success-light text-success border-success-border",
                        mat.statusLogistico === "Utilizado" && "bg-muted text-foreground-muted border-border-subtle"
                      )}
                      title="Alterar status deste insumo"
                      aria-label={`Alterar status de ${mat.tipo || mat.descricao}`}
                    >
                      <option value="Comprado">Comprado</option>
                      <option value="EmTransito">Em trânsito</option>
                      <option value="Disponivel">Disponível</option>
                      <option value="Utilizado">Utilizado</option>
                    </select>
                  ) : (
                    <span
                      className={cn(
                        "text-xs font-semibold px-2 py-0.5 rounded-full border",
                        mat.statusLogistico === "Comprado" && "bg-warning-light text-warning border-warning-border",
                        mat.statusLogistico === "EmTransito" && "bg-info-light text-info border-info-border",
                        mat.statusLogistico === "Disponivel" && "bg-success-light text-success border-success-border",
                        mat.statusLogistico === "Utilizado" && "bg-muted text-foreground-muted border-border-subtle"
                      )}
                    >
                      {mat.statusLogistico === "EmTransito" ? "Em trânsito" : mat.statusLogistico === "Disponivel" ? "Disponível" : mat.statusLogistico || "Comprado"}
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
                        <Pencil className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => solicitarExclusaoIndividual(mat.id)}
                        className="w-6 h-6 rounded flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive-light transition-colors cursor-pointer"
                        title="Excluir insumo"
                        aria-label={`Excluir ${mat.tipo || mat.descricao}`}
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 4. Dock Flutuante de Ação em Lote (Impeccable / Pill Centralizado) */}
      {temSelecao && podeEditar && (
        <nav
          className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-surface text-foreground border border-border-subtle rounded-full px-2 py-1 flex items-center gap-1.5 shadow-lg z-30 animate-in fade-in slide-in-from-bottom-2 duration-150 whitespace-nowrap"
          role="toolbar"
          aria-label="Ações em lote para insumos selecionados"
        >
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => handleAplicarStatusEmLote("Comprado")}
              className="w-7 h-7 rounded-full border border-warning-border bg-warning-light text-warning hover:bg-warning hover:text-primary-foreground flex items-center justify-center transition-all hover:scale-105 cursor-pointer"
              title="Definir selecionados como Comprado"
              aria-label="Definir selecionados como Comprado"
            >
              <ShoppingCart className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={() => handleAplicarStatusEmLote("EmTransito")}
              className="w-7 h-7 rounded-full border border-info-border bg-info-light text-info hover:bg-info hover:text-primary-foreground flex items-center justify-center transition-all hover:scale-105 cursor-pointer"
              title="Definir selecionados como Em trânsito"
              aria-label="Definir selecionados como Em trânsito"
            >
              <Truck className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={() => handleAplicarStatusEmLote("Disponivel")}
              className="w-7 h-7 rounded-full border border-success-border bg-success-light text-success hover:bg-success hover:text-primary-foreground flex items-center justify-center transition-all hover:scale-105 cursor-pointer"
              title="Definir selecionados como Disponível"
              aria-label="Definir selecionados como Disponível"
            >
              <CheckCircle className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={() => handleAplicarStatusEmLote("Utilizado")}
              className="w-7 h-7 rounded-full border border-border-subtle bg-muted text-foreground-muted hover:bg-foreground-muted hover:text-primary-foreground flex items-center justify-center transition-all hover:scale-105 cursor-pointer"
              title="Definir selecionados como Utilizado"
              aria-label="Definir selecionados como Utilizado"
            >
              <Wrench className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="w-px h-4 bg-border-subtle mx-0.5" />

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={solicitarExclusaoLote}
              className="w-7 h-7 rounded-full border border-destructive-border bg-surface text-destructive hover:bg-destructive-light flex items-center justify-center transition-all hover:scale-105 cursor-pointer"
              title="Excluir insumos selecionados"
              aria-label="Excluir insumos selecionados"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={limparSelecao}
              className="w-7 h-7 rounded-full border border-border-subtle bg-surface text-muted-foreground hover:text-foreground hover:bg-surface-subtle flex items-center justify-center transition-all hover:scale-105 cursor-pointer"
              title="Desmarcar seleção"
              aria-label="Desmarcar seleção"
            >
              <X className="w-3.5 h-3.5 stroke-[2.5]" />
            </button>
          </div>
        </nav>
      )}

      </fieldset>
      {/* Diálogo de Confirmação para Exclusão */}
      <ConfirmDialog
        isOpen={dialogoExclusaoAberto}
        confirmarBloqueado={ocupado}
        onClose={() => { if (!ocupado) setDialogoExclusaoAberto(false); }}
        titulo={idsParaExcluir.length > 1 ? "Excluir insumos selecionados?" : "Excluir insumo?"}
        descricao={
          idsParaExcluir.length > 1
            ? `Tem certeza que deseja excluir ${idsParaExcluir.length} insumos desta obra? Esta ação não pode ser desfeita.`
            : "Tem certeza que deseja remover este insumo da obra? Esta ação não pode ser desfeita."
        }
        labelConfirmar="Excluir"
        labelCancelar="Cancelar"
        isLoading={lotePendente}
        gerenciarFoco
        variant="danger"
        onConfirm={executarExclusao}
      />
    </div>
  );
}
