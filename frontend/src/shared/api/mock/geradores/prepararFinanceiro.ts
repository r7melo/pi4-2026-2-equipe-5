import { dataCivilValida, periodoCivilValido } from '@/shared/lib/datasCivis';
import type { ObraFinanceiraEntrada, ApuracaoFinanceiraEntrada, ContextoFinanceiro, DocumentoFinanceiro } from './contratosFinanceiros';

export class FalhaRelatorioFinanceiro extends Error {
  readonly codigo: string;
  readonly status: number;
  constructor(codigo: string, mensagem: string, status = 422) {
    super(mensagem); this.name = 'FalhaRelatorioFinanceiro'; this.codigo = codigo; this.status = status;
  }
}
const MAX_CENTAVOS = 1_000_000_000_000;
export function centavosFinanceiros(valor: number, obra: number, campo: string): number {
  const escalado = valor * 100, inteiro = Math.round(escalado);
  if (!Number.isFinite(valor) || Math.abs(inteiro) > MAX_CENTAVOS ||
      Math.abs(escalado - inteiro) > Number.EPSILON * Math.max(1, Math.abs(escalado)) * 4) {
    throw new FalhaRelatorioFinanceiro('FINANCIAL_PRECISION', `Obra #${obra}: ${campo} precisa ter precisão de centavos e estar no limite de exportação.`);
  }
  return inteiro === 0 ? 0 : inteiro;
}
function somar(a: number, b: number): number {
  const total = a + b;
  if (!Number.isSafeInteger(total) || Math.abs(total) > MAX_CENTAVOS)
    throw new FalhaRelatorioFinanceiro('EXPORT_LIMIT', 'Os valores acumulados excedem o limite de exportação. Reduza o recorte.');
  return total;
}
export function textoFinanceiro(valor: string, obra: number, campo: string): string {
  if (valor.length > 4096 || Array.from(valor).some(c => {
    const n = c.codePointAt(0)!;
    return (n < 32 && n !== 9 && n !== 10 && n !== 13) || n === 0xFFFE || n === 0xFFFF || (n >= 0xD800 && n <= 0xDFFF);
  }))
    throw new FalhaRelatorioFinanceiro('EXPORT_TEXT_LIMIT', `Obra #${obra}: ${campo} contém texto não suportado ou extenso demais para exportação.`);
  return valor;
}
export function prepararFinanceiro(obras: ObraFinanceiraEntrada[], relatorios: Record<number, ApuracaoFinanceiraEntrada>, obraFiltroId?: number | null, contexto: ContextoFinanceiro = {}): DocumentoFinanceiro {
  const informado = contexto.periodoInicio !== undefined || contexto.periodoFim !== undefined;
  if (informado && !periodoCivilValido(contexto.periodoInicio, contexto.periodoFim))
    throw new FalhaRelatorioFinanceiro('INVALID_PERIOD', 'Informe início e fim válidos, com o início anterior ou igual ao fim.', 400);
  if (obraFiltroId != null && (!Number.isSafeInteger(obraFiltroId) || obraFiltroId <= 0))
    throw new FalhaRelatorioFinanceiro('INVALID_PARAMETER', 'Informe uma obra válida.', 400);
  const selecionadas = obras.filter(o => (obraFiltroId == null || o.id === obraFiltroId) &&
    (!informado || ((o.dataFimReal || o.dataFimEstimada) >= contexto.periodoInicio! && (o.dataFimReal || o.dataFimEstimada) <= contexto.periodoFim!)) &&
    (!contexto.clienteFiltro || contexto.clienteFiltro === 'todos' || o.clienteNome === contexto.clienteFiltro));
  if (!selecionadas.length) throw new FalhaRelatorioFinanceiro('NO_WORKS', 'Nenhuma obra encontrada para os filtros selecionados. Ajuste o período ou o cliente e tente novamente.', 404);
  if (selecionadas.length > 1000) throw new FalhaRelatorioFinanceiro('EXPORT_LIMIT', 'Exporte até 1.000 obras por vez. Reduza o recorte.');
  let receita = 0, custo = 0, resultado = 0, apuradas = 0, itens = 0;
  const ids = new Set<number>();
  const alvo = selecionadas.map(o => {
    if (!Number.isSafeInteger(o.id) || o.id <= 0 || o.id > 2147483647 || ids.has(o.id) || !Number.isSafeInteger(o.quantidadePaineis) || o.quantidadePaineis < 0 || o.quantidadePaineis > 2147483647)
      throw new FalhaRelatorioFinanceiro('INVALID_WORK', `Obra #${o.id}: identificação ou quantidade de painéis inválida.`);
    ids.add(o.id);
    const termino = o.dataFimReal || o.dataFimEstimada;
    if (!dataCivilValida(termino)) throw new FalhaRelatorioFinanceiro('INVALID_WORK', `Obra #${o.id}: término inválido.`);
    textoFinanceiro(o.clienteNome, o.id, 'cliente'); textoFinanceiro(o.status, o.id, 'situação');
    if (o.clienteNome.length > 512) throw new FalhaRelatorioFinanceiro('EXPORT_TEXT_LIMIT', `Obra #${o.id}: nome do cliente excede 512 caracteres para exportação.`);
    const rel = o.status === 'Concluido' ? relatorios[o.id] : undefined;
    let relatorio: ApuracaoFinanceiraEntrada | null = null;
    if (rel) {
      if (rel.obraId !== o.id) throw new FalhaRelatorioFinanceiro('FINANCIAL_INCONSISTENCY', `Obra #${o.id}: apuração vinculada a outra obra.`);
      const r = centavosFinanceiros(rel.receita, o.id, 'receita'), c = centavosFinanceiros(rel.custoTotal, o.id, 'custo'), l = centavosFinanceiros(rel.lucro, o.id, 'resultado');
      if (r - c !== l) throw new FalhaRelatorioFinanceiro('FINANCIAL_INCONSISTENCY', `Obra #${o.id}: receita menos custo diverge do resultado salvo.`);
      let soma = 0;
      const detalhes = rel.itens.map(item => {
        if (++itens > 10000) throw new FalhaRelatorioFinanceiro('EXPORT_LIMIT', 'Exporte até 10.000 itens de custo por vez. Reduza o recorte.');
        const v = centavosFinanceiros(item.valor, o.id, 'item de custo'); soma = somar(soma, v);
        return { descricao: textoFinanceiro(item.descricao, o.id, 'descrição do custo'), valor: v / 100 };
      });
      if (detalhes.length && soma !== c) throw new FalhaRelatorioFinanceiro('FINANCIAL_INCONSISTENCY', `Obra #${o.id}: itens de custo divergem do custo total.`);
      receita = somar(receita, r); custo = somar(custo, c); resultado = somar(resultado, l); apuradas++;
      relatorio = { obraId: o.id, receita: r / 100, custoTotal: c / 100, lucro: l / 100, itens: detalhes };
    }
    return { id: o.id, clienteNome: o.clienteNome, status: o.status, quantidadePaineis: o.quantidadePaineis, termino, relatorio };
  });
  const instante = new Date(contexto.emissao ?? Date.now());
  if (!Number.isFinite(instante.getTime())) throw new FalhaRelatorioFinanceiro('INVALID_PARAMETER', 'Instante de emissão inválido.', 400);
  return { inicio: contexto.periodoInicio, fim: contexto.periodoFim, cliente: contexto.clienteFiltro && contexto.clienteFiltro !== 'todos' ? contexto.clienteFiltro : 'Todos os clientes',
    emissao: instante.toLocaleDateString('pt-BR', { timeZone: 'UTC' }) + ' ' + instante.toLocaleTimeString('pt-BR', { timeZone: 'UTC', hour: '2-digit', minute: '2-digit' }) + ' UTC', obras: alvo,
    totais: { apuradas, receita: apuradas ? receita / 100 : null, custo: apuradas ? custo / 100 : null, resultado: apuradas ? resultado / 100 : null } };
}
