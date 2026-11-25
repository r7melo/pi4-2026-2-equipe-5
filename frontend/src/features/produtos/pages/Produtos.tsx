import { useDeferredValue, useMemo, useRef, useState } from "react";
import { Edit2, Package, Plus, Power } from "lucide-react";
import PageHeader from "@/shared/components/ui/PageHeader";
import { Button } from "@/shared/components/ui/Button";
import { SearchInput } from "@/shared/components/ui/SearchInput";
import FeedbackLoading from "@/shared/components/feedback/FeedbackLoading";
import FeedbackErro from "@/shared/components/feedback/FeedbackErro";
import EmptyState from "@/shared/components/feedback/EmptyState";
import { ConfirmDialog } from "@/shared/components/feedback/ConfirmDialog";
import { formatarMoeda } from "@/shared/lib/formatters";
import { useAuthStore } from "@/shared/stores/useAuthStore";
import type { Produto } from "@/shared/types/produtos";
import { useEditarProduto, useProdutos } from "../hooks/useProdutos";
import { extrairMensagemErroProduto } from "../services/produtos";
import { TIPOS_PRODUTO_CANONICOS } from "../lib/validacaoProduto";
import { ModalProduto } from "../components/ModalProduto";

export default function Produtos() {
  const perfil = useAuthStore((s) => s.usuario?.perfil?.nomePerfil);
  const podeGerenciar = perfil === "Administrador" || perfil === "Financeiro";

  const [buscaNome, setBuscaNome] = useState("");
  const [filtroTipo, setFiltroTipo] = useState("");
  const [incluirInativos, setIncluirInativos] = useState(false);

  const buscaDebounced = useDeferredValue(buscaNome);

  const [modalAberto, setModalAberto] = useState(false);
  const [produtoEmEdicao, setProdutoEmEdicao] = useState<Produto | null>(null);
  const [produtoStatusConfirm, setProdutoStatusConfirm] = useState<Produto | null>(null);
  const [avisoOperacao, setAvisoOperacao] = useState<{
    tipo: "sucesso" | "erro";
    texto: string;
  } | null>(null);

  const emAlternanciaRef = useRef(false);

  const {
    data: produtos = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useProdutos({
    nome: buscaDebounced,
    tipo: filtroTipo,
    incluirInativos: podeGerenciar && incluirInativos,
  });

  const editarMutation = useEditarProduto();

  const categoriasDisponiveis = useMemo(() => {
    const conjunto = new Set<string>(TIPOS_PRODUTO_CANONICOS);
    for (const item of produtos) {
      if (item.tipo?.trim()) conjunto.add(item.tipo.trim());
    }
    return Array.from(conjunto).sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [produtos]);

  const abrirNovoProduto = () => {
    setProdutoEmEdicao(null);
    setModalAberto(true);
  };

  const abrirEdicaoProduto = (produto: Produto) => {
    setProdutoEmEdicao(produto);
    setModalAberto(true);
  };

  const handleConfirmarStatus = async () => {
    if (!produtoStatusConfirm || editarMutation.isPending || emAlternanciaRef.current) return;
    emAlternanciaRef.current = true;
    const alvo = produtoStatusConfirm;
    const proximoAtivo = !alvo.ativo;

    try {
      await editarMutation.mutateAsync({
        id: alvo.id,
        payload: { ativo: proximoAtivo },
      });
      setAvisoOperacao({
        tipo: "sucesso",
        texto: proximoAtivo
          ? `Produto "${alvo.nome}" reativado no catálogo.`
          : `Produto "${alvo.nome}" inativado. Ele não aparecerá em novas solicitações.`,
      });
      setProdutoStatusConfirm(null);
    } catch (err) {
      setAvisoOperacao({
        tipo: "erro",
        texto: extrairMensagemErroProduto(err, "Não foi possível alterar o status do produto."),
      });
    } finally {
      emAlternanciaRef.current = false;
    }
  };

  const possuiFiltrosAtivos = Boolean(
    buscaNome.trim() || filtroTipo || (podeGerenciar && incluirInativos)
  );

  return (
    <div className="flex flex-col flex-1 min-h-0 bg-background-app">
      <PageHeader
        title="Catálogo de Produtos"
        subtitle="Cadastro padronizado de insumos, unidades de medida e preços unitários de referência"
      >
        {podeGerenciar && (
          <Button size="md" onClick={abrirNovoProduto}>
            <Plus className="w-4 h-4" />
            <span>Novo Produto</span>
          </Button>
        )}
      </PageHeader>

      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 max-w-[1440px] w-full mx-auto">
        {avisoOperacao && (
          <div
            role={avisoOperacao.tipo === "erro" ? "alert" : "status"}
            className={`flex items-center justify-between gap-3 rounded-lg border px-4 py-2.5 text-sm ${
              avisoOperacao.tipo === "erro"
                ? "border-destructive-border bg-destructive-light/60 text-destructive"
                : "border-success-border bg-success-light/60 text-success"
            }`}
          >
            <span>{avisoOperacao.texto}</span>
            <button
              type="button"
              onClick={() => setAvisoOperacao(null)}
              className="text-xs font-semibold underline cursor-pointer shrink-0"
            >
              Dispensar
            </button>
          </div>
        )}

        {/* Barra de filtros operacionais (Quiet Panel) */}
        <section
          aria-label="Filtros do catálogo"
          className="bg-surface border border-border-subtle rounded-xl p-4 flex flex-col lg:flex-row lg:items-center gap-3"
        >
          <SearchInput
            valor={buscaNome}
            onChange={setBuscaNome}
            placeholder="Buscar produto por nome ou especificação..."
            className="flex-1 min-w-0"
          />

          <div className="flex flex-wrap items-center gap-3">
            <select
              aria-label="Filtrar por categoria"
              value={filtroTipo}
              onChange={(e) => setFiltroTipo(e.target.value)}
              className="h-9 rounded-md bg-surface-subtle border border-border-subtle px-3 text-sm text-foreground-secondary focus:bg-surface focus:outline-none focus:ring-1 focus:ring-info"
            >
              <option value="">Todas as categorias</option>
              {categoriasDisponiveis.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>

            {podeGerenciar && (
              <label className="inline-flex items-center gap-2 h-9 px-3 rounded-md border border-border-subtle bg-surface-subtle text-xs font-medium text-foreground-secondary cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={incluirInativos}
                  onChange={(e) => setIncluirInativos(e.target.checked)}
                  className="h-3.5 w-3.5 rounded border-border-strong text-primary focus:ring-border-strong cursor-pointer"
                />
                <span>Exibir inativos</span>
              </label>
            )}

            <span className="text-xs font-medium text-muted-foreground font-mono tabular-nums ml-auto">
              {produtos.length} {produtos.length === 1 ? "item" : "itens"}
            </span>
          </div>
        </section>

        {/* Estado de Carregamento, Erro, Vazio ou Tabela Densa */}
        {isLoading ? (
          <div className="bg-surface border border-border-subtle rounded-xl min-h-[280px] flex">
            <FeedbackLoading mensagem="Carregando catálogo de produtos..." />
          </div>
        ) : isError ? (
          <div className="bg-surface border border-border-subtle rounded-xl min-h-[280px] flex">
            <FeedbackErro
              mensagem={extrairMensagemErroProduto(
                error,
                "Não foi possível carregar o catálogo de produtos."
              )}
              onTentarNovamente={() => void refetch()}
            />
          </div>
        ) : produtos.length === 0 ? (
          <div className="bg-surface border border-border-subtle rounded-xl min-h-[280px] flex">
            <EmptyState
              icone={Package}
              titulo={
                possuiFiltrosAtivos
                  ? "Nenhum produto encontrado para os filtros aplicados"
                  : "Catálogo de produtos vazio"
              }
              descricao={
                possuiFiltrosAtivos
                  ? "Ajuste a busca, troque a categoria ou limpe os filtros para visualizar os itens disponíveis."
                  : "Cadastre os primeiros insumos padrão para agilizar as solicitações das obras."
              }
              acao={
                possuiFiltrosAtivos
                  ? {
                      label: "Limpar filtros",
                      onClick: () => {
                        setBuscaNome("");
                        setFiltroTipo("");
                        setIncluirInativos(false);
                      },
                    }
                  : podeGerenciar
                    ? {
                        label: "Cadastrar primeiro produto",
                        onClick: abrirNovoProduto,
                      }
                    : undefined
              }
            />
          </div>
        ) : (
          <div className="bg-surface border border-border-subtle rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-surface-subtle border-b border-border-subtle text-xs font-semibold text-muted-foreground">
                    <th scope="col" className="py-2.5 px-4">Produto</th>
                    <th scope="col" className="py-2.5 px-4">Categoria</th>
                    <th scope="col" className="py-2.5 px-4">Unidade</th>
                    {podeGerenciar && (
                      <th scope="col" className="py-2.5 px-4 text-right">
                        Preço Unitário
                      </th>
                    )}
                    <th scope="col" className="py-2.5 px-4">Status</th>
                    {podeGerenciar && (
                      <th scope="col" className="py-2.5 px-4 text-right">
                        Ações
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-subtle text-sm">
                  {produtos.map((produto) => (
                    <tr
                      key={produto.id}
                      className={`transition-colors hover:bg-surface-subtle/50 ${
                        !produto.ativo ? "opacity-75" : ""
                      }`}
                    >
                      <td className="py-2.5 px-4 font-medium text-foreground">
                        {produto.nome}
                      </td>
                      <td className="py-2.5 px-4 text-foreground-secondary">
                        {produto.tipo}
                      </td>
                      <td className="py-2.5 px-4 font-mono text-xs text-muted-foreground">
                        {produto.unidade}
                      </td>
                      {podeGerenciar && (
                        <td className="py-2.5 px-4 text-right font-mono font-semibold text-foreground tabular-nums">
                          {typeof produto.precoUnitario === "number"
                            ? formatarMoeda(produto.precoUnitario)
                            : "—"}
                        </td>
                      )}
                      <td className="py-2.5 px-4">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border ${
                            produto.ativo
                              ? "bg-success-light/60 text-success border-success-border"
                              : "bg-surface-subtle text-muted-foreground border-border-subtle"
                          }`}
                        >
                          {produto.ativo ? "Ativo" : "Inativo"}
                        </span>
                      </td>
                      {podeGerenciar && (
                        <td className="py-2.5 px-4 text-right">
                          <div className="inline-flex items-center justify-end gap-1.5">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => abrirEdicaoProduto(produto)}
                              title={`Editar ${produto.nome}`}
                              aria-label={`Editar ${produto.nome}`}
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                              <span className="hidden sm:inline">Editar</span>
                            </Button>
                            <Button
                              variant={produto.ativo ? "danger" : "outline"}
                              size="sm"
                              disabled={editarMutation.isPending}
                              onClick={() => setProdutoStatusConfirm(produto)}
                              title={
                                produto.ativo
                                  ? `Inativar ${produto.nome}`
                                  : `Reativar ${produto.nome}`
                              }
                              aria-label={
                                produto.ativo
                                  ? `Inativar ${produto.nome}`
                                  : `Reativar ${produto.nome}`
                              }
                            >
                              <Power className="w-3.5 h-3.5" />
                              <span className="hidden sm:inline">
                                {produto.ativo ? "Inativar" : "Reativar"}
                              </span>
                            </Button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      <ModalProduto
        isOpen={modalAberto}
        onClose={() => {
          setModalAberto(false);
          setProdutoEmEdicao(null);
        }}
        produtoEdicao={produtoEmEdicao}
        onSucesso={(mensagem) =>
          setAvisoOperacao({ tipo: "sucesso", texto: mensagem })
        }
      />

      <ConfirmDialog
        isOpen={Boolean(produtoStatusConfirm)}
        onClose={() => setProdutoStatusConfirm(null)}
        onConfirm={() => void handleConfirmarStatus()}
        isLoading={editarMutation.isPending}
        variant={produtoStatusConfirm?.ativo ? "warning" : "info"}
        titulo={
          produtoStatusConfirm?.ativo
            ? "Inativar produto do catálogo?"
            : "Reativar produto no catálogo?"
        }
        descricao={
          produtoStatusConfirm?.ativo
            ? `O produto "${produtoStatusConfirm.nome}" deixará de aparecer na seleção de novas solicitações de material, sem alterar os registros históricos já vinculados às obras.`
            : `O produto "${produtoStatusConfirm?.nome ?? ""}" voltará a ficar disponível para novas solicitações de material nas obras.`
        }
        labelConfirmar={
          produtoStatusConfirm?.ativo ? "Inativar produto" : "Reativar produto"
        }
      />
    </div>
  );
}
