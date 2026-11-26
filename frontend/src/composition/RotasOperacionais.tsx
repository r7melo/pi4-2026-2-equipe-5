import { MOCK_ATIVO } from '@/shared/lib/modoApi';
import { useComentariosKanban } from '@/features/kanban/hooks/useComentariosKanban';
import type { TipoComentario } from '@/features/kanban/types/comentarios';
import { useMemo, useCallback } from "react";
import KanbanPage from "@/features/kanban/pages/Kanban";
import EquipesPage from "@/features/cronograma/pages/Equipes";
import { AcoesInstalacao } from "./AcoesInstalacao";
import type { RenderizarAcoesObra } from "@/shared/types/acoesObra";
import { useObras, useHomologacoesObras, useExcluirObra } from "@/features/obras/hooks/useObras";
import { useProgramacoes } from "@/features/cronograma/hooks/useProgramacoes";
import {
  useObraDetalhe,
  useHistoricoObra,
  useEditarObra,
} from "@/features/obras/hooks/useObraDetalhe";
import { useAuthStore } from "@/shared/stores/useAuthStore";
import {
  podeAlterarStatusEmEdicaoCadastral,
  podeGerenciarCadastroMaterial,
} from "@/shared/constants/statusLogistico";
import { useMateriais } from "@/features/materiais/hooks/useMateriais";
import { useMateriaisObras } from "@/features/materiais/hooks/useMateriaisObras";
import { PainelMateriaisObra } from "@/features/materiais/components/PainelMateriaisObra";
import { PainelEquipeTemporal } from "@/features/cronograma/components/PainelEquipeTemporal";
import KanbanTaskDrawer from "@/features/kanban/components/KanbanTaskDrawer";
import { obterHojeLocalISO } from "@/features/kanban/components/kanbanUtils";
import type {
  DrawerKanbanSlotProps,
  ObraDetalheKanban,
  HistoricoItemKanban,
  ComentarioItemKanban,
  EditarObraKanbanPayload,
  EquipeAlocadaResumo,
} from "@/features/kanban/types/gavetaKanban";
import type { ObraGanttResumo } from "@/features/cronograma/types/visaoCronograma";
import type { ObraKanbanCard } from "@/features/kanban/types/kanban";

const renderizarAcoesInstalacao: RenderizarAcoesObra = (obraId) => (
  <AcoesInstalacao obraId={obraId} />
);

