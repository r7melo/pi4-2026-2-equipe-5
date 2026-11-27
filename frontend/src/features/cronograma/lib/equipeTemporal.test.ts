import { describe, it, expect } from 'vitest';
import { validarProgramacoes } from '@/shared/lib/validarProgramacoes';
import { resumirEquipe, diasComFaltaCobertura, cadeiaTemporal, temVinculosParciais } from '@/shared/lib/equipeTemporal';
import { projetarReordenacao } from '@/shared/lib/reordenarProgramacoes';
import { transformarTarefasGantt } from '@/features/cronograma/lib/transformarTarefasGantt';
import type { Programacao } from '@/shared/types/programacoes';

function programacao(id: number, pessoas: number[], inicio = '2026-11-23', fim = '2026-11-25'): Programacao {
  return { id, obraId: id+300, dataInicio: inicio, dataFim: fim, prioridade: 1,
    equipe: { pessoasPrevistas: 2, pessoasAlocadas: pessoas.length, pessoasFaltantes: Math.max(0,2-pessoas.length), pessoaDia: 0,
      integrantes: pessoas.map(usuarioId => ({ usuarioId, nome: `Pessoa ${usuarioId}`, dataEntrada: inicio, dataSaida: fim })) } };
}
describe('Equipes temporais — contrato e cobertura', () => {
  it('aceita contrato privado real sem equipeId e rejeita ausência de equipe', () => {
    const p = programacao(1,[1]);
    expect(validarProgramacoes([p])).toEqual([p]);
    expect(() => validarProgramacoes([{ ...p, equipe: undefined, equipeId: 1 }])).toThrow();
  });
  it('rejeita integrantes duplicados, datas fora da programação e quantidade inválida', () => {
    const p=programacao(1,[1,1]);
    expect(() => validarProgramacoes([p])).toThrow();
    p.equipe!.integrantes=[{usuarioId:1,nome:'Ana',dataEntrada:'2026-11-20',dataSaida:p.dataFim}];
    expect(() => validarProgramacoes([p])).toThrow();
    p.equipe!.integrantes=[]; p.equipe!.pessoasPrevistas=0;
    expect(() => validarProgramacoes([p])).toThrow();
  });
  it('mantém 2/2 com parcial, separa mínimo 1 e soma esforço útil', () => {
    const p=programacao(1,[1,2]); p.equipe!.integrantes[1].dataEntrada='2026-11-24';
    expect(resumirEquipe(p.equipe!,p.dataInicio,p.dataFim)).toEqual({vinculadas:2,minima:1,faltantes:1,esforcoUtil:5});
    const [task]=transformarTarefasGantt({programacoesVisiveis:[p],obras:[],equipes:[]});
    expect(task.equipeRotulo).toBe('2/2'); expect(task.pessoasFaltantes).toBe(1); expect(task.type).toBe('task');
  });
  it('esforço fim de semana é zero e saída é inclusiva', () => {
    const p=programacao(1,[1],'2026-11-23','2026-11-30');
    p.equipe!.integrantes[0].dataEntrada='2026-11-28'; p.equipe!.integrantes[0].dataSaida='2026-11-29';
    expect(resumirEquipe(p.equipe!,p.dataInicio,p.dataFim).esforcoUtil).toBe(0);
    p.equipe!.integrantes[0].dataEntrada='2026-11-23';p.equipe!.integrantes[0].dataSaida='2026-11-23';
    expect(resumirEquipe(p.equipe!,p.dataInicio,p.dataFim).esforcoUtil).toBe(1);
  });
  it('equipe vazia fica incompleta e não cria grupo fixo', () => {
    const p=programacao(1,[]);
    expect(resumirEquipe(p.equipe!,p.dataInicio,p.dataFim)).toEqual({vinculadas:0,minima:0,faltantes:2,esforcoUtil:0});
    expect(transformarTarefasGantt({programacoesVisiveis:[p],obras:[],equipes:undefined})).toHaveLength(1);
  });
  it('lista exatamente os dias úteis descobertos em diasComFaltaCobertura', () => {
    const p = programacao(1, [1, 2], '2026-11-23', '2026-11-27');
    p.equipe!.integrantes[0].dataSaida = '2026-11-24';
    p.equipe!.integrantes[1].dataEntrada = '2026-11-26';
    expect(diasComFaltaCobertura(p.equipe!, p.dataInicio, p.dataFim)).toEqual([
      { data: '2026-11-23', faltantes: 1 },
      { data: '2026-11-24', faltantes: 1 },
      { data: '2026-11-25', faltantes: 2 },
      { data: '2026-11-26', faltantes: 1 },
      { data: '2026-11-27', faltantes: 1 },
    ]);
  });
});
describe('Propagação por pessoas e revisão', () => {
  it('propaga cadeia transitiva A(X) B(X,Y) C(Y), sem D(Z) ou vazias', () => {
    const progs=[programacao(1,[1]),programacao(2,[1,2],'2026-11-26','2026-11-27'),programacao(3,[2],'2026-11-30','2026-12-01'),programacao(4,[3]),programacao(5,[])];
    expect(cadeiaTemporal(progs,1).map(p=>p.id)).toEqual([1,2,3]);
    const r=projetarReordenacao(progs,1,'2026-11-25')!;
    expect(r.afetadas.map(p=>p.id)).toEqual([2,3]); expect(r.principal.dataFim).toBe('2026-11-27');
    expect(r.alteradas[1].equipe!.integrantes[0].dataEntrada).toBe('2026-11-30');
    expect(r.conflito).toBe(false);
    expect(cadeiaTemporal(progs,5).map(p=>p.id)).toEqual([5]);
  });
  it('detecta conflito inclusivo com membro em programação anterior fixa', () => {
    const progs=[programacao(1,[1]),programacao(2,[1],'2026-11-19','2026-11-20')];
    expect(projetarReordenacao(progs,1,'2026-11-20')!.conflito).toBe(true);
    expect(projetarReordenacao(progs,1,'2026-11-23')!.conflito).toBe(false);
  });
  it('identifica parcial da cadeia e projeta datas para revisão sem mutar base', () => {
    const p=programacao(1,[1,2]); p.equipe!.integrantes[1].dataEntrada='2026-11-24';
    expect(temVinculosParciais([p],1)).toBe(true);
    const r=projetarReordenacao([p],1,'2026-11-26')!;
    expect(r.principal.equipe!.integrantes[1].dataEntrada).toBe('2026-11-27');
    expect(r.principal.equipe!.pessoaDia).toBe(5);
    expect(p.equipe!.integrantes[1].dataEntrada).toBe('2026-11-24');
  });
  it('bloqueia sobreposição entre duas movidas quando fins de semana comprimem os vínculos', () => {
    const a=programacao(1,[1],'2027-03-05','2027-03-08');
    const b=programacao(2,[1],'2027-03-05','2027-03-08');
    a.equipe!.integrantes[0].dataSaida='2027-03-06';
    b.equipe!.integrantes[0].dataEntrada='2027-03-07';
    const r=projetarReordenacao([a,b],1,'2027-03-08')!;
    expect(r.alteradas.map(p=>p.equipe!.integrantes.map(i=>[i.dataEntrada,i.dataSaida]))).toEqual([
      [['2027-03-08','2027-03-09']], [['2027-03-09','2027-03-09']],
    ]);
    expect(r.conflito).toBe(true);
  });
});
