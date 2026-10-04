import { useParams, useNavigate } from "react-router-dom";
import { useMateriais, useAdicionarMaterial } from "@/hooks/api/useMateriais";
import { useObraDetalhe } from "@/hooks/api/useObraDetalhe";
import { PageHeader } from "@/components/ui/PageHeader";
import { Loader2, AlertCircle, Package, Plus, ChevronLeft, CheckCircle2 } from "lucide-react";
import { useState } from "react";

export default function MateriaisObra() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const obraId = Number(id);

  const { data: materiais, isLoading, isError } = useMateriais(obraId);
  const { data: obra } = useObraDetalhe(obraId);
  const addMaterial = useAdicionarMaterial();

  const [descricao, setDescricao] = useState("");
  const [quantidade, setQuantidade] = useState("");
  const [unidade, setUnidade] = useState("un");
  const [showForm, setShowForm] = useState(false);

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!descricao || !quantidade) return;

    addMaterial.mutate({
      obraId,
      payload: { descricao, quantidade: Number(quantidade), unidade }
    }, {
      onSuccess: () => {
        setDescricao("");
        setQuantidade("");
        setShowForm(false);
      }
    });
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        <PageHeader title="Gerenciar Materiais da Obra" subtitle="Carregando insumos..." />
        <div className="flex-1 flex items-center justify-center bg-slate-50">
          <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        <PageHeader title="Erro" subtitle="Falha ao carregar" />
        <div className="flex-1 flex items-center justify-center bg-red-50 text-red-700">
          <AlertCircle className="w-6 h-6 mr-2" />
          <span>Erro ao buscar materiais da obra.</span>
        </div>
      </div>
    );
  }

  const clienteNome = obra?.cliente?.nome;

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-slate-50">
      <PageHeader
        title="Gerenciar Materiais da Obra"
        subtitle={clienteNome ? `Cliente: ${clienteNome}` : `Obra #${obraId}`}
      />
      <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate(`/obras/${obraId}`)} 
            className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            title="Voltar para Detalhes da Obra"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <Package className="w-6 h-6 text-slate-400" /> Gestão de Materiais 
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              {clienteNome ? `Cliente: ${clienteNome} (#${obraId})` : `Obra #${obraId}`} • Controle Logístico
            </p>
          </div>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-lg font-medium text-sm transition-colors flex items-center gap-2 cursor-pointer shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Adicionar Insumo
        </button>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
        <div className="max-w-4xl mx-auto space-y-6">

          {showForm && (
            <form onSubmit={handleAdd} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-4 items-end animate-in fade-in slide-in-from-top-4">
              <div className="flex-1 w-full">
                <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase">Descrição do Material</label>
                <input 
                  type="text" required
                  value={descricao} onChange={e => setDescricao(e.target.value)}
                  placeholder="Ex: Painel Solar 550W"
                  className="w-full border border-slate-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400 transition-shadow"
                />
              </div>
              <div className="w-full md:w-32">
                <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase">Qtd</label>
                <input 
                  type="number" required min="1"
                  value={quantidade} onChange={e => setQuantidade(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400 transition-shadow"
                />
              </div>
              <div className="w-full md:w-32">
                <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase">Unidade</label>
                <select 
                  value={unidade} onChange={e => setUnidade(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400 transition-shadow bg-white"
                >
                  <option value="un">Unidade</option>
                  <option value="m">Metros</option>
                  <option value="kg">Kg</option>
                  <option value="lote">Lote</option>
                </select>
              </div>
              <button 
                type="submit" disabled={addMaterial.isPending}
                className="w-full md:w-auto bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white px-6 py-2.5 rounded-lg font-medium text-sm transition-colors cursor-pointer flex items-center justify-center gap-2"
              >
                {addMaterial.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Salvar"}
              </button>
            </form>
          )}

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            {materiais?.length === 0 ? (
              <div className="p-8 text-center text-slate-500">
                <Package className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="font-medium text-slate-700">Nenhum material registrado</p>
                <p className="text-sm">Clique em Adicionar Insumo para começar a alimentar o controle desta obra.</p>
              </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-xs uppercase font-bold text-slate-500 tracking-wider">
                    <th className="p-4">Item</th>
                    <th className="p-4">Quantidade</th>
                    <th className="p-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {materiais?.map((mat) => (
                    <tr key={mat.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-4">
                        <p className="font-medium text-slate-900">{mat.descricao}</p>
                        <p className="text-xs text-slate-500">ID: {mat.id}</p>
                      </td>
                      <td className="p-4">
                        <span className="font-bold text-slate-700">{mat.quantidade}</span> <span className="text-slate-500 text-sm">{mat.unidade}</span>
                      </td>
                      <td className="p-4">
                        <span className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-full text-xs font-semibold border border-emerald-200">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Registrado
                        </span>
                      </td>
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