function KanbanDrawerConcreto({
  card,
  obras,
  isOpen,
  onClose,
  onMoverCard,
  renderizarAcoesObra,
}: DrawerKanbanSlotProps & { obras: ObraKanbanCard[] }) {
  const cardEfetivo = useMemo(() => {
    if (!card) return null;
    return obras.find((o) => Number(o.id) === Number(card.id)) ?? card;
  }, [card, obras]);

  const obraId = cardEfetivo?.id ? Number(cardEfetivo.id) : 0;
  const isAtivo = isOpen && obraId > 0;
  const idConsulta = isAtivo ? obraId : 0;

  const { data: detalhe, isLoading: loadingDetalhe, isError: erroDetalhe } = useObraDetalhe(idConsulta);
  const { data: historico, isLoading: loadingHistorico } = useHistoricoObra(idConsulta);
  const { consulta: consultaComentarios, mutacao: alterarComentario } = useComentariosKanban(idConsulta);
  const { data: comentarios, isLoading: loadingComentarios } = consultaComentarios;
  const { data: programacoes } = useProgramacoes();

  const perfil = useAuthStore((s) => s.usuario?.perfil?.nomePerfil);
  const podeGerenciarMateriais = podeGerenciarCadastroMaterial(perfil);
  const podeAlterarStatusDrawer = podeAlterarStatusEmEdicaoCadastral(perfil);
  const { data: materiaisDrawer } = useMateriais(idConsulta);

  const editarObraMutacao = useEditarObra();
  const excluirObraMutacao = useExcluirObra();

  const alocacao = useMemo(() => {
    if (!obraId || !programacoes) return null;
    return programacoes.find((p) => Number(p.obraId) === obraId) || null;
  }, [obraId, programacoes]);

  const equipeAlocada: EquipeAlocadaResumo | null = useMemo(() => {
    if (!alocacao?.equipe) return null;
    const integrantes = alocacao.equipe.integrantes;
    const pessoasPrevistas = alocacao.equipe.pessoasPrevistas;
    const pessoasAlocadas = alocacao.equipe.pessoasAlocadas ?? integrantes.length;
    const pessoasFaltantes =
      alocacao.equipe.pessoasFaltantes ?? Math.max(0, pessoasPrevistas - pessoasAlocadas);
    return {
      id: alocacao.id,
      nome: `${pessoasAlocadas}/${pessoasPrevistas} pessoas vinculadas`,
      pessoasPrevistas,
      pessoasAlocadas,
      pessoasFaltantes,
      dataInicio: alocacao.dataInicio,
      dataFim: alocacao.dataFim,
      integrantes,
    };
  }, [alocacao]);

  const temAlocacaoAtiva = useMemo(() => {
    if (!obraId || !programacoes) return false;
    const hojeStr = obterHojeLocalISO();
    return programacoes.some((p) => {
      if (Number(p.obraId) !== obraId) return false;
      const fimStr = p.dataFim ? String(p.dataFim).split("T")[0] : "";
      return fimStr >= hojeStr;
    });
  }, [obraId, programacoes]);

  const detalheMapeado: ObraDetalheKanban | undefined = useMemo(() => {
    if (!detalhe) return undefined;
    return {
      id: detalhe.id,
      status: detalhe.status,
      clienteNome: detalhe.cliente?.nome ?? cardEfetivo?.clienteNome,
      dataInicioEstimada: detalhe.dataInicioEstimada,
      dataFimEstimada: detalhe.dataFimEstimada ?? cardEfetivo?.dataFimEstimada ?? "",
      dataInicioReal: detalhe.dataInicioReal,
      dataFimReal: detalhe.dataFimReal,
      endereco: detalhe.endereco ?? cardEfetivo?.endereco,
      quantidadePaineis: detalhe.quantidadePaineis ?? cardEfetivo?.quantidadePaineis,
      quantidadeInversores: detalhe.quantidadeInversores,
      valorTotal: detalhe.valorObra,
      categoria: detalhe.categoria ?? cardEfetivo?.categoria,
      observacoes: detalhe.descricao ?? cardEfetivo?.observacoes ?? "",
      descricao: detalhe.descricao,
    };
  }, [detalhe, cardEfetivo]);

  const historicoMapeado: HistoricoItemKanban[] = useMemo(() => {
    if (!historico) return [];
    return historico.map((h) => ({
      id: h.id,
      dataAlteracao: h.dataAlteracao,
      usuarioNome: h.usuario?.nome || "Sistema",
      tipoAcao: h.tipoAcao,
      statusAnterior: h.statusAnterior,
      statusNovo: h.statusNovo,
      observacao: h.observacao,
    }));
  }, [historico]);

  const comentariosMapeados: ComentarioItemKanban[] = useMemo(() => {
    if (!comentarios) return [];
    return comentarios.map((c) => ({
      id: c.id,
      dataHora: c.dataRegistro,
      usuarioNome: c.usuario?.nome || "Colaborador",
      texto: c.descricao,
      tipo: c.tipo,
    }));
  }, [comentarios]);

  const handleSalvarObra = useCallback(
    async (id: number, payload: EditarObraKanbanPayload) => {
      await editarObraMutacao.mutateAsync({
        id,
        payload: {
          endereco: payload.endereco,
          quantidadePaineis: payload.quantidadePaineis,
          quantidadeInversores: payload.quantidadeInversores,
          dataFimEstimada: payload.dataFimEstimada,
          descricao: payload.descricao,
        },
      });
    },
    [editarObraMutacao]
  );

  const handleAdicionarComentario = useCallback(
    async (_id: number, texto: string, tipo: TipoComentario = "Cartao") => {
      await alterarComentario.mutateAsync({ acao: "criar", descricao: texto, tipo });
    },
    [alterarComentario]
  );

  const handleExcluirObra = useCallback(
    async (id: number) => {
      await excluirObraMutacao.mutateAsync(id);
    },
    [excluirObraMutacao]
  );

  const renderAbaMateriais = useCallback(
    (idObra: number) => (
      <PainelMateriaisObra
        key={idObra}
        obraId={idObra}
        somenteLeitura={!podeGerenciarMateriais}
        podeAlterarStatus={podeAlterarStatusDrawer}
      />
    ),
    [podeGerenciarMateriais, podeAlterarStatusDrawer]
  );

  const renderSecaoEquipe = useCallback(
    (canEdit: boolean) => (
      <PainelEquipeTemporal
        key={alocacao ? `${alocacao.id}-${alocacao.dataInicio}-${alocacao.dataFim}` : "sem-prog"}
        programacao={alocacao}
        canEdit={canEdit}
        variante="kanban"
      />
    ),
    [alocacao]
  );

  const focoRetorno = useCallback(() => {
    if (obraId > 0) {
      const cardEl = document.querySelector<HTMLElement>(`[data-card-id="${obraId}"]`);
      if (cardEl && cardEl.isConnected) return cardEl;
    }
    return document.querySelector<HTMLElement>("[data-kanban-board]") || null;
  }, [obraId]);

  return (
    <KanbanTaskDrawer
      card={cardEfetivo}
      isOpen={isOpen}
      onClose={onClose}
      onMoverCard={onMoverCard}
      renderizarAcoesObra={renderizarAcoesObra}
      detalheObra={detalheMapeado}
      carregandoDetalhe={loadingDetalhe}
      erroDetalhe={erroDetalhe}
      equipeAlocada={equipeAlocada}
      temAlocacaoAtiva={temAlocacaoAtiva}
      historico={historicoMapeado}
      carregandoHistorico={loadingHistorico}
      comentarios={comentariosMapeados}
      carregandoComentarios={loadingComentarios}
      onSalvarObra={handleSalvarObra}
      isSalvandoObra={editarObraMutacao.isPending}
      onExcluirObra={handleExcluirObra}
      isExcluindoObra={excluirObraMutacao.isPending}
      onAdicionarComentario={handleAdicionarComentario}
      isEnviandoComentario={alterarComentario.isPending}
      onEditarComentario={async (id, texto) => { await alterarComentario.mutateAsync({ acao: "editar", id, descricao: texto }); }}
      onExcluirComentario={async id => { await alterarComentario.mutateAsync({ acao: "excluir", id }); }}
      erroComentarios={consultaComentarios.error}
      onRecarregarComentarios={() => { void consultaComentarios.refetch(); }}
      focoRetorno={focoRetorno}
      totalMateriais={materiaisDrawer?.length ?? 0}
      renderAbaMateriais={renderAbaMateriais}
      renderSecaoEquipe={renderSecaoEquipe}
    />
  );
}

