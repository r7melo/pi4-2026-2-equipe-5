import type { GanttTask } from "@/features/cronograma/types/gantt";
import type { Programacao } from "@/features/cronograma/types/programacoes";
import type { TransformarTarefasGanttParams } from "@/features/cronograma/types/visaoCronograma";
import {
  dataCivilParaGantt,
  fimCivilParaGanttExclusivo,
} from "@/features/cronograma/lib/datasGantt";
import { diasUteisCivis } from "@/shared/lib/datasCivis";
import { materialEstaPronto } from "@/features/cronograma/lib/prontidaoObra";

/**
 * Transforma programações, equipes e dados estruturais de obras em nós hierárquicos
 * compatíveis com o DHTMLX Gantt (nós de projeto para equipes e tarefas para obras).
 */
export function transformarTarefasGantt({
  programacoesVisiveis,
  equipes,
  obras,
  homologacoesMap,
}: TransformarTarefasGanttParams): GanttTask[] {
  if (!equipes || !programacoesVisiveis) return [];

  const resultado: GanttTask[] = [];

  // Agrupa programações por equipe
  const mapaEquipes = new Map<number, Programacao[]>();
  for (const p of programacoesVisiveis) {
    const lista = mapaEquipes.get(p.equipeId) || [];
    lista.push(p);
    mapaEquipes.set(p.equipeId, lista);
  }

  // Para cada equipe que possui obras correspondentes aos filtros (supressão de vazias)
  for (const equipe of equipes) {
    const progsEquipe = mapaEquipes.get(equipe.id);
    if (!progsEquipe || progsEquipe.length === 0) continue;

    progsEquipe.sort((a, b) => a.dataInicio.localeCompare(b.dataInicio));

    // Cálculo exato do span de datas da equipe (menor início e maior fim)
    const menorInicio = progsEquipe.reduce(
      (min, p) => (p.dataInicio < min ? p.dataInicio : min),
      progsEquipe[0].dataInicio
    );
    const maiorFim = progsEquipe.reduce(
      (max, p) => (p.dataFim > max ? p.dataFim : max),
      progsEquipe[0].dataFim
    );

    // 1. Nó Pai de Equipe (Projeto)
    resultado.push({
      id: `equipe-${equipe.id}`,
      text: `${equipe.nome} — ${equipe.especialidade || "Instalação"}`,
      start_date: dataCivilParaGantt(menorInicio),
      end_date: fimCivilParaGanttExclusivo(maiorFim),
      dataFimInclusiva: maiorFim,
      type: "project",
      open: true,
      equipeId: equipe.id,
      nomeEquipe: equipe.nome,
    });

    // 2. Nós Filhos (Obras)
    for (const p of progsEquipe) {
      const obra = obras?.find((o) => Number(o.id) === Number(p.obraId));
      const materialPronto = materialEstaPronto(obra?.status);

      const homologacao = homologacoesMap?.[p.obraId];
      const homologacaoOk = homologacao?.parecerAcesso === "Aprovado";
      const duracaoCalculada = diasUteisCivis(p.dataInicio, p.dataFim);

      resultado.push({
        id: p.id,
        parent: `equipe-${equipe.id}`,
        type: "task",
        text: obra?.clienteNome || `Obra ${p.obraId}`,
        start_date: dataCivilParaGantt(p.dataInicio),
        end_date: fimCivilParaGanttExclusivo(p.dataFim),
        dataFimInclusiva: p.dataFim,
        duration: duracaoCalculada,
        equipeId: p.equipeId,
        nomeEquipe: equipe.nome,
        nomeCliente: obra?.clienteNome,
        paineis: obra?.quantidadePaineis,
        duracaoDias: duracaoCalculada,
        statusObra: obra?.status,
        materialPronto,
        homologacaoOk,
        ...(p.duracaoEstimadaDias !== undefined ? { duracaoEstimadaDias: p.duracaoEstimadaDias } : {}),
        ...(p.prioridade !== undefined ? { priority: p.prioridade, prioridade: p.prioridade } : {}),
      });
    }
  }

  return resultado;
}
