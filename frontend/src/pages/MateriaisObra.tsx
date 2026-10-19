import { useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useMateriais, useAdicionarMaterial } from "@/hooks/api/useMateriais";
import { useObraDetalhe } from "@/hooks/api/useObraDetalhe";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import FeedbackLoading from "@/components/feedback/FeedbackLoading";
import FeedbackErro from "@/components/feedback/FeedbackErro";
import { EmptyState } from "@/components/feedback/EmptyState";
import { Package, Plus, ChevronLeft, CheckCircle2, Clock, Truck, ShieldCheck, X } from "lucide-react";
import type { StatusLogistico } from "@/types";
import { formatarMoeda } from "@/lib/formatters";

export default function MateriaisObra() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const locationState = location.state as unknown;
  const obraId = Number(id);

  const { data: materiais, isLoading, isError, error, refetch } = useMateriais(obraId);
  const { data: obra } = useObraDetalhe(obraId);
  const addMaterial = useAdicionarMaterial();

  const [tipo, setTipo] = useState("");
  const [quantidade, setQuantidade] = useState("");
  const [custoUnitario, setCustoUnitario] = useState("");
  const [statusLogistico, setStatusLogistico] = useState<StatusLogistico>("Comprado");
  const [showForm, setShowForm] = useState(false);

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tipo.trim() || !quantidade) return;

    addMaterial.mutate(
      {
        obraId,
        payload: {
          tipo: tipo.trim(),
          quantidade: Number(quantidade),
          custoUnitario: custoUnitario ? Number(custoUnitario) : undefined,
          statusLogistico,
        },
      },
      {
        onSuccess: () => {
          setTipo("");
          setQuantidade("");
          setCustoUnitario("");
          setStatusLogistico("Comprado");
          setShowForm(false);
        },
      }
    );
  };

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case "Disponivel":
        return (
          <span className="inline-flex items-center gap-1.5 bg-success-light text-success px-2.5 py-1 rounded-full text-xs font-semibold border border-success-border">
            <CheckCircle2 className="w-3.5 h-3.5" /> Disponível no Depósito
          </span>
        );
      case "EmTransito":
        return (
          <span className="inline-flex items-center gap-1.5 bg-warning-light text-warning px-2.5 py-1 rounded-full text-xs font-semibold border border-warning-border">
            <Truck className="w-3.5 h-3.5" /> Em Trânsito
          </span>
        );
      case "Utilizado":
        return (
          <span className="inline-flex items-center gap-1.5 bg-info-light text-info px-2.5 py-1 rounded-full text-xs font-semibold border border-info-border">
            <ShieldCheck className="w-3.5 h-3.5" /> Instalado na Obra
          </span>
        );
      case "Comprado":
      default:
        return (
          <span className="inline-flex items-center gap-1.5 bg-surface-subtle text-foreground-muted px-2.5 py-1 rounded-full text-xs font-semibold border border-border-subtle">
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
          title="Gestão de Materiais"
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
          title="Gestão de Materiais"
          subtitle="Falha na comunicação com o servidor"
          backTo={`/obras/${obraId}`}
          backState={locationState}
        />
        <FeedbackErro
          titulo="Não foi possível carregar os materiais"
          mensagem={(error as Error)?.message || "Erro ao conectar com a API de materiais. Verifique se o servidor está ativo."}
          onTentarNovamente={() => void refetch()}
        />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-background-app">
      <PageHeader
        title="Gestão de Materiais"
        subtitle={clienteNome ? `Cliente: ${clienteNome} • Obra #${obraId}` : `Obra #${obraId} • Controle Logístico`}
        backTo={`/obras/${obraId}`}
        backState={locationState}
      />

      <div className="bg-surface border-b border-border-subtle px-6 py-4 flex items-center justify-between shrink-0 shadow-2xs">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(`/obras/${obraId}`, { state: locationState })}
            className="p-2 text-foreground-muted hover:text-foreground hover:bg-surface-subtle rounded-lg transition-colors cursor-pointer"
            title="Voltar para Detalhes da Obra"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
              <Package className="w-6 h-6 text-foreground-muted" /> Controle Logístico de Insumos
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {clienteNome ? `Cliente: ${clienteNome}` : `Obra #${obraId}`} • Acompanhamento de compra e separação
            </p>
          </div>
        </div>

        <Button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 cursor-pointer shadow-xs"
        >
          {showForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          {showForm ? "Fechar Formulário" : "Adicionar Insumo"}
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
        <div className="max-w-5xl mx-auto space-y-6">
          {showForm && (
            <form
              onSubmit={handleAdd}
              className="bg-surface p-5 rounded-xl border border-border-subtle shadow-xs flex flex-col md:flex-row gap-4 items-end animate-in fade-in slide-in-from-top-4"
            >
              <div className="flex-1 w-full">
                <label className="block text-xs font-semibold text-foreground-muted mb-1.5 uppercase tracking-wide">
                  Descrição / Tipo do Material *
                </label>
                <input
                  type="text"
                  required
                  value={tipo}
                  onChange={(e) => setTipo(e.target.value)}
                  placeholder="Ex: Módulo Solar 550W Monocristalino"
                  className="w-full border border-border-subtle bg-surface-subtle rounded-lg px-4 py-2 text-sm text-foreground focus:bg-surface focus:outline-none focus:ring-2 focus:ring-info/20 focus:border-info transition-colors"
                />
              </div>

              <div className="w-full md:w-32">
                <label className="block text-xs font-semibold text-foreground-muted mb-1.5 uppercase tracking-wide">
                  Quantidade *
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  value={quantidade}
                  onChange={(e) => setQuantidade(e.target.value)}
                  placeholder="Qtd"
                  className="w-full border border-border-subtle bg-surface-subtle rounded-lg px-4 py-2 text-sm text-foreground focus:bg-surface focus:outline-none focus:ring-2 focus:ring-info/20 focus:border-info transition-colors"
                />
              </div>

              <div className="w-full md:w-36">
                <label className="block text-xs font-semibold text-foreground-muted mb-1.5 uppercase tracking-wide">
                  Custo Unit. (R$)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={custoUnitario}
                  onChange={(e) => setCustoUnitario(e.target.value)}
                  placeholder="0,00"
                  className="w-full border border-border-subtle bg-surface-subtle rounded-lg px-4 py-2 text-sm text-foreground focus:bg-surface focus:outline-none focus:ring-2 focus:ring-info/20 focus:border-info transition-colors"
                />
              </div>

              <div className="w-full md:w-44">
                <label className="block text-xs font-semibold text-foreground-muted mb-1.5 uppercase tracking-wide">
                  Status Logístico
                </label>
                <select
                  value={statusLogistico}
                  onChange={(e) => setStatusLogistico(e.target.value as StatusLogistico)}
                  className="w-full border border-border-subtle bg-surface-subtle rounded-lg px-3 py-2 text-sm text-foreground focus:bg-surface focus:outline-none focus:ring-2 focus:ring-info/20 focus:border-info transition-colors cursor-pointer"
                >
                  <option value="Comprado">Comprado</option>
                  <option value="EmTransito">Em Trânsito</option>
                  <option value="Disponivel">Disponível</option>
                  <option value="Utilizado">Utilizado</option>
                </select>
              </div>

              <Button
                type="submit"
                disabled={addMaterial.isPending}
                className="w-full md:w-auto px-6"
              >
                {addMaterial.isPending ? "Gravando..." : "Salvar Insumo"}
              </Button>
            </form>
          )}

          {/* 3. ESTADO VAZIO OU 4. ESTADO COM DADOS */}
          <div className="bg-surface rounded-xl border border-border-subtle shadow-xs overflow-hidden">
            {!materiais || materiais.length === 0 ? (
              <EmptyState
                icone={Package}
                titulo="Nenhum material registrado"
                descricao="Esta obra ainda não possui módulos, inversores ou insumos logísticos cadastrados no sistema."
                acao={{
                  label: "Adicionar Primeiro Insumo",
                  onClick: () => setShowForm(true),
                }}
              />
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-surface-subtle border-b border-border-subtle text-xs uppercase font-bold text-foreground-muted tracking-wider">
                    <th className="p-4">Item / Insumo</th>
                    <th className="p-4">Quantidade</th>
                    <th className="p-4">Custo Unitário</th>
                    <th className="p-4">Status Logístico</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-subtle">
                  {materiais.map((mat) => (
                    <tr key={mat.id} className="hover:bg-surface-subtle/50 transition-colors">
                      <td className="p-4">
                        <p className="font-semibold text-foreground">{mat.tipo || mat.descricao || "Item sem descrição"}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">Identificador #{mat.id}</p>
                      </td>
                      <td className="p-4">
                        <span className="font-bold text-foreground">{mat.quantidade}</span>
                        {mat.quantidadeUtilizada ? (
                          <span className="text-xs text-muted-foreground ml-1.5">
                            ({mat.quantidadeUtilizada} instalados)
                          </span>
                        ) : null}
                      </td>
                      <td className="p-4">
                        <span className="text-sm font-medium text-foreground">
                          {mat.custoUnitario ? formatarMoeda(mat.custoUnitario) : "—"}
                        </span>
                      </td>
                      <td className="p-4">{getStatusBadge(mat.statusLogistico)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

