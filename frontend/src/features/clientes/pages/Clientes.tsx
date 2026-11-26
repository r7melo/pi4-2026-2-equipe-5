import { useDeferredValue, useEffect, useRef, useState } from "react";
import { Building2, Pencil, Plus, Trash2 } from "lucide-react";
import PageHeader from "@/shared/components/ui/PageHeader";
import { AlertBanner } from "@/shared/components/ui/AlertBanner";
import { Badge } from "@/shared/components/ui/Badge";
import { Button } from "@/shared/components/ui/Button";
import { IconActionButton } from "@/shared/components/ui/IconActionButton";
import { SearchInput } from "@/shared/components/ui/SearchInput";
import FeedbackLoading from "@/shared/components/feedback/FeedbackLoading";
import FeedbackErro from "@/shared/components/feedback/FeedbackErro";
import EmptyState from "@/shared/components/feedback/EmptyState";
import { ConfirmDialog } from "@/shared/components/feedback/ConfirmDialog";
import { formatarCpfCnpj } from "@/shared/lib/validacoesDocumento";
import { useAuthStore } from "@/shared/stores/useAuthStore";
import type { Cliente } from "@/shared/types/clientes";
import { useClientes, useExcluirCliente } from "../hooks/useClientes";
import { extrairMensagemErroCliente } from "../services/clientes";
import { ModalCliente } from "../components/ModalCliente";

