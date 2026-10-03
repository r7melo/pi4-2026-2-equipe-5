import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useObraDetalhe, useHistoricoObra, useComentariosObra, useAdicionarComentario } from "@/hooks/api/useObraDetalhe";
import { PageHeader } from "@/components/ui/PageHeader";
import { Loader2, AlertCircle, Calendar, MapPin, CreditCard, Send, Clock, User, MessageSquare } from "lucide-react";
import { useState } from "react";

export default function DetalheObra() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const obraId = Number(id);

  // Recupera a página de origem para o botão Voltar funcionar corretamente
  const paginaOrigem = (location.state as { from?: string } | null)?.from ?? "/kanban";

  const { data: obra, isLoading: loadingObra, isError: errorObra } = useObraDetalhe(obraId);
  const { data: historico, isLoading: loadingHist } = useHistoricoObra(obraId);
  const { data: comentarios, isLoading: loadingComent } = useComentariosObra(obraId);
  const addComentario = useAdicionarComentario();

  const [novoComentario, setNovoComentario] = useState("");

  const handleComentar = (e: React.FormEvent) => {
    e.preventDefault();
    if (!novoComentario.trim()) return;
    addComentario.mutate({ obraId, descricao: novoComentario }, {
      onSuccess: () => setNovoComentario("")
    });
  };

  if (loadingObra) {
    return (
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        <PageHeader title="Detalhes da Obra" subtitle="Carregando dados..." backTo={paginaOrigem} />
        <div className="flex-1 flex items-center justify-center bg-slate-50">
          <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
        </div>
      </div>
    );
  }

  if (errorObra || !obra) {
    return (
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        <PageHeader title="Erro" subtitle="Falha ao carregar obra" backTo={paginaOrigem} />
        <div className="flex-1 flex items-center justify-center bg-red-50 text-red-700">
          <AlertCircle className="w-6 h-6 mr-2" />
          <span>Não foi possível carregar os detalhes da obra. Verifique a conexão ou o ID.</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-slate-50">
      {/* Título e botão Voltar renderizados no header do Dashboard via portal */}
      <PageHeader
        title={`Obra: ${obra.cliente.nome}`}
        subtitle={`#${obra.id} • ${obra.status}`}
        backTo={paginaOrigem}
      />

      <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* COLUNA ESQUERDA: Detalhes */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4 border-b border-slate-100 pb-2">Contrato e Local</h2>
              
              <div className="space-y-4">
                <div className="flex items-start gap-3 text-slate-700">
                  <MapPin className="w-5 h-5 text-slate-400 mt-0.5" />
                  <div>
                    <p className="text-xs text-slate-500 font-medium">Cidade</p>
                    <p className="text-sm font-semibold">{obra.cliente.cidade}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 text-slate-700">
                  <Calendar className="w-5 h-5 text-slate-400 mt-0.5" />
                  <div>
                    <p className="text-xs text-slate-500 font-medium">Prazos Estimados</p>
                    <p className="text-sm font-semibold">Início: {obra.dataInicioEstimada}</p>
                    <p className="text-sm font-semibold">Fim: {obra.dataFimEstimada}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 text-slate-700">
                  <CreditCard className="w-5 h-5 text-slate-400 mt-0.5" />
                  <div>
                    <p className="text-xs text-slate-500 font-medium">Pagamento</p>
                    <p className="text-sm font-semibold">Prazo: {obra.pagamento.prazoContratualDias} dias</p>
                    <p className="text-sm text-slate-500">Confirmado em: {obra.pagamento.dataConfirmacao}</p>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-100">
                <button
                  onClick={() => navigate(`/obras/${obra.id}/materiais`)}
                  className="w-full bg-slate-900 hover:bg-slate-800 text-white font-medium py-2.5 rounded-lg transition-colors text-sm shadow-sm cursor-pointer"
                >
                  Gerenciar Materiais da Obra
                </button>
              </div>
            </div>
          </div>

          {/* COLUNA DIREITA: Feed (Histórico e Comentários) */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col h-[600px]">
              <div className="p-4 border-b border-slate-100 flex items-center gap-2 shrink-0">
                <MessageSquare className="w-5 h-5 text-slate-400" />
                <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Feed e Histórico</h2>
              </div>
              
              <div className="flex-1 overflow-y-auto p-4 space-y-6">
                {(loadingHist || loadingComent) ? (
                  <div className="flex justify-center py-4">
                    <Loader2 className="w-6 h-6 animate-spin text-slate-300" />
                  </div>
                ) : (
                  <>
                    {/* Lista mesclada visualmente: Primeiro exibe comentários, depois histórico. Numa app real, ordenaríamos por data. */}
                    {historico?.map((h) => (
                      <div key={`h-${h.id}`} className="flex gap-4">
                        <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center shrink-0 border border-slate-200">
                          <Clock className="w-4 h-4 text-slate-500" />
                        </div>
                        <div className="flex-1 bg-slate-50 p-3 rounded-lg border border-slate-100">
                          <p className="text-xs text-slate-500 mb-1 font-medium">{h.usuario.nome} • {new Date(h.dataAlteracao).toLocaleString()}</p>
                          <p className="text-sm text-slate-700">
                            Moveu a obra de <span className="font-semibold text-slate-900">{h.statusAnterior}</span> para <span className="font-semibold text-blue-600">{h.statusNovo}</span>
                          </p>
                          {h.observacao && <p className="text-sm text-slate-600 mt-2 italic">"{h.observacao}"</p>}
                        </div>
                      </div>
                    ))}

                    {comentarios?.map((c) => (
                      <div key={`c-${c.id}`} className="flex gap-4">
                        <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center shrink-0 border border-emerald-200">
                          <User className="w-4 h-4 text-emerald-600" />
                        </div>
                        <div className="flex-1 bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
                          <p className="text-xs text-slate-500 mb-1 font-medium">{c.usuario.nome} • {new Date(c.dataRegistro).toLocaleString()}</p>
                          <p className="text-sm text-slate-800">{c.descricao}</p>
                        </div>
                      </div>
                    ))}

                    {(!historico?.length && !comentarios?.length) && (
                      <div className="text-center py-8 text-slate-400 text-sm">Nenhum registro encontrado.</div>
                    )}
                  </>
                )}
              </div>

              {/* Form de Comentário */}
              <div className="p-4 border-t border-slate-100 bg-slate-50 shrink-0 rounded-b-xl">
                <form onSubmit={handleComentar} className="flex gap-2">
                  <input
                    type="text"
                    value={novoComentario}
                    onChange={(e) => setNovoComentario(e.target.value)}
                    placeholder="Adicionar um comentário ou observação..."
                    className="flex-1 bg-white border border-slate-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow"
                    disabled={addComentario.isPending}
                  />
                  <button
                    type="submit"
                    disabled={!novoComentario.trim() || addComentario.isPending}
                    className="bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white p-2.5 rounded-lg transition-colors cursor-pointer flex items-center justify-center"
                  >
                    {addComentario.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                  </button>
                </form>
              </div>

            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
