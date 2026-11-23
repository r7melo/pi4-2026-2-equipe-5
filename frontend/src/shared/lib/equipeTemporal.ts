import { z } from 'zod';
import type { EquipeTemporal } from '@/shared/types/equipeTemporal';
import type { Programacao } from '@/shared/types/programacoes';
import { dataCivilValida, periodoCivilValido, diasUteisCivis, diaUtilCivil, somarDiasCivisUTC } from './datasCivis';

const id = z.number().int().positive();
const quantidade = z.number().int().nonnegative();
const data = z.string().refine(dataCivilValida);
export const integranteTemporalSchema = z.object({ usuarioId: id, nome: z.string().min(1), dataEntrada: data, dataSaida: data })
  .refine(i => periodoCivilValido(i.dataEntrada, i.dataSaida));
export const equipeTemporalSchema = z.object({
  pessoasPrevistas: id, pessoasAlocadas: quantidade, pessoasFaltantes: quantidade,
  pessoaDia: z.number().finite().nonnegative(), integrantes: z.array(integranteTemporalSchema),
}).refine(e => new Set(e.integrantes.map(i => i.usuarioId)).size === e.integrantes.length);
export const disponibilidadeSchema = z.array(z.object({ usuarioId: id, nome: z.string().min(1), ocupado: z.boolean(),
  ocupacoes: z.array(z.object({ obraId: id, dataInicio: data, dataFim: data }).refine(o => periodoCivilValido(o.dataInicio, o.dataFim))),
}));
export const ocupacaoSchema = z.object({
  porDia: z.array(z.object({ data, instaladoresAtivos: quantidade, alocados: quantidade, livres: quantidade, faltantes: quantidade })),
  porInstalador: z.array(z.object({ usuarioId: id, nome: z.string().min(1), diasUteis: quantidade, diasAlocados: quantidade, ocupacaoPercentual: z.number().finite().min(0).max(100) })),
});

/** A barra mantém vínculos/previstas; cobertura mínima considera datas, inclusive saída. */
export function resumirEquipe(equipe: EquipeTemporal, inicio: string, fim: string) {
  let minima = Infinity;
  for (let dia = inicio; dia <= fim;) {
    if (diaUtilCivil(dia)) minima = Math.min(minima, equipe.integrantes.filter(i => i.dataEntrada <= dia && i.dataSaida >= dia).length);
    if (dia === fim) break;
    dia = somarDiasCivisUTC(dia, 1);
  }
  if (!Number.isFinite(minima)) minima = 0;
  return {
    vinculadas: equipe.integrantes.length,
    minima,
    faltantes: Math.max(0, equipe.pessoasPrevistas - minima),
    esforcoUtil: equipe.integrantes.reduce((s, i) => s + diasUteisCivis(i.dataEntrada, i.dataSaida), 0),
  };
}

/** Mesmo encadeamento ordenado do backend; equipe sem integrantes não conecta outras obras. */
export function cadeiaTemporal(programacoes: readonly Programacao[], idAlvo: number): Programacao[] {
  const alvo = programacoes.find(p => p.id === idAlvo);
  if (!alvo) return [];
  const pessoas = new Set(alvo.equipe?.integrantes.map(i => i.usuarioId));
  const cadeia = [alvo];
  for (const p of programacoes.filter(item => item.id !== alvo.id && item.dataInicio >= alvo.dataInicio)
    .sort((a,b) => a.dataInicio.localeCompare(b.dataInicio) || a.prioridade-b.prioridade || a.id-b.id)) {
    if (!p.equipe?.integrantes.some(i => pessoas.has(i.usuarioId))) continue;
    cadeia.push(p);
    p.equipe.integrantes.forEach(i => pessoas.add(i.usuarioId));
  }
  return cadeia;
}
export function temVinculosParciais(programacoes: readonly Programacao[], idAlvo: number): boolean {
  return cadeiaTemporal(programacoes, idAlvo).some(p => p.equipe?.integrantes.some(i => i.dataEntrada !== p.dataInicio || i.dataSaida !== p.dataFim));
}
