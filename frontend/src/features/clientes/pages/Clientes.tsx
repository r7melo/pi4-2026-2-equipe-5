import { useDeferredValue, useRef, useState } from "react";
import { Building2, Edit2, Plus, Trash2 } from "lucide-react";
import PageHeader from "@/shared/components/ui/PageHeader";
import { Button } from "@/shared/components/ui/Button";
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
        subtitle="Cadastro centralizado de clientes, documentos e vínculo com obras"
      >
        {podeGerenciar && (
          <Button size="md" onClick={abrirNovoCliente}>
            <Plus className="w-4 h-4" />
            <span>Novo Cliente</span>
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

        {/* Barra de busca operacional (Quiet Panel) */}
        <section
          aria-label="Busca de clientes"
          className="bg-surface border border-border-subtle rounded-xl p-4 flex flex-col sm:flex-row sm:items-center gap-3"
        >
          <SearchInput
            valor={busca}
            onChange={setBusca}
            placeholder="Buscar cliente por nome, cidade ou CPF/CNPJ..."
            className="flex-1 min-w-0"
          />

          <span className="text-xs font-medium text-muted-foreground font-mono tabular-nums sm:ml-auto">
            {clientes.length} {clientes.length === 1 ? "cliente" : "clientes"}
          </span>
        </section>

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
                            <div className="inline-flex items-center justify-end gap-1.5">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => abrirEdicaoCliente(cliente)}
                                title={`Editar ${cliente.nome}`}
                                aria-label={`Editar ${cliente.nome}`}
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                                <span className="hidden sm:inline">Editar</span>
                              </Button>
                              <Button
                                variant="danger"
                                size="sm"
                                disabled={excluirMutation.isPending}
                                onClick={() => setClienteParaExcluir(cliente)}
                                title={
                                  qtdObras > 0
                                    ? `Cliente possui ${qtdObras} obra(s) vinculada(s)`
                                    : `Excluir ${cliente.nome}`
                                }
                                aria-label={`Excluir ${cliente.nome}`}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span className="hidden sm:inline">Excluir</span>
                              </Button>
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
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
