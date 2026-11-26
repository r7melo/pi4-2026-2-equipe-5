import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { Package, Pencil, Plus, Power } from "lucide-react";
import PageHeader from "@/shared/components/ui/PageHeader";
import { AlertBanner } from "@/shared/components/ui/AlertBanner";
import { Badge } from "@/shared/components/ui/Badge";
import { Button } from "@/shared/components/ui/Button";
import { IconActionButton } from "@/shared/components/ui/IconActionButton";
import { SearchInput } from "@/shared/components/ui/SearchInput";
import { SegmentedControl } from "@/shared/components/ui/SegmentedControl";
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
        badge={
          !isLoading && !isError ? (
            <Badge variante="neutral" className="hidden sm:inline-flex font-medium tabular-nums">
              {produtos.length} {produtos.length === 1 ? "produto" : "produtos"}
            </Badge>
          ) : undefined
        }
        extraRow={
          !desktop ? (
            <div className="basis-full w-full pt-1.5 border-t border-border-subtle/60 space-y-1.5">
              <SearchInput
                valor={buscaNome}
                onChange={setBuscaNome}
                placeholder="Buscar produto por nome ou especificação..."
                ariaLabel="Buscar produto por nome ou especificação"
                tamanho="xs"
                className="w-full"
              />
              <div className="flex items-center justify-between gap-1.5">
                <select
                  aria-label="Filtrar por categoria"
                  value={filtroTipo}
                  onChange={(e) => setFiltroTipo(e.target.value)}
                  className="controle-compacto h-7 flex-1 min-w-0 rounded-md border border-border-strong bg-surface px-2 text-xs text-foreground"
                >
                  <option value="">Todas as categorias</option>
                  {categoriasDisponiveis.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
                {podeGerenciar && (
                  <SegmentedControl
                    opcoes={[
                      { valor: "ativos", rotulo: "Ativos" },
                      { valor: "todos", rotulo: "Todos" },
                    ]}
                    valor={incluirInativos ? "todos" : "ativos"}
                    onChange={(valor) => setIncluirInativos(valor === "todos")}
                    ariaLabel="Status dos produtos"
                    tamanho="xs"
                  />
                )}
              </div>
            </div>
          ) : undefined
        }
      >
        {desktop && (
          <>
            <SearchInput
              valor={buscaNome}
              onChange={setBuscaNome}
              placeholder="Buscar produto..."
              ariaLabel="Buscar produto por nome ou especificação"
              tamanho="xs"
              className="w-48"
            />
            <select
              aria-label="Filtrar por categoria"
              value={filtroTipo}
              onChange={(e) => setFiltroTipo(e.target.value)}
              className="controle-compacto h-7 rounded-md border border-border-strong bg-surface px-2 text-xs text-foreground cursor-pointer"
            >
              <option value="">Todas as categorias</option>
              {categoriasDisponiveis.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
            {podeGerenciar && (
              <SegmentedControl
                opcoes={[
                  { valor: "ativos", rotulo: "Ativos" },
                  { valor: "todos", rotulo: "Todos" },
                ]}
                valor={incluirInativos ? "todos" : "ativos"}
                onChange={(valor) => setIncluirInativos(valor === "todos")}
                ariaLabel="Status dos produtos"
                tamanho="xs"
              />
            )}
          </>
        )}
        {podeGerenciar && (
          <Button
            size="sm"
            onClick={abrirNovoProduto}
            className="controle-compacto h-7 py-0 px-2.5 gap-1 text-xs font-medium shrink-0 whitespace-nowrap"
          >
            <Plus className="w-3.5 h-3.5" aria-hidden="true" />
            <span className="sm:hidden">Novo</span>
            <span className="hidden sm:inline">Novo produto</span>
          </Button>
        )}
      </PageHeader>

      <div className="flex-1 overflow-y-auto p-3 sm:p-5 space-y-3 max-w-[1440px] w-full mx-auto">
        {avisoOperacao && (
          <AlertBanner
            variante={avisoOperacao.tipo === "erro" ? "destructive" : "success"}
            className="px-4 py-2.5 text-sm"
          >
            <div className="flex items-center justify-between gap-3">
              <span>{avisoOperacao.texto}</span>
              <button
                type="button"
                onClick={() => setAvisoOperacao(null)}
                className="text-xs font-semibold underline cursor-pointer shrink-0"
              >
                Dispensar
              </button>
            </div>
          </AlertBanner>
        )}

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
            {desktop ? (
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
                          <Badge
                            variante={produto.ativo ? "success" : "neutral"}
                            tamanho="sm"
                            comBorda
                          >
                            {produto.ativo ? "Ativo" : "Inativo"}
                          </Badge>
                        </td>
                        {podeGerenciar && (
                          <td className="py-2.5 px-4 text-right">
                            <div className="inline-flex items-center justify-end gap-1">
                              <IconActionButton
                                size="sm"
                                onClick={() => abrirEdicaoProduto(produto)}
                                title={`Editar ${produto.nome}`}
                                label={`Editar ${produto.nome}`}
                              >
                                <Pencil className="w-3.5 h-3.5" aria-hidden="true" />
                              </IconActionButton>
                              <IconActionButton
                                size="sm"
                                tone={produto.ativo ? "destructive" : "neutral"}
                                disabled={editarMutation.isPending}
                                onClick={() => setProdutoStatusConfirm(produto)}
                                title={
                                  produto.ativo
                                    ? `Inativar ${produto.nome}`
                                    : `Reativar ${produto.nome}`
                                }
                                label={
                                  produto.ativo
                                    ? `Inativar ${produto.nome}`
                                    : `Reativar ${produto.nome}`
                                }
                                className={!produto.ativo ? "hover:text-info hover:bg-info-light" : undefined}
                              >
                                <Power className="w-3.5 h-3.5" aria-hidden="true" />
                              </IconActionButton>
                            </div>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <ul aria-label="Lista de produtos" className="divide-y divide-border-subtle">
                {produtos.map((produto) => (
                  <li
                    key={produto.id}
                    className={`p-3 space-y-1.5 ${!produto.ativo ? "opacity-75" : ""}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-foreground leading-snug">
                          {produto.nome}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          {produto.tipo} · <span className="font-mono">{produto.unidade}</span>
                        </p>
                      </div>
                      <Badge
                        variante={produto.ativo ? "success" : "neutral"}
                        tamanho="xs"
                        comBorda
                      >
                        {produto.ativo ? "Ativo" : "Inativo"}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-xs font-semibold text-foreground tabular-nums">
                        {podeGerenciar && typeof produto.precoUnitario === "number"
                          ? formatarMoeda(produto.precoUnitario)
                          : "—"}
                      </span>
                      {podeGerenciar && (
                        <div className="inline-flex items-center gap-1 shrink-0">
                          <IconActionButton
                            size="sm"
                            onClick={() => abrirEdicaoProduto(produto)}
                            title={`Editar ${produto.nome}`}
                            label={`Editar ${produto.nome}`}
                          >
                            <Pencil className="w-3.5 h-3.5" aria-hidden="true" />
                          </IconActionButton>
                          <IconActionButton
                            size="sm"
                            tone={produto.ativo ? "destructive" : "neutral"}
                            disabled={editarMutation.isPending}
                            onClick={() => setProdutoStatusConfirm(produto)}
                            title={
                              produto.ativo
                                ? `Inativar ${produto.nome}`
                                : `Reativar ${produto.nome}`
                            }
                            label={
                              produto.ativo
                                ? `Inativar ${produto.nome}`
                                : `Reativar ${produto.nome}`
                            }
                            className={!produto.ativo ? "hover:text-info hover:bg-info-light" : undefined}
                          >
                            <Power className="w-3.5 h-3.5" aria-hidden="true" />
                          </IconActionButton>
                        </div>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
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
