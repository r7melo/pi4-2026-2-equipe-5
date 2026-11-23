import { obterProgramacoesArmazenadas } from './programacoes';
import { instaladoresEfetivos } from './operacoesGestao';
import { obterObrasArmazenadas, salvarObrasArmazenadas } from './obras';
import { salvarDadosCenario } from '../core/estadoCenario';
import { periodoCivilValido, diasUteisCivis, dataFimDiasUteisCivil, diaUtilCivil, somarDiasCivisUTC } from '@/shared/lib/datasCivis';
import type { Programacao, CriarProgramacaoPayload } from '@/shared/types/programacoes';
import type { EquipeTemporal, AlteracaoEquipeTemporal, OcupacaoGantt } from '@/shared/types/equipeTemporal';

export class FalhaEquipeTemporal extends Error {
  status: number;
  codigo: string;
  constructor(status: number, codigo: string, mensagem: string) { super(mensagem); this.status = status; this.codigo = codigo; }
}
const falhar = (mensagem: string): never => { throw new FalhaEquipeTemporal(400, 'INTEGRANTE_INVALIDO', mensagem); };
function gravar(progs: Programacao[]) { salvarDadosCenario('mock_programacoes_v4', progs); }
export function recalcularEquipe(e: EquipeTemporal): EquipeTemporal {
  return { ...e, pessoasAlocadas: e.integrantes.length, pessoasFaltantes: Math.max(0, e.pessoasPrevistas-e.integrantes.length),
    pessoaDia: e.integrantes.reduce((n,i) => n + diasUteisCivis(i.dataEntrada,i.dataSaida), 0) };
}
export function disponibilidadeTemporal(inicio: string, fim: string) {
  const progs = obterProgramacoesArmazenadas();
  return instaladoresEfetivos().map(i => {
    const ocupacoes = progs.flatMap(p => p.equipe!.integrantes.filter(m => m.usuarioId === i.id && m.dataEntrada <= fim && m.dataSaida >= inicio)
      .map(m => ({ obraId: p.obraId, dataInicio: m.dataEntrada, dataFim: m.dataSaida })));
    return { usuarioId: i.id, nome: i.nome, ocupado: ocupacoes.length > 0, ocupacoes };
  });
}
function garantirLivre(usuarioId: number, inicio: string, fim: string, idIgnorado?: number) {
  for (const p of obterProgramacoesArmazenadas()) {
    if (p.id === idIgnorado) continue;
    if (p.equipe!.integrantes.some(i => i.usuarioId === usuarioId && i.dataEntrada <= fim && i.dataSaida >= inicio)) {
      const nome = instaladoresEfetivos().find(i => i.id === usuarioId)?.nome || 'Instalador';
      throw new FalhaEquipeTemporal(409, 'SCHEDULE_CONFLICT', `${nome} já está na obra ${p.obraId}, de ${p.dataInicio} a ${p.dataFim}.`);
    }
  }
}
export function criarProgramacaoTemporal(payload: CriarProgramacaoPayload) {
  const obras = obterObrasArmazenadas();
  const obra = obras.find(o => o.id === payload.obraId);
  if (!obra) throw new FalhaEquipeTemporal(404, 'OBRA_NOT_FOUND', 'Obra não encontrada.');
  if (!['Separado','EmAndamento','Assistencia'].includes(obra.status)) throw new FalhaEquipeTemporal(400,'VALIDATION_ERROR','A obra precisa estar apta para instalação.');
  if (!obra.quantidadePaineis || !diaUtilCivil(payload.dataInicio) || !Number.isInteger(payload.pessoasPrevistas) || (payload.pessoasPrevistas ?? 0) < 1) falhar('Informe painéis, pessoas previstas e início em dia útil.');
  const fim = dataFimDiasUteisCivil(payload.dataInicio, Math.ceil(obra.quantidadePaineis/9));
  const ids = payload.integrantesIds ?? [];
  if (new Set(ids).size !== ids.length) falhar('Não repita integrantes.');
  const disponiveis = instaladoresEfetivos();
  for (const id of ids) { if (!disponiveis.some(i => i.id === id)) falhar('Selecione instaladores de campo ativos.'); garantirLivre(id,payload.dataInicio,fim); }
  const progs = obterProgramacoesArmazenadas();
  const equipe = recalcularEquipe({ pessoasPrevistas: payload.pessoasPrevistas!, pessoasAlocadas: 0, pessoasFaltantes: 0, pessoaDia: 0,
    integrantes: ids.map(id => ({ usuarioId: id, nome: disponiveis.find(i => i.id === id)!.nome, dataEntrada: payload.dataInicio, dataSaida: fim })) });
  const nova: Programacao = { id: Math.max(600,...progs.map(p=>p.id))+1, obraId:payload.obraId, dataInicio:payload.dataInicio,dataFim:fim,prioridade:payload.prioridade??1,duracaoEstimadaDias:Math.ceil(obra.quantidadePaineis/9),equipe };
  progs.push(nova); gravar(progs);
  if (obra.status === 'Separado') { obra.status='EmAndamento'; salvarObrasArmazenadas(obras); }
  return nova;
}
export function alterarEquipeMock(id: number, alteracao: AlteracaoEquipeTemporal) {
  const progs=obterProgramacoesArmazenadas(), p=progs.find(item=>item.id===id);
  if (!p) throw new FalhaEquipeTemporal(404,'PROGRAMACAO_NOT_FOUND','Programação não encontrada.');
  const e=p.equipe!;
  if (alteracao.tipo==='previstas') {
    if (!Number.isInteger(alteracao.pessoasPrevistas) || alteracao.pessoasPrevistas<1) falhar('Pessoas previstas deve ser um inteiro positivo.');
    e.pessoasPrevistas=alteracao.pessoasPrevistas;
  } else {
    const atual=e.integrantes.find(i=>i.usuarioId===alteracao.usuarioId);
    if (alteracao.tipo==='remover') {
      if (!atual) throw new FalhaEquipeTemporal(404,'INTEGRANTE_NOT_FOUND','Integrante não encontrado.');
      const hoje = new Date().toISOString().slice(0,10);
      if (hoje < atual.dataEntrada) e.integrantes=e.integrantes.filter(i=>i!==atual);
      else {
        if (!alteracao.dataSaida || alteracao.dataSaida<atual.dataEntrada || alteracao.dataSaida>atual.dataSaida) falhar('Informe uma saída dentro da participação para preservar os dias trabalhados.');
        atual.dataSaida=alteracao.dataSaida!;
      }
    } else {
      const instalador=instaladoresEfetivos().find(i=>i.id===alteracao.usuarioId);
      if (!instalador || !periodoCivilValido(alteracao.dataEntrada,alteracao.dataSaida) || alteracao.dataEntrada<p.dataInicio || alteracao.dataSaida>p.dataFim) falhar('Instalador ou datas inválidas para a programação.');
      if (alteracao.tipo==='incluir' && atual) falhar('O instalador já integra esta programação.');
      if (alteracao.tipo==='datas' && !atual) throw new FalhaEquipeTemporal(404,'INTEGRANTE_NOT_FOUND','Integrante não encontrado.');
      garantirLivre(alteracao.usuarioId,alteracao.dataEntrada,alteracao.dataSaida,id);
      if (atual) { atual.dataEntrada=alteracao.dataEntrada; atual.dataSaida=alteracao.dataSaida; }
      else e.integrantes.push({ usuarioId:alteracao.usuarioId,nome:instalador!.nome,dataEntrada:alteracao.dataEntrada,dataSaida:alteracao.dataSaida });
    }
  }
  p.equipe=recalcularEquipe(e); gravar(progs); return p.equipe;
}
export function ocupacaoTemporal(inicio: string, fim: string): OcupacaoGantt {
  const instaladores=instaladoresEfetivos(), progs=obterProgramacoesArmazenadas();
  const porDia: OcupacaoGantt['porDia']=[];
  const dias=new Map(instaladores.map(i=>[i.id,0]));
  for(let dia=inicio;dia<=fim;) {
    if(diaUtilCivil(dia)) {
      const alocados=new Set<number>(); let faltantes=0;
      for(const p of progs.filter(item=>item.dataInicio<=dia&&item.dataFim>=dia)) {
        const membros=p.equipe!.integrantes.filter(i=>dias.has(i.usuarioId)&&i.dataEntrada<=dia&&i.dataSaida>=dia);
        faltantes+=Math.max(0,p.equipe!.pessoasPrevistas-membros.length);
        membros.forEach(i=>{if(dias.has(i.usuarioId)) alocados.add(i.usuarioId);});
      }
      alocados.forEach(id=>dias.set(id,dias.get(id)!+1));
      porDia.push({data:dia,instaladoresAtivos:instaladores.length,alocados:alocados.size,livres:Math.max(0,instaladores.length-alocados.size),faltantes});
    }
    if(dia===fim) break; dia=somarDiasCivisUTC(dia,1);
  }
  return {porDia,porInstalador:instaladores.map(i=>({usuarioId:i.id,nome:i.nome,diasUteis:porDia.length,diasAlocados:dias.get(i.id)!,ocupacaoPercentual:porDia.length?dias.get(i.id)!/porDia.length*100:0}))};
}