export default function Clientes() {
  const perfil = useAuthStore((s) => s.usuario?.perfil?.nomePerfil);
  const podeGerenciar = perfil === "Administrador" || perfil === "Engenharia";

  const [busca, setBusca] = useState("");
  const buscaDebounced = useDeferredValue(busca);
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

  const [modalAberto, setModalAberto] = useState(false);
  const [clienteEmEdicao, setClienteEmEdicao] = useState<Cliente | null>(null);
  const [clienteParaExcluir, setClienteParaExcluir] = useState<Cliente | null>(null);
  const [avisoOperacao, setAvisoOperacao] = useState<{
    tipo: "sucesso" | "erro";
    texto: string;
  } | null>(null);

  const emExclusaoRef = useRef(false);

  const { data, isLoading, isError, error, refetch } = useClientes({
    nome: buscaDebounced,
    page: 1,
    pageSize: 100,
  });

  const clientes = data?.itens ?? [];
  const excluirMutation = useExcluirCliente();

  const abrirNovoCliente = () => {
    setClienteEmEdicao(null);
    setModalAberto(true);
  };

  const abrirEdicaoCliente = (cliente: Cliente) => {
    setClienteEmEdicao(cliente);
    setModalAberto(true);
  };

  const handleConfirmarExclusao = async () => {
    if (!clienteParaExcluir || excluirMutation.isPending || emExclusaoRef.current) return;
    emExclusaoRef.current = true;
    const alvo = clienteParaExcluir;

    try {
      await excluirMutation.mutateAsync(alvo.id);
      setAvisoOperacao({
        tipo: "sucesso",
        texto: `Cliente "${alvo.nome}" excluído com sucesso.`,
      });
      setClienteParaExcluir(null);
    } catch (err) {
      setAvisoOperacao({
        tipo: "erro",
        texto: extrairMensagemErroCliente(
          err,
          "Não foi possível excluir o cliente."
        ),
      });
      setClienteParaExcluir(null);
    } finally {
      emExclusaoRef.current = false;
    }
  };

  const possuiBuscaAtiva = Boolean(busca.trim());

  return (
    <div className="flex flex-col flex-1 min-h-0 bg-background-app">
      <PageHeader
        title="Clientes"
        badge={
          !isLoading && !isError ? (
            <Badge variante="neutral" className="hidden sm:inline-flex font-medium tabular-nums">
              {clientes.length} {clientes.length === 1 ? "cliente" : "clientes"}
            </Badge>
          ) : undefined
        }
        extraRow={
          !desktop ? (
            <div className="basis-full w-full pt-1.5 border-t border-border-subtle/60">
              <SearchInput
                valor={busca}
                onChange={setBusca}
                placeholder="Buscar cliente por nome, cidade ou CPF/CNPJ..."
                ariaLabel="Buscar cliente por nome, cidade ou CPF/CNPJ"
                tamanho="xs"
                className="w-full"
              />
            </div>
          ) : undefined
        }
      >
        {desktop && (
          <SearchInput
            valor={busca}
            onChange={setBusca}
            placeholder="Buscar cliente por nome, cidade ou CPF/CNPJ..."
            ariaLabel="Buscar cliente por nome, cidade ou CPF/CNPJ"
            tamanho="xs"
            className="w-56"
          />
        )}
        {podeGerenciar && (
          <Button
            size="sm"
            onClick={abrirNovoCliente}
            className="controle-compacto h-7 py-0 px-2.5 gap-1 text-xs font-medium shrink-0 whitespace-nowrap"
          >
            <Plus className="w-3.5 h-3.5" aria-hidden="true" />
            <span className="sm:hidden">Novo</span>
            <span className="hidden sm:inline">Novo cliente</span>
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

        {isLoading ? (
          <div className="bg-surface border border-border-subtle rounded-xl min-h-[280px] flex">
            <FeedbackLoading mensagem="Carregando cadastro de clientes..." />
          </div>
        ) : isError ? (
          <div className="bg-surface border border-border-subtle rounded-xl min-h-[280px] flex">
            <FeedbackErro
              mensagem={extrairMensagemErroCliente(
                error,
                "Não foi possível carregar os clientes."
              )}
              onTentarNovamente={() => void refetch()}
            />
          </div>
        ) : clientes.length === 0 ? (
          <div className="bg-surface border border-border-subtle rounded-xl min-h-[280px] flex">
            <EmptyState
              icone={Building2}
              titulo={
                possuiBuscaAtiva
                  ? "Nenhum cliente encontrado para a busca informada"
                  : "Nenhum cliente cadastrado"
              }
              descricao={
                possuiBuscaAtiva
                  ? "Verifique o termo digitado ou limpe o campo de busca para listar todos os clientes."
                  : "Cadastre os clientes para vinculá-los rapidamente na abertura de obras."
              }
              acao={
                possuiBuscaAtiva
                  ? {
                      label: "Limpar busca",
                      onClick: () => setBusca(""),
                    }
                  : podeGerenciar
                    ? {
                        label: "Cadastrar primeiro cliente",
                        onClick: abrirNovoCliente,
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
                      <th scope="col" className="py-2.5 px-4">Cliente</th>
                      <th scope="col" className="py-2.5 px-4">CPF / CNPJ</th>
                      <th scope="col" className="py-2.5 px-4">Cidade / Endereço</th>
                      <th scope="col" className="py-2.5 px-4">Contato</th>
                      <th scope="col" className="py-2.5 px-4 text-right">Obras</th>
                      {podeGerenciar && (
                        <th scope="col" className="py-2.5 px-4 text-right">Ações</th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-subtle text-sm">
                    {clientes.map((cliente) => {
                      const qtdObras = cliente.quantidadeObras ?? 0;
                      return (
                        <tr
                          key={cliente.id}
                          className="transition-colors hover:bg-surface-subtle/50"
                        >
                          <td className="py-2.5 px-4">
                            <p className="font-semibold text-foreground leading-tight">
                              {cliente.nome}
                            </p>
                            {cliente.email && (
                              <p className="text-xs text-muted-foreground mt-0.5">
                                {cliente.email}
                              </p>
                            )}
                          </td>
                          <td className="py-2.5 px-4 font-mono text-xs text-foreground-secondary tabular-nums whitespace-nowrap">
                            {cliente.cpfCnpj ? formatarCpfCnpj(cliente.cpfCnpj) : "—"}
                          </td>
                          <td className="py-2.5 px-4 text-foreground-secondary">
                            <p className="text-xs font-medium text-foreground">
                              {cliente.cidade || "—"}
                            </p>
                            {cliente.endereco && (
                              <p className="text-xs text-muted-foreground mt-0.5 truncate max-w-xs">
                                {cliente.endereco}
                              </p>
                            )}
                          </td>
                          <td className="py-2.5 px-4 font-mono text-xs text-muted-foreground whitespace-nowrap">
                            {cliente.telefone || "—"}
                          </td>
                          <td className="py-2.5 px-4 text-right font-mono font-semibold text-foreground tabular-nums">
                            {qtdObras}
                          </td>
                          {podeGerenciar && (
                            <td className="py-2.5 px-4 text-right">
                              <div className="inline-flex items-center justify-end gap-1">
                                <IconActionButton
                                  size="sm"
                                  onClick={() => abrirEdicaoCliente(cliente)}
                                  title={`Editar ${cliente.nome}`}
                                  label={`Editar ${cliente.nome}`}
                                >
                                  <Pencil className="w-3.5 h-3.5" aria-hidden="true" />
                                </IconActionButton>
                                <IconActionButton
                                  size="sm"
                                  tone="destructive"
                                  disabled={excluirMutation.isPending}
                                  onClick={() => setClienteParaExcluir(cliente)}
                                  title={
                                    qtdObras > 0
                                      ? `Cliente possui ${qtdObras} obra(s) vinculada(s)`
                                      : `Excluir ${cliente.nome}`
                                  }
                                  label={`Excluir ${cliente.nome}`}
                                >
                                  <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                                </IconActionButton>
                              </div>
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <ul aria-label="Lista de clientes" className="divide-y divide-border-subtle">
                {clientes.map((cliente) => {
                  const qtdObras = cliente.quantidadeObras ?? 0;
                  return (
                    <li key={cliente.id} className="p-3 space-y-1.5">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-foreground truncate">
                            {cliente.nome}
                          </p>
                          <p className="text-[11px] font-mono text-muted-foreground tabular-nums">
                            {cliente.cpfCnpj ? formatarCpfCnpj(cliente.cpfCnpj) : "—"}
                          </p>
                        </div>
                        <Badge variante="neutral" tamanho="xs" className="tabular-nums">
                          {qtdObras} {qtdObras === 1 ? "obra" : "obras"}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
                        <span className="truncate">
                          {cliente.cidade || "—"}
                          {cliente.telefone ? ` · ${cliente.telefone}` : ""}
                        </span>
                        {podeGerenciar && (
                          <div className="inline-flex items-center gap-1 shrink-0">
                            <IconActionButton
                              size="sm"
                              onClick={() => abrirEdicaoCliente(cliente)}
                              title={`Editar ${cliente.nome}`}
                              label={`Editar ${cliente.nome}`}
                            >
                              <Pencil className="w-3.5 h-3.5" aria-hidden="true" />
                            </IconActionButton>
                            <IconActionButton
                              size="sm"
                              tone="destructive"
                              disabled={excluirMutation.isPending}
                              onClick={() => setClienteParaExcluir(cliente)}
                              title={
                                qtdObras > 0
                                  ? `Cliente possui ${qtdObras} obra(s) vinculada(s)`
                                  : `Excluir ${cliente.nome}`
                              }
                              label={`Excluir ${cliente.nome}`}
                            >
                              <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                            </IconActionButton>
                          </div>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        )}
      </div>

      <ModalCliente
        isOpen={modalAberto}
        onClose={() => {
          setModalAberto(false);
          setClienteEmEdicao(null);
        }}
        clienteEdicao={clienteEmEdicao}
        onSucesso={(mensagem) =>
          setAvisoOperacao({ tipo: "sucesso", texto: mensagem })
        }
      />

      <ConfirmDialog
        isOpen={Boolean(clienteParaExcluir)}
        onClose={() => setClienteParaExcluir(null)}
        onConfirm={() => void handleConfirmarExclusao()}
        isLoading={excluirMutation.isPending}
        variant="danger"
        titulo="Excluir cliente?"
        descricao={
          clienteParaExcluir
            ? (clienteParaExcluir.quantidadeObras ?? 0) > 0
              ? `Atenção: o cliente "${clienteParaExcluir.nome}" possui ${clienteParaExcluir.quantidadeObras} obra(s) vinculada(s). Clientes com histórico de obras não podem ser removidos.`
              : `Tem certeza que deseja excluir o cliente "${clienteParaExcluir.nome}"? Esta ação não poderá ser desfeita.`
            : undefined
        }
        labelConfirmar="Excluir cliente"
      />
    </div>
  );
}
