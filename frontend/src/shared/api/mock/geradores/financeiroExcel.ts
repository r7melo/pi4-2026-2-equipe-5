import { CORES_EXPORTACAO, FONTES_EXPORTACAO } from '@/shared/lib/exportacao/identidade';
import { corArgb, codificarTextoXlsx, empacotarXlsx } from '@/shared/lib/exportacao/xlsx';
import type { ObraFinanceiraEntrada, ApuracaoFinanceiraEntrada, ContextoFinanceiro } from './contratosFinanceiros';
import { prepararFinanceiro, FalhaRelatorioFinanceiro } from './prepararFinanceiro';
const date = (v: string): string => v.split('-').reverse().join('/');
const dataExcel = (v: string): number => {
  if (v < '1900-01-01') throw new FalhaRelatorioFinanceiro('EXPORT_DATE_LIMIT', 'O Excel exige término a partir de 01/01/1900 para exportar datas tipadas.');
  const serial = (Date.parse(v + 'T00:00:00Z') - Date.UTC(1899, 11, 30)) / 86400000;
  return v < '1900-03-01' ? serial - 1 : serial;
};
const statuses: Record<string, string> = { Concluido: 'Concluída', EmAndamento: 'Em andamento', NoDeposito: 'No depósito', Recebido: 'Recebida', Agendado: 'Agendada', Assistencia: 'Assistência' };
const xml = codificarTextoXlsx;
export function gerarExcelRelatorio(obras: ObraFinanceiraEntrada[], relatorios: Record<number, ApuracaoFinanceiraEntrada>, obraFiltroId?: number | null, contexto: ContextoFinanceiro = {}): Blob {
  const d = prepararFinanceiro(obras, relatorios, obraFiltroId, contexto);
  const medidor = typeof document === 'undefined' ? null : document.createElement('canvas').getContext('2d');
  if (!medidor) throw new FalhaRelatorioFinanceiro('EXPORT_GENERATION_FAILED', 'Não foi possível medir os textos da planilha neste navegador.', 500);
  medidor.font = `11pt ${FONTES_EXPORTACAO.planilha}, ${FONTES_EXPORTACAO.alternativasPlanilha}`; medidor.fontKerning = 'none';
  const digito = Math.floor(Math.max(...Array.from('0123456789', c => medidor.measureText(c).width)));
  if (!Number.isFinite(digito) || digito <= 0) throw new FalhaRelatorioFinanceiro('EXPORT_GENERATION_FAILED', 'Não foi possível medir a fonte da planilha.', 500);
  const medidas = new Map<string, number>();
  const moeda = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
  function largura(texto: string, fonte: string): number {
    const chave = fonte + ':' + texto;
    let valor = medidas.get(chave);
    if (valor === undefined) {
      medidor!.font = fonte;
      valor = medidor!.measureText(texto.replace(/\t/g, '    ')).width * 1.08;
      if (medidas.size > 50000) medidas.clear(); medidas.set(chave, valor);
    }
    return valor;
  }
  function alturaCelula(valor: string | number, estilo: number, coluna: number): number {
    const fonte = estilo === 7 ? `bold 14pt ${FONTES_EXPORTACAO.planilha}, ${FONTES_EXPORTACAO.alternativasPlanilha}` : [1, 2, 5].includes(estilo) ? `bold 11pt ${FONTES_EXPORTACAO.planilha}, ${FONTES_EXPORTACAO.alternativasPlanilha}` : `11pt ${FONTES_EXPORTACAO.planilha}, ${FONTES_EXPORTACAO.alternativasPlanilha}`;
    const texto = typeof valor === 'number' && [3, 6].includes(estilo) ? moeda.format(valor) : typeof valor === 'number' && [10, 11].includes(estilo) ? '31/12/9999' : String(valor);
    // Unidade de coluna usa o dígito da fonte Normal; margem extra e largura
    // medida conservadora absorvem diferenças de rasterização entre leitores.
    const maximo = Math.max(1, coluna * digito - 9); let linhas = 0;
    for (const paragrafo of texto.split(/\r\n|\r|\n/)) {
      let usada = 0; linhas++;
      for (const token of paragrafo.match(/\s+|\S+/gu) ?? []) {
        const tamanho = largura(token, fonte);
        if (tamanho <= maximo) {
          if (usada && usada + tamanho > maximo) { linhas++; usada = 0; }
          usada += tamanho;
        } else {
          for (const caractere of token) {
            const passo = largura(caractere, fonte);
            if (usada && usada + passo > maximo) { linhas++; usada = 0; }
            usada += passo;
          }
        }
      }
    }
    return linhas * 18 + 10;
  }
  const resumo = d.totais, c = (v: string | number, style = 0) => ({ v, style });
  const info = [
    [c('Relatório financeiro — ZL Engenharia', 7)],
    [c('Período', 2), c(d.inicio && d.fim ? date(d.inicio) + ' a ' + date(d.fim) : 'Sem restrição de período')], [c('Cliente', 2), c(d.cliente)],
    [c('Emissão', 2), c(d.emissao)], [c('Critério do período', 2), c('Término real da obra ou, na ausência, estimado; datas inclusivas.')],
    [c('Obras no recorte', 2), c(d.obras.length, 8)], [c('Obras com apuração', 2), c(resumo.apuradas, 8)],
    [c('Receita apurada', 2), c(resumo.receita ?? 'Não informado', resumo.receita == null ? 0 : 3)],
    [c('Custo apurado', 2), c(resumo.custo ?? 'Não informado', resumo.custo == null ? 0 : 3)],
    [c('Resultado apurado', 2), c(resumo.resultado ?? 'Não informado', resumo.resultado == null ? 0 : 3)],
    [c('Cobertura dos totais', 2), c('Somente obras com apuração. Ausência de apuração não representa zero.')],
    [c('Dados fictícios', 2), c('Cenário de demonstração. Somente valores de apurações disponíveis.')],
    [c('Obra', 2), c(obraFiltroId ? `#${obraFiltroId}` : 'Todas as obras do recorte')],
  ];
  const rowWorks = [['Obra', 'Cliente', 'Situação', 'Painéis', 'Término', 'Apuração', 'Receita', 'Custo', 'Resultado'].map(v => c(v, 1)), ...d.obras.map((o, i) => [o.id, o.clienteNome, (statuses[o.status] ?? o.status), o.quantidadePaineis, dataExcel(o.termino), o.relatorio ? (o.relatorio.itens.length ? 'Apurada' : 'Apurada \u2014 sem detalhamento de custos') : 'Sem dados financeiros', o.relatorio?.receita ?? 'Não informado', o.relatorio?.custoTotal ?? 'Não informado', o.relatorio?.lucro ?? 'Não informado'].map((v, j) => c(v, j === 4 ? (i % 2 ? 11 : 10) : typeof v === 'number' && j < 6 ? (i % 2 ? 9 : 8) : typeof v === 'number' && j >= 6 ? (i % 2 ? 6 : 3) : i % 2 ? 4 : 0)))];
  const costs = [['Obra', 'Cliente', 'Item', 'Descrição do custo', 'Valor'].map(v => c(v, 1))];
  for (const o of d.obras) o.relatorio?.itens.forEach((item, i) => costs.push([c(o.id), c(o.clienteNome), c(i + 1), c(item.descricao), c(item.valor, 3)]));
  const definitions = [
    { nome: 'Resumo', widths: [30, 95], rows: info, merge: 'A1:B1' },
    { nome: 'Obras', widths: [12, 48, 20, 12, 18, 26, 20, 20, 20], rows: rowWorks, filter: `A1:I${rowWorks.length}` },
    { nome: 'Custos', widths: [12, 42, 10, 95, 20], rows: costs.length > 1 ? costs : [...costs, [c('Nenhum item de custo informado.')]], filter: `A1:E${costs.length}` },
  ];
  const styles = `<?xml version="1.0" encoding="UTF-8"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><numFmts count="2"><numFmt numFmtId="164" formatCode="${xml('"R$" #,##0.00;"-R$" #,##0.00')}"/><numFmt numFmtId="165" formatCode="dd/mm/yyyy"/></numFmts><fonts count="4"><font><sz val="11"/><name val="${FONTES_EXPORTACAO.planilha}"/><color rgb="${corArgb(CORES_EXPORTACAO.texto)}"/></font><font><sz val="11"/><b/><name val="${FONTES_EXPORTACAO.planilha}"/><color rgb="${corArgb(CORES_EXPORTACAO.branco)}"/></font><font><sz val="11"/><b/><name val="${FONTES_EXPORTACAO.planilha}"/><color rgb="${corArgb(CORES_EXPORTACAO.texto)}"/></font><font><sz val="14"/><b/><name val="${FONTES_EXPORTACAO.planilha}"/><color rgb="${corArgb(CORES_EXPORTACAO.branco)}"/></font></fonts><fills count="5"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="${corArgb(CORES_EXPORTACAO.institucional)}"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="${corArgb(CORES_EXPORTACAO.cabecalho)}"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="${corArgb(CORES_EXPORTACAO.superficie)}"/></patternFill></fill></fills><borders count="2"><border/><border><left style="thin"><color rgb="${corArgb(CORES_EXPORTACAO.borda)}"/></left><right style="thin"><color rgb="${corArgb(CORES_EXPORTACAO.borda)}"/></right><top style="thin"><color rgb="${corArgb(CORES_EXPORTACAO.borda)}"/></top><bottom style="thin"><color rgb="${corArgb(CORES_EXPORTACAO.borda)}"/></bottom></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="12">${[[0,0,0],[1,2,0],[2,3,0],[0,0,164],[0,4,0],[2,0,0],[0,4,164],[3,2,0],[0,0,1],[0,4,1],[0,0,165],[0,4,165]].map(([font,fill,num]) => `<xf fontId="${font}" fillId="${fill}" borderId="1" numFmtId="${num}" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyNumberFormat="1" applyAlignment="1"><alignment horizontal="${num === 165 ? 'center' : num ? 'right' : 'left'}" vertical="top" wrapText="1"/></xf>`).join('')}</cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`;
  const files: Record<string, string> = {
    '[Content_Types].xml': `<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>${definitions.map((_, i) => `<Override PartName="/xl/worksheets/sheet${i+1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('')}</Types>`,
    '_rels/.rels': '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>',
    'xl/workbook.xml': `<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><bookViews><workbookView activeTab="0"/></bookViews><sheets>${definitions.map((s, i) => `<sheet name="${s.nome}" sheetId="${i+1}" r:id="rId${i+1}"/>`).join('')}</sheets></workbook>`,
    'xl/_rels/workbook.xml.rels': `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${definitions.map((_, i) => `<Relationship Id="rId${i+1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i+1}.xml"/>`).join('')}<Relationship Id="style" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`,
    'xl/styles.xml': styles,
  };
  definitions.forEach((s, i) => {
    const rows = s.rows.map((row, r) => {
      const height = Math.max(r === 0 ? 36 : 28, ...row.map((cell, j) => {
        const width = s.merge && r === 0 ? s.widths.reduce((a,b) => a+b, 0) : s.widths[j];
        return alturaCelula(cell.v, cell.style, width);
      }));
      if (height > 396) throw new FalhaRelatorioFinanceiro('EXPORT_TEXT_LIMIT', `Texto extenso demais na aba ${s.nome}, linha ${r+1}. Reduza o texto para exportar sem cortes.`);
      return `<row r="${r+1}" ht="${height}" customHeight="1">${row.map((cell, j) => `<c r="${String.fromCharCode(65+j)}${r+1}" s="${cell.style}"${typeof cell.v === 'number' ? `><v>${cell.v}</v>` : ` t="inlineStr"><is><t xml:space="preserve">${xml(cell.v)}</t></is>`}</c>`).join('')}</row>`;
    }).join('');
    files[`xl/worksheets/sheet${i+1}.xml`] = `<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetViews><sheetView workbookViewId="0">${i ? '<pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/>' : ''}</sheetView></sheetViews><cols>${s.widths.map((w, j) => `<col min="${j+1}" max="${j+1}" width="${w}" customWidth="1"/>`).join('')}</cols><sheetData>${rows}</sheetData>${s.filter ? `<autoFilter ref="${s.filter}"/>` : ''}${s.merge ? `<mergeCells count="1"><mergeCell ref="${s.merge}"/></mergeCells>` : ''}</worksheet>`;
  });
  return empacotarXlsx(files);
}