export function Kanban() {
  const { data: obrasData, isLoading: loadingObras, isError: erroObras, refetch: refetchObras } = useObras();
  const { data: programacoes } = useProgramacoes();
  const excluirObraMutacao = useExcluirObra();

  const obras: ObraKanbanCard[] = useMemo(() => {
    if (!obrasData?.itens) return [];
    return obrasData.itens.map((o) => ({
      id: o.id,
      clienteNome: o.clienteNome,
      categoria: o.categoria,
      status: o.status,
      dataFimEstimada: o.dataFimEstimada,
      dataFimReal: o.dataFimReal,
      nome: o.nome,
      cidade: o.cidade,
      uf: o.uf,
      progressoGeral: o.progressoGeral,
      valorTotal: o.valorTotal,
      quantidadePaineis: o.quantidadePaineis,
      endereco: o.endereco,
      observacoes: o.observacoes,
      atualizadoPor: o.atualizadoPor,
      prazoContratualDias: o.prazoContratualDias,
    }));
  }, [obrasData]);

  const obraIds = useMemo(() => obras.map((o) => Number(o.id)), [obras]);
  const { mapaMateriais, isError: erroMateriais, refetchErros } = useMateriaisObras(obraIds);
  const handleRecarregarMateriais = useCallback(() => {
    void refetchErros();
  }, [refetchErros]);

  const alocacoesAtivasSet = useMemo(() => {
    if (!programacoes) return new Set<number>();
    const hojeStr = obterHojeLocalISO();
    const set = new Set<number>();
    for (const p of programacoes) {
      if (!p.obraId) continue;
      const fimStr = p.dataFim ? String(p.dataFim).split("T")[0] : "";
      if (fimStr >= hojeStr) {
        set.add(Number(p.obraId));
      }
    }
    return set;
  }, [programacoes]);

  const handleExcluirObra = useCallback(
    async (obraId: number) => {
      await excluirObraMutacao.mutateAsync(obraId);
    },
    [excluirObraMutacao]
  );

  const renderDrawer = useCallback(
    (props: DrawerKanbanSlotProps) => <KanbanDrawerConcreto {...props} obras={obras} />,
    [obras]
  );

  return (
    <KanbanPage
      obras={obras}
      carregandoObras={loadingObras}
      erroObras={erroObras}
      onRecarregarObras={() => void refetchObras()}
      mapaMateriais={mapaMateriais}
      erroMateriais={erroMateriais}
      onRecarregarMateriais={handleRecarregarMateriais}
      alocacoesAtivasSet={alocacoesAtivasSet}
      onExcluirObra={handleExcluirObra}
      renderDrawer={renderDrawer}
      renderizarAcoesObra={renderizarAcoesInstalacao}
    />
  );
}

export function Equipes() {
  const { data: programacoes } = useProgramacoes();
  const { data: obrasData, isLoading: loadingObras } = useObras({ pageSize: 1000 });

  const obraIdsUnicos = useMemo(() => {
    if (!programacoes) return [];
    return Array.from(new Set(programacoes.map((p) => p.obraId)));
  }, [programacoes]);

  const { data: homologacoesMap } = useHomologacoesObras(MOCK_ATIVO ? obraIdsUnicos : []);

  const obras: ObraGanttResumo[] | undefined = useMemo(() => {
    if (!obrasData?.itens) return undefined;
    return obrasData.itens.map((o) => ({
      id: o.id,
      clienteNome: o.clienteNome,
      categoria: o.categoria,
      status: o.status,
      atualizadoPor: o.atualizadoPor,
      quantidadePaineis: o.quantidadePaineis,
      dataFimEstimada: o.dataFimEstimada,
    }));
  }, [obrasData]);

  return (
    <EquipesPage
      renderizarAcoesObra={renderizarAcoesInstalacao}
      obras={obras}
      carregandoObras={loadingObras}
      mapaHomologacoes={homologacoesMap}
    />
  );
}
