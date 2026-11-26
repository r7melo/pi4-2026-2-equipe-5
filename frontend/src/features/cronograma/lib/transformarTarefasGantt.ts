import type { GanttTask } from '@/features/cronograma/types/gantt';
import type { TransformarTarefasGanttParams } from '@/features/cronograma/types/visaoCronograma';
import { dataCivilParaGantt, fimCivilParaGanttExclusivo } from './datasGantt';
import { diasUteisCivis } from '@/shared/lib/datasCivis';
import { resumirEquipe } from '@/shared/lib/equipeTemporal';
import { materialEstaPronto } from './prontidaoObra';

export function transformarTarefasGantt({ programacoesVisiveis, obras, homologacoesMap }: TransformarTarefasGanttParams): GanttTask[] {
  return (programacoesVisiveis ?? []).map(p => {
    const obra = obras?.find(o => Number(o.id) === p.obraId);
    const resumo = p.equipe ? resumirEquipe(p.equipe, p.dataInicio, p.dataFim) : null;
    return {
      id: p.id, type: 'task', text: obra?.clienteNome || `Obra ${p.obraId}`,
      start_date: dataCivilParaGantt(p.dataInicio), end_date: fimCivilParaGanttExclusivo(p.dataFim),
      dataFimInclusiva: p.dataFim, duration: diasUteisCivis(p.dataInicio, p.dataFim),
      nomeEquipe: p.equipe ? `${p.equipe.integrantes.length}/${p.equipe.pessoasPrevistas} pessoas vinculadas` : 'Equipe não informada',
      equipeRotulo: p.equipe ? `${p.equipe.integrantes.length}/${p.equipe.pessoasPrevistas}` : undefined,
      pessoasFaltantes: resumo?.faltantes,
      integrantesNomes: p.equipe?.integrantes.map(i => i.nome) ?? [],
      nomeCliente: obra?.clienteNome, paineis: obra?.quantidadePaineis,
      duracaoDias: diasUteisCivis(p.dataInicio, p.dataFim), statusObra: obra?.status,
      materialPronto: materialEstaPronto(obra?.status), homologacaoOk: homologacoesMap?.[p.obraId]?.parecerAcesso === 'Aprovado',
    };
  });
}
